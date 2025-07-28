// App.tsx
import React, { useState } from 'react';
import WebcamStreamer from './components/WebcamStreamer';

const App: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false); // 녹화 여부 상태
    const [transcript, setTranscript] = useState('');
    const [expression, setExpression] = useState('');

    const handleStart = () => setIsRecording(true);
    const handleStop = () => setIsRecording(false);

    return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
            <h1>🎙️ AI 면접 연습</h1>

            {/* 녹화 제어 버튼 */}
            <div style={{ marginBottom: '1rem' }}>
                <button onClick={handleStart} disabled={isRecording}>
                    🔴 녹화 시작
                </button>
                <button onClick={handleStop} disabled={!isRecording} style={{ marginLeft: '1rem' }}>
                    ⏹️ 녹화 중지
                </button>
            </div>

            {/* 영상 송출 및 WebSocket */}
            <WebcamStreamer
                isRecording={isRecording}
                onTranscriptUpdate={setTranscript}
                onExpressionUpdate={setExpression}
            />

            <div style={{ marginTop: '2rem' }}>
                <h2>🗣️ 음성 텍스트</h2>
                <p>{transcript || '음성을 인식 중...'}</p>

                <h2>😊 표정 분석</h2>
                <p>{expression || '표정 감지 중...'}</p>
            </div>
        </div>
    );
};

export default App;
