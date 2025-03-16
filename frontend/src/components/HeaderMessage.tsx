import React from 'react';
import { useMessage } from '../hooks/useMessage.ts';

// Definiere einen Stil für die Animations-Keyframes global
const animationStyles = `
  @keyframes fadeInOut {
    0% { opacity: 0; transform: translateY(-10px); }
    10% { opacity: 1; transform: translateY(0); }
    90% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; }
  }
`;

// Erstelle das Style-Element einmal beim Laden der Komponente
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = animationStyles;
  document.head.appendChild(styleElement);
}

const HeaderMessage: React.FC = () => {
  const { message } = useMessage();
  
  if (!message) return null;
  
  // CSS-Klasse basierend auf dem Meldungstyp
  const getMessageClassName = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-500 text-white';
      case 'error': return 'bg-red-500 text-white';
      case 'warning': return 'bg-yellow-500 text-white';
      case 'info': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };
  
  return (
    <div 
      className={`message-container px-4 py-2 rounded-md mx-4 flex items-center justify-center min-w-[200px] max-w-[400px] ${getMessageClassName(message.type)}`}
      style={{
        animation: 'fadeInOut 3s forwards',
        position: 'relative',
        animationFillMode: 'forwards'
      }}
    >
      {message.content}
    </div>
  );
};

export default HeaderMessage; 