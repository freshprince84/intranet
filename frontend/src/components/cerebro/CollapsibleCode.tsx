import React, { useState } from 'react';

interface CollapsibleCodeProps {
  children: React.ReactNode;
  language?: string;
  filename?: string;
}

const CollapsibleCode: React.FC<CollapsibleCodeProps> = ({ 
  children, 
  language = '', 
  filename = ''
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  
  // Titel für den Header bestimmen
  const title = filename || (language ? `${language.toUpperCase()} Code` : 'Code');
  
  return (
    <div className="border rounded-md overflow-hidden mb-4">
      <div 
        className="flex items-center justify-between p-2 bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center">
          <span className="mr-2 font-bold text-gray-600">
            {isCollapsed ? '▶' : '▼'}
          </span>
          <span className="mr-2 text-blue-600">
            &lt;/&gt;
          </span>
          <span className="font-medium text-gray-800">{title}</span>
        </div>
        <div className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
          {isCollapsed ? 'Ausklappen' : 'Einklappen'}
        </div>
      </div>
      
      <div className={`transition-all duration-300 ${isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-full opacity-100'}`}>
        {children}
      </div>
    </div>
  );
};

export default CollapsibleCode; 