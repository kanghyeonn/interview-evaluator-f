// // WebcamStreamer.tsx
// import React, { useEffect, useRef } from 'react';

// interface Props {
//     isRecording: boolean;
//     onTranscriptUpdate?: (text: string) => void;
//     onExpressionUpdate?: (emotion: string) => void;
//     onFeedbackUpdate?: (feedback: any) => void;
// }

// const WebcamStreamer: React.FC<Props> = ({ isRecording, onTranscriptUpdate, onExpressionUpdate, onFeedbackUpdate }) => {
//     const videoRef = useRef<HTMLVideoElement>(null);
//     const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//     const streamRef = useRef<MediaStream | null>(null);
//     const chunksRef = useRef<Blob[]>([]);
//     const transcriptSocketRef = useRef<WebSocket | null>(null);
//     const expressionSocketRef = useRef<WebSocket | null>(null);

//     useEffect(() => {
//         const initStream = async () => {
//             const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//             streamRef.current = stream;

//             if (videoRef.current) {
//                 videoRef.current.srcObject = stream;
//                 videoRef.current.onloadedmetadata = () => {
//                     videoRef.current?.play().catch((err) => {
//                         console.error("🎥 재생 오류:", err);
//                     });
//                 };
//             }
//         };

//         initStream();

//         return () => {
//             streamRef.current?.getTracks().forEach(track => track.stop());
//         };
//     }, []);

//     useEffect(() => {
//         if (isRecording && streamRef.current) {
//             chunksRef.current = [];

//             transcriptSocketRef.current = new WebSocket('ws://localhost:8000/ws/transcript');
//             expressionSocketRef.current = new WebSocket('ws://localhost:8000/ws/expression');

//             const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
//                 ? 'video/webm;codecs=vp8,opus'
//                 : '';

//             const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : {});
//             mediaRecorderRef.current = recorder;

//             recorder.ondataavailable = (event) => {
//                 if (event.data.size > 0) {
//                     chunksRef.current.push(event.data);
//                 }
//             };

//             recorder.onstop = async () => {
//                 const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
//                 const arrayBuffer = await blob.arrayBuffer();

//                 // 음성 데이터 전송 (STT)
//                 if (transcriptSocketRef.current?.readyState === WebSocket.OPEN) {
//                     transcriptSocketRef.current.send(arrayBuffer);
//                 }

//                 // 표정 데이터 전송 (영상 동일 전송)
//                 if (expressionSocketRef.current?.readyState === WebSocket.OPEN) {
//                     expressionSocketRef.current.send(arrayBuffer);
//                 }

//                 chunksRef.current = [];
//             };

//             recorder.start();
//         }

//         if (!isRecording && mediaRecorderRef.current) {
//             mediaRecorderRef.current.stop();

//             // STT 결과 수신
//             if (transcriptSocketRef.current) {
//                 transcriptSocketRef.current.onmessage = (event) => {
//                     const data = JSON.parse(event.data);
//                     onTranscriptUpdate?.(data.transcript);
//                     onFeedbackUpdate?.(data.feedback);
//                 };

//                 transcriptSocketRef.current.onclose = () => {
//                     console.log("🛑 Transcript WebSocket 종료");
//                 };
//             }

//             // 표정 결과 수신
//             if (expressionSocketRef.current) {
//                 expressionSocketRef.current.onmessage = (event) => {
//                     const data = JSON.parse(event.data);
//                     onExpressionUpdate?.(data.expression);
//                 };

//                 expressionSocketRef.current.onclose = () => {
//                     console.log("🛑 Expression WebSocket 종료");
//                 };
//             }

//         }

//     }, [isRecording]);

//     return <video ref={videoRef} width={600} muted autoPlay />;
// };

// export default WebcamStreamer;

import React, { useEffect, useRef } from 'react';

interface Props {
    isRecording: boolean;
    onTranscriptUpdate?: (text: string) => void;
    onExpressionUpdate?: (expression: string) => void;
    onFeedbackUpdate?: (feedback: any) => void;
}

const WebcamStreamer: React.FC<Props> = ({
    isRecording,
    onTranscriptUpdate,
    onExpressionUpdate,
    onFeedbackUpdate
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const transcriptSocketRef = useRef<WebSocket | null>(null);
    const expressionSocketRef = useRef<WebSocket | null>(null);
    const expressionIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // 🎥 웹캠 초기화
    useEffect(() => {
        const initStream = async () => {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play().catch((err) => {
                        console.error("🎥 재생 오류:", err);
                    });
                };
            }
        };

        initStream();

        return () => {
            streamRef.current?.getTracks().forEach((track) => track.stop());
        };
    }, []);

    // 🎙️ 녹화 및 WebSocket 관리
    useEffect(() => {
        if (isRecording && streamRef.current) {
            chunksRef.current = [];

            // WebSocket 연결
            transcriptSocketRef.current = new WebSocket('ws://localhost:8000/ws/transcript');
            expressionSocketRef.current = new WebSocket('ws://localhost:8000/ws/expression');

            // ✅ expression 수신 핸들러 등록
            expressionSocketRef.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log("📸 실시간 expression 수신:", data);
                onExpressionUpdate?.(data.expression);
            };
            expressionSocketRef.current.onopen = () => {
                console.log("🟢 Expression WebSocket 연결 성공");
            };

            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
                ? 'video/webm;codecs=vp8,opus'
                : '';

            const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : {});
            mediaRecorderRef.current = recorder;

            // 음성 녹화 데이터 수집
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            // ⏹️ 녹화 종료 시 STT 데이터 전송
            recorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
                const arrayBuffer = await blob.arrayBuffer();

                if (transcriptSocketRef.current?.readyState === WebSocket.OPEN) {
                    transcriptSocketRef.current.send(arrayBuffer);
                }

                chunksRef.current = [];
            };

            recorder.start();

            // 🧍‍♂️ 프레임을 0.5초마다 전송
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = 640;
            canvas.height = 480;

            expressionIntervalRef.current = setInterval(() => {
                if (
                    videoRef.current &&
                    ctx &&
                    expressionSocketRef.current?.readyState === WebSocket.OPEN
                ) {
                    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob((blob) => {
                        if (blob) {
                            blob.arrayBuffer().then((buffer) => {
                                expressionSocketRef.current!.send(buffer);
                            });
                        }
                    }, "image/jpeg");
                }
            }, 500);
        }

        // ⏹️ 녹화 중지
        if (!isRecording && mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();

            if (transcriptSocketRef.current) {
                transcriptSocketRef.current.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    console.log("📝 STT 수신:", data);
                    onTranscriptUpdate?.(data.transcript);
                    onFeedbackUpdate?.(data.feedback);
                };
                transcriptSocketRef.current.onclose = () => {
                    console.log("🛑 Transcript WebSocket 종료");
                };
            }

            if (expressionSocketRef.current) {
                expressionSocketRef.current.onclose = () => {
                    console.log("🛑 Expression WebSocket 종료");
                };
            }

            if (expressionIntervalRef.current) {
                clearInterval(expressionIntervalRef.current);
            }
        }

        return () => {
            if (expressionIntervalRef.current) {
                clearInterval(expressionIntervalRef.current);
            }
        };
    }, [isRecording]);

    return <video ref={videoRef} width={640} height={480} muted autoPlay />;
};

export default WebcamStreamer;
