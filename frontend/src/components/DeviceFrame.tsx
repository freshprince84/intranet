import React from 'react';

type DeviceFrameProps = {
  type: 'browser' | 'phone';
  children: React.ReactNode;
  className?: string;
};

const DeviceFrame: React.FC<DeviceFrameProps> = ({ type, children, className = '' }) => {
  if (type === 'browser') {
    return (
      <div className={`relative mx-auto max-w-5xl ${className}`}>
        {/* Browser Frame */}
        <div className="bg-gray-200 dark:bg-gray-700 rounded-t-lg p-1 shadow-lg">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <div className="flex-1 bg-white dark:bg-gray-800 rounded px-3 py-1 text-xs text-gray-500 dark:text-gray-400 text-center">
              https://intranet.example.com
            </div>
          </div>
        </div>
        {/* Screenshot Container */}
        <div className="bg-white dark:bg-gray-800 rounded-b-lg overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700">
          {children}
        </div>
      </div>
    );
  }

  // Phone Frame
  return (
    <div className={`relative mx-auto max-w-xs ${className}`}>
      <div className="bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
        <div className="bg-white dark:bg-gray-800 rounded-[2rem] overflow-hidden">
          {/* Notch */}
          <div className="h-6 bg-gray-900 rounded-t-[2rem] flex items-center justify-center">
            <div className="w-32 h-1 bg-gray-700 rounded-full"></div>
          </div>
          {children}
          {/* Home Indicator */}
          <div className="h-2 bg-gray-900 rounded-b-[2rem] flex items-center justify-center">
            <div className="w-32 h-1 bg-gray-700 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceFrame;

