import React from 'react';
import useMessage from '../hooks/useMessage.ts';

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
  
  // CSS-Klasse basierend auf dem Meldungstyp - angepasst an das ursprüngliche Design der Anwendung
  const getMessageClassName = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 border border-green-400 text-green-700';
      case 'error': return 'bg-red-100 border border-red-400 text-red-700';
      case 'warning': return 'bg-yellow-100 border border-yellow-400 text-yellow-700';
      case 'info': return 'bg-blue-100 border border-blue-400 text-blue-700';
      default: return 'bg-gray-100 border border-gray-400 text-gray-700';
    }
  };
  
  return (
    <div 
      className={`message-container px-4 py-3 rounded mx-4 flex items-center justify-center min-w-[200px] max-w-[400px] ${getMessageClassName(message.type)}`}
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