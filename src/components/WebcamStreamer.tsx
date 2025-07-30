// WebcamStreamer.tsx
import React, { useEffect, useRef } from 'react';

interface Props {
    isRecording: boolean;
    onTranscriptUpdate?: (text: string) => void;
    onExpressionUpdate?: (emotion: string) => void;
    onFeedbackUpdate?: (feedback: any) => void;
}

const WebcamStreamer: React.FC<Props> = ({ isRecording, onTranscriptUpdate, onExpressionUpdate, onFeedbackUpdate }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const transcriptSocketRef = useRef<WebSocket | null>(null);
    const expressionSocketRef = useRef<WebSocket | null>(null);

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
            streamRef.current?.getTracks().forEach(track => track.stop());
        };
    }, []);

    useEffect(() => {
        if (isRecording && streamRef.current) {
            chunksRef.current = [];

            transcriptSocketRef.current = new WebSocket('ws://localhost:8000/ws/transcript');
            expressionSocketRef.current = new WebSocket('ws://localhost:8000/ws/expression');

            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
                ? 'video/webm;codecs=vp8,opus'
                : '';

            const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : {});
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            recorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
                const arrayBuffer = await blob.arrayBuffer();

                // 음성 데이터 전송 (STT)
                if (transcriptSocketRef.current?.readyState === WebSocket.OPEN) {
                    transcriptSocketRef.current.send(arrayBuffer);
                }

                // 표정 데이터 전송 (영상 동일 전송)
                if (expressionSocketRef.current?.readyState === WebSocket.OPEN) {
                    expressionSocketRef.current.send(arrayBuffer);
                }

                chunksRef.current = [];
            };

            recorder.start();
        }

        if (!isRecording && mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();

            // STT 결과 수신
            if (transcriptSocketRef.current) {
                transcriptSocketRef.current.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    onTranscriptUpdate?.(data.transcript);
                    onFeedbackUpdate?.(data.feedback);
                };

                transcriptSocketRef.current.onclose = () => {
                    console.log("🛑 Transcript WebSocket 종료");
                };
            }

            // 표정 결과 수신
            if (expressionSocketRef.current) {
                expressionSocketRef.current.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    onExpressionUpdate?.(data.expression);
                };

                expressionSocketRef.current.onclose = () => {
                    console.log("🛑 Expression WebSocket 종료");
                };
            }

        }

    }, [isRecording]);

    return <video ref={videoRef} width={600} muted autoPlay />;
};

export default WebcamStreamer;
