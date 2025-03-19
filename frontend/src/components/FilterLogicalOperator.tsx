import React from 'react';

interface FilterLogicalOperatorProps {
  operator: 'AND' | 'OR';
  onChange: (operator: 'AND' | 'OR') => void;
}

const FilterLogicalOperator: React.FC<FilterLogicalOperatorProps> = ({ operator, onChange }) => {
  return (
    <div className="flex items-center justify-center my-2 mx-4">
      <select
        className="px-3 py-2 border rounded-md text-sm font-medium bg-gray-50"
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