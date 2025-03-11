import React from 'react';
import PayrollComponent from '../components/PayrollComponent.tsx';

const Payroll: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Lohnabrechnung</h1>
      <PayrollComponent />
    </div>
  );
};

export default Payroll; 