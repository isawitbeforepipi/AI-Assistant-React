import { useRef, useState } from 'react';

export function useTextToSpeech() {
  const synthRef = useRef(window.speechSynthesis);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = (text: string, lang = 'zh-CN') => {
    if (!text.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    // 如果正在朗读，先取消
    if (synthRef.current.speaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);  // 更新状态，表示没有朗读
    }

    // 开始朗读
    synthRef.current.speak(utterance);
    setIsSpeaking(true);  // 设置为朗读状态

    // 朗读结束后更新状态
    utterance.onend = () => {
      setIsSpeaking(false);  // 朗读结束，恢复到未朗读状态
    };
  };

  const cancel = () => {
    synthRef.current.cancel();
    setIsSpeaking(false);  // 设置为未朗读状态
  };

  return { speak, cancel, isSpeaking };
}
