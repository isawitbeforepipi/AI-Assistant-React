import { useRef, useState } from "react";
export const useSpeechRecognition = () => {
  //语音识别器的引用对象
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  //识别状态
  const [listening, setListening] = useState(false);

  const startListening = (onResult: (text: string) => void) => {
    //检查浏览器是否支持语音识别
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("当前浏览器不支持语音识别，请使用 Chrome 浏览器");
      return;
    }
    //创建一个语音识别实例，后面就可以通过它来监听语音
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN'; // 设置中文
    recognition.interimResults = false; // 不返回中间结果
    recognition.continuous = false;  // 只识别一次（不是持续监听）
    
    //语音识别成功后触发
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;  // 提取识别文本
      onResult(transcript); // 回传文本
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("语音识别错误", event.error);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };
  
  //手动停止语音识别
  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  return { startListening, stopListening, listening };
};
