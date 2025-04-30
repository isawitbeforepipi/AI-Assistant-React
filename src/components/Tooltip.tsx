import { useState } from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-10">
          <div className="bg-black text-white text-xs px-3 py-1 rounded shadow-lg relative whitespace-nowrap">
            {text}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-black" />
          </div>
        </div>
      )}
      {children}
    </div>
  );
};

export default Tooltip;
