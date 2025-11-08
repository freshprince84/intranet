import React from 'react';

interface FilterLogicalOperatorProps {
  operator: 'AND' | 'OR';
  onChange: (operator: 'AND' | 'OR') => void;
}

const FilterLogicalOperator: React.FC<FilterLogicalOperatorProps> = ({ operator, onChange }) => {
  return (
    <div className="flex items-center justify-center -my-1">
      <select
        className="px-1.5 py-0.5 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-[60px]"
        value={operator}
        onChange={(e) => onChange(e.target.value as 'AND' | 'OR')}
      >
        <option value="AND">UND</option>
        <option value="OR">ODER</option>
      </select>
    </div>
  );
};

export default FilterLogicalOperator; 