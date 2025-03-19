import React, { useState, useEffect } from 'react';
import FilterRow, { FilterCondition } from './FilterRow.tsx';
import FilterLogicalOperator from './FilterLogicalOperator.tsx';

interface TableColumn {
  id: string;
  label: string;
}

interface FilterPaneProps {
  columns: TableColumn[];
  onApply: (conditions: FilterCondition[], logicalOperators: ('AND' | 'OR')[]) => void;
  onReset: () => void;
  savedConditions?: FilterCondition[];
  savedOperators?: ('AND' | 'OR')[];
}

const FilterPane: React.FC<FilterPaneProps> = ({ 
  columns,
  onApply,
  onReset,
  savedConditions,
  savedOperators
}) => {
  // Initialisiere mit einem leeren Filter, wenn keine gespeicherten Filter vorhanden sind
  const [conditions, setConditions] = useState<FilterCondition[]>(
    savedConditions && savedConditions.length > 0 
      ? savedConditions 
      : [{ column: '', operator: 'equals', value: null }]
  );
  
  // Initialisiere mit AND als Standard-Operator
  const [logicalOperators, setLogicalOperators] = useState<('AND' | 'OR')[]>(
    savedOperators && savedOperators.length > 0
      ? savedOperators
      : []
  );
  
  // Initialisiere Bedingungen und Operatoren, wenn gespeicherte Werte vorhanden sind
  useEffect(() => {
    if (savedConditions && savedConditions.length > 0) {
      setConditions(savedConditions);
    }
    
    if (savedOperators && savedOperators.length > 0) {
      setLogicalOperators(savedOperators);
    }
  }, [savedConditions, savedOperators]);
  
  const handleConditionChange = (index: number, newCondition: FilterCondition) => {
    const newConditions = [...conditions];
    newConditions[index] = newCondition;
    setConditions(newConditions);
  };
  
  const handleOperatorChange = (index: number, newOperator: 'AND' | 'OR') => {
    const newOperators = [...logicalOperators];
    newOperators[index] = newOperator;
    setLogicalOperators(newOperators);
  };
  
  const handleAddCondition = () => {
    setConditions([...conditions, { column: '', operator: 'equals', value: null }]);
    
    // Füge standardmäßig einen AND-Operator hinzu
    if (conditions.length > 0) {
      setLogicalOperators([...logicalOperators, 'AND']);
    }
  };
  
  const handleDeleteCondition = (index: number) => {
    // Entferne die Bedingung
    const newConditions = [...conditions];
    newConditions.splice(index, 1);
    setConditions(newConditions);
    
    // Entferne auch den entsprechenden Operator, falls vorhanden
    if (index > 0) {
      const newOperators = [...logicalOperators];
      newOperators.splice(index - 1, 1);
      setLogicalOperators(newOperators);
    }
  };
  
  const handleApplyFilters = () => {
    // Nur gültige Bedingungen senden (bei denen mindestens eine Spalte ausgewählt ist)
    const validConditions = conditions.filter(c => c.column !== '');
    onApply(validConditions, logicalOperators);
  };
  
  const handleResetFilters = () => {
    setConditions([{ column: '', operator: 'equals', value: null }]);
    setLogicalOperators([]);
    onReset();
  };
  
  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-base font-medium text-gray-700 mb-3">Filter</h3>
      
      <div className="space-y-0">
        {conditions.map((condition, index) => (
          <React.Fragment key={index}>
            <FilterRow
              condition={condition}
              onChange={(newCondition) => handleConditionChange(index, newCondition)}
              onDelete={() => handleDeleteCondition(index)}
              onAdd={handleAddCondition}
              columns={columns}
              isFirst={index === 0}
              isLast={index === conditions.length - 1}
            />
            
            {/* Operator zwischen Bedingungen einfügen (aber nicht nach der letzten) */}
            {index < conditions.length - 1 && (
              <FilterLogicalOperator
                operator={logicalOperators[index] || 'AND'}
                onChange={(newOperator) => handleOperatorChange(index, newOperator)}
              />
            )}
          </React.Fragment>
        ))}
      </div>
      
      <div className="flex justify-end gap-3 mt-4">
        <button
          onClick={handleResetFilters}
          className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
        >
          Filter zurücksetzen
        </button>
        <button
          onClick={handleApplyFilters}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none"
        >
          Filter anwenden
        </button>
      </div>
    </div>
  );
};

export default FilterPane; 