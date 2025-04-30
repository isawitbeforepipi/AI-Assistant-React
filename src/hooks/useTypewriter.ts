import { useEffect, useState } from 'react';

export function useTypewriter(text: string, speed = 30) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    let index = 0;
    setDisplayed(''); // 每次重置

    const interval = setInterval(() => {
      setDisplayed((prev) => prev + text.charAt(index));
      index++;
      if (index >= text.length) clearInterval(interval);
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return displayed;
}
