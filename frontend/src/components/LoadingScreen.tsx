import React from 'react';

/**
 * Moderne Loading-Screen-Komponente
 * Wird während der Authentifizierungsprüfung angezeigt
 */
const LoadingScreen: React.FC = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <div className="text-center">
                {/* Hauptspinner - nur eine Animation für optimale Performance */}
                <div className="mb-8">
                    <div className="w-20 h-20 border-4 border-gray-200 dark:border-gray-700 rounded-full animate-spin border-t-blue-600 dark:border-t-blue-400 mx-auto"></div>
                </div>

                {/* Text mit subtiler Animation */}
                <div className="space-y-2">
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                        Wird geladen
                    </p>
                    <div className="flex justify-center gap-1">
                        <span className="text-sm text-gray-500 dark:text-gray-400">.</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">.</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">.</span>
                    </div>
                </div>

                {/* Subtile Nachricht */}
                <div className="mt-6 text-xs text-gray-400 dark:text-gray-500">
                    <p>
                        Fast fertig... nur noch einen Moment! ⚡
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;

