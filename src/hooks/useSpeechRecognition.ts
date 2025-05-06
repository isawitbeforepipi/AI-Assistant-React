import { useEffect, useRef, useState } from "react";

export const useSpeechRecognition = () => {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [listening, setListening] = useState(false);

  const startListening = (onResult: (text: string) => void) => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("当前浏览器不支持语音识别，请使用 Chrome 浏览器");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN'; // 设置中文
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    recognition.onerror = (event) => {
      console.error("语音识别错误", event.error);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  return { startListening, stopListening, listening };
};
