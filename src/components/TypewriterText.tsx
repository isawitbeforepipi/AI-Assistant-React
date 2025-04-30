import React from 'react';
import { useTypewriter } from '../hooks/useTypewriter';

interface Props {
  text: string;
  speed?: number;
}

const TypewriterText: React.FC<Props> = ({ text, speed }) => {
  const displayedText = useTypewriter(text, speed);

  return <span>{displayedText}</span>;
};

export default TypewriterText;
