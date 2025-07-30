import React, { useState } from 'react';
import WebcamStreamer from './components/WebcamStreamer';

const App: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [expression, setExpression] = useState('');
    const [feedback, setFeedback] = useState<any>(null); // ✅ 구조 변경

    const handleStart = () => setIsRecording(true);
    const handleStop = () => setIsRecording(false);

    return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
            <h1>🎙️ AI 면접 연습</h1>

            <div style={{ marginBottom: '1rem' }}>
                <button onClick={handleStart} disabled={isRecording}>
                    🔴 녹화 시작
                </button>
                <button onClick={handleStop} disabled={!isRecording} style={{ marginLeft: '1rem' }}>
                    ⏹️ 녹화 중지
                </button>
            </div>

            <WebcamStreamer
                isRecording={isRecording}
                onTranscriptUpdate={setTranscript}
                onExpressionUpdate={setExpression}
                onFeedbackUpdate={setFeedback} // ✅ 전달
            />

            <div style={{ marginTop: '2rem' }}>
                <h2>🗣️ 음성 텍스트</h2>
                <p>{transcript || '음성을 인식 중...'}</p>

                <h2>😊 표정 분석</h2>
                <p>{expression || '표정 감지 중...'}</p>

                <h2>📝 피드백</h2>
                <p>{feedback?.feedback || '피드백 생성 중...'}</p>

                {feedback && (
                    <>
                        <h3>🔢 점수 세부</h3>
                        <ul>
                            <li>말속도 점수: {feedback.score_detail.speed} / 40</li>
                            <li>간투어 점수: {feedback.score_detail.filler} / 40</li>
                            <li>음조 점수: {feedback.score_detail.pitch} / 20</li>
                        </ul>

                        <h3>🎯 종합 점수</h3>
                        <p>{(feedback.total_score_normalized * 100).toFixed(1)} / 100</p>
                    </>
                )}
            </div>
        </div>
    );
};

export default App;
