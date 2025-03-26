import React, { useState, useEffect } from 'react';
import FilterRow, { FilterCondition } from './FilterRow.tsx';
import FilterLogicalOperator from './FilterLogicalOperator.tsx';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { toast } from 'react-toastify';

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
  tableId: string; // Tabellen-ID für die gespeicherten Filter
}

const FilterPane: React.FC<FilterPaneProps> = ({ 
  columns,
  onApply,
  onReset,
  savedConditions,
  savedOperators,
  tableId
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

  // Zustand für das Speichern von Filtern
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [filterName, setFilterName] = useState('');
  
  // Lade bestehende Filter, um Konflikte mit Standardfiltern zu vermeiden
  const [existingFilters, setExistingFilters] = useState<{ id: number, name: string }[]>([]);
  
  useEffect(() => {
    const fetchExistingFilters = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          return;
        }
        
        const response = await axiosInstance.get(
          API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId)
        );
        
        setExistingFilters(response.data.map((filter: any) => ({ id: filter.id, name: filter.name })));
      } catch (err) {
        console.error('Fehler beim Laden der existierenden Filter:', err);
      }
    };
    
    fetchExistingFilters();
  }, [tableId]);
  
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

  // Funktion zum Speichern des aktuellen Filters
  const handleSaveFilter = async () => {
    if (!filterName.trim()) {
      toast.error('Bitte geben Sie einen Namen für den Filter ein');
      return;
    }

    // Prüfe, ob der Name ein reservierter Standardfilter-Name ist
    if (filterName === 'Archiv' || filterName === 'Aktuell') {
      toast.error('Die Namen "Archiv" und "Aktuell" sind für Standardfilter reserviert');
      return;
    }

    // Prüfe, ob ein Standardfilter mit diesem Namen bereits existiert
    const standardFilterExists = existingFilters.some(filter => 
      (filter.name === 'Archiv' || filter.name === 'Aktuell') && filter.name === filterName
    );
    
    if (standardFilterExists) {
      toast.error('Standardfilter können nicht überschrieben werden');
      return;
    }

    // Nur gültige Bedingungen senden
    const validConditions = conditions.filter(c => c.column !== '');
    
    if (validConditions.length === 0) {
      toast.error('Filter enthält keine gültigen Bedingungen');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Nicht authentifiziert');
        return;
      }
      
      const response = await axiosInstance.post(
        API_ENDPOINTS.SAVED_FILTERS.BASE,
        {
          tableId,
          name: filterName,
          conditions: validConditions,
          operators: logicalOperators
        }
      );
      
      toast.success('Filter erfolgreich gespeichert');
      setShowSaveInput(false);
      setFilterName('');
    } catch (err) {
      console.error('Fehler beim Speichern des Filters:', err);
      toast.error('Fehler beim Speichern des Filters');
    }
  };
  
  return (
    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <h3 className="text-base font-medium text-gray-700 dark:text-gray-200 mb-3">Filter</h3>
      
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
      
      {/* Speicher-Interface */}
      {showSaveInput ? (
        <div className="mt-4 flex gap-2 items-center">
          <input
            type="text"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white flex-grow"
            placeholder="Filter-Name"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
          />
          <button
            onClick={handleSaveFilter}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none"
          >
            Speichern
          </button>
          <button
            onClick={() => setShowSaveInput(false)}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            Abbrechen
          </button>
        </div>
      ) : (
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            Filter zurücksetzen
          </button>
          <button
            onClick={() => setShowSaveInput(true)}
            className="px-4 py-2 text-sm text-green-700 dark:text-green-500 hover:text-green-900 dark:hover:text-green-400"
          >
            Filter speichern
          </button>
          <button
            onClick={handleApplyFilters}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none"
          >
            Filter anwenden
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterPane; 