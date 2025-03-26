import React from 'react';
import PayrollComponent from '../components/PayrollComponent.tsx';
import { CalculatorIcon } from '@heroicons/react/24/outline';

const Payroll: React.FC = () => {
  return (
    <div className="min-h-screen dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
          {/* Header mit Icon */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <CalculatorIcon className="h-6 w-6 text-gray-900 dark:text-white mr-2" />
              <h2 className="text-xl font-semibold dark:text-white">Lohnabrechnung</h2>
            </div>
          </div>
          
          <PayrollComponent />
        </div>
      </div>
    </div>
  );
};

export default Payroll; 