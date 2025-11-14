import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, XMarkIcon, ArrowPathIcon, BookmarkIcon } from '@heroicons/react/24/outline';
import FilterRow, { FilterCondition } from './FilterRow.tsx';
import FilterLogicalOperator from './FilterLogicalOperator.tsx';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { toast } from 'react-toastify';

interface TableColumn {
  id: string;
  label: string;
}

interface SortDirection {
  column: string;
  direction: 'asc' | 'desc';
  priority: number;
  conditionIndex: number; // Index der Filterzeile, zu der diese Sortierrichtung gehört
}

interface FilterPaneProps {
  columns: TableColumn[];
  onApply: (conditions: FilterCondition[], logicalOperators: ('AND' | 'OR')[]) => void;
  onReset: () => void;
  savedConditions?: FilterCondition[];
  savedOperators?: ('AND' | 'OR')[];
  savedSortDirections?: SortDirection[];
  onSortDirectionsChange?: (sortDirections: SortDirection[]) => void;
  tableId: string; // Tabellen-ID für die gespeicherten Filter
}

const FilterPane: React.FC<FilterPaneProps> = ({ 
  columns,
  onApply,
  onReset,
  savedConditions,
  savedOperators,
  savedSortDirections,
  onSortDirectionsChange,
  tableId
}) => {
  const { t } = useTranslation();
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
  
  // Initialisiere Sortierrichtungen (Array-basiert mit Priorität)
  const [sortDirections, setSortDirections] = useState<SortDirection[]>(
    savedSortDirections || []
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
        console.error(t('filter.loadError'), err);
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
    
    if (savedSortDirections) {
      setSortDirections(savedSortDirections);
    }
  }, [savedConditions, savedOperators, savedSortDirections]);
  
  // Hilfsfunktion: Prioritäten neu nummerieren (1, 2, 3, ...)
  const renumberPriorities = (sortDirs: SortDirection[]): SortDirection[] => {
    return sortDirs
      .sort((a, b) => a.priority - b.priority)
      .map((sd, index) => ({ ...sd, priority: index + 1 }));
  };
  
  // Hilfsfunktion: Sortierrichtung für eine Zeile finden
  const getSortDirectionForIndex = (index: number): SortDirection | undefined => {
    return sortDirections.find(sd => sd.conditionIndex === index);
  };
  
  const handleConditionChange = (index: number, newCondition: FilterCondition) => {
    const newConditions = [...conditions];
    const oldCondition = newConditions[index];
    newConditions[index] = newCondition;
    setConditions(newConditions);
    
    // Wenn sich die Spalte geändert hat, aktualisiere Sortierrichtungen
    if (oldCondition.column !== newCondition.column) {
      let newSortDirections = [...sortDirections];
      
      // Entferne Sortierrichtung für diese Zeile (wenn vorhanden)
      if (oldCondition.column) {
        const oldSortDirIndex = newSortDirections.findIndex(sd => sd.conditionIndex === index);
        if (oldSortDirIndex >= 0) {
          newSortDirections.splice(oldSortDirIndex, 1);
        }
      }
      
      // Setze Standard-Sortierrichtung für neue Spalte (nur wenn Spalte ausgewählt)
      if (newCondition.column && newCondition.column !== '') {
        // Finde die höchste Priorität
        const maxPriority = newSortDirections.length > 0 
          ? Math.max(...newSortDirections.map(sd => sd.priority))
          : 0;
        
        // Füge neue Sortierrichtung hinzu (mit conditionIndex)
        newSortDirections.push({
          column: newCondition.column,
          direction: 'asc',
          priority: maxPriority + 1,
          conditionIndex: index
        });
      }
      
      // Prioritäten neu nummerieren
      newSortDirections = renumberPriorities(newSortDirections);
      
      setSortDirections(newSortDirections);
      if (onSortDirectionsChange) {
        onSortDirectionsChange(newSortDirections);
      }
    }
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
    
    // Entferne Sortierrichtung für diese Zeile und aktualisiere Indizes
    let newSortDirections = sortDirections
      .filter(sd => sd.conditionIndex !== index) // Entferne Sortierrichtung für gelöschte Zeile
      .map(sd => {
        // Aktualisiere conditionIndex für alle Zeilen nach der gelöschten
        if (sd.conditionIndex > index) {
          return { ...sd, conditionIndex: sd.conditionIndex - 1 };
        }
        return sd;
      });
    
    // Prioritäten neu nummerieren
    newSortDirections = renumberPriorities(newSortDirections);
    
    setSortDirections(newSortDirections);
    if (onSortDirectionsChange) {
      onSortDirectionsChange(newSortDirections);
    }
  };
  
  const handleSortDirectionChange = (index: number, direction: 'asc' | 'desc') => {
    const condition = conditions[index];
    if (condition && condition.column) {
      let newSortDirections = [...sortDirections];
      const existingIndex = newSortDirections.findIndex(sd => sd.conditionIndex === index);
      
      if (existingIndex >= 0) {
        // Aktualisiere bestehende Sortierrichtung
        newSortDirections[existingIndex] = {
          ...newSortDirections[existingIndex],
          direction
        };
      } else {
        // Erstelle neue Sortierrichtung
        const maxPriority = newSortDirections.length > 0 
          ? Math.max(...newSortDirections.map(sd => sd.priority))
          : 0;
        newSortDirections.push({
          column: condition.column,
          direction,
          priority: maxPriority + 1,
          conditionIndex: index
        });
        // Prioritäten neu nummerieren
        newSortDirections = renumberPriorities(newSortDirections);
      }
      
      setSortDirections(newSortDirections);
      if (onSortDirectionsChange) {
        onSortDirectionsChange(newSortDirections);
      }
    }
  };
  
  const handlePriorityChange = (index: number, newPriority: number) => {
    const condition = conditions[index];
    if (condition && condition.column) {
      let newSortDirections = [...sortDirections];
      const existingIndex = newSortDirections.findIndex(sd => sd.conditionIndex === index);
      
      if (existingIndex >= 0) {
        const currentPriority = newSortDirections[existingIndex].priority;
        
        // Tausche Prioritäten mit der anderen Zeile
        const otherIndex = newSortDirections.findIndex(sd => sd.priority === newPriority);
        if (otherIndex >= 0) {
          newSortDirections[otherIndex].priority = currentPriority;
        }
        
        newSortDirections[existingIndex].priority = newPriority;
        
        // Prioritäten neu nummerieren
        newSortDirections = renumberPriorities(newSortDirections);
        
        setSortDirections(newSortDirections);
        if (onSortDirectionsChange) {
          onSortDirectionsChange(newSortDirections);
        }
      }
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
    setSortDirections([]);
    if (onSortDirectionsChange) {
      onSortDirectionsChange([]);
    }
    onReset();
  };

  // Funktion zum Speichern des aktuellen Filters
  const handleSaveFilter = async () => {
    if (!filterName.trim()) {
      toast.error(t('filter.noName'));
      return;
    }

    // Prüfe, ob der Name ein reservierter Standardfilter-Name ist
    if (filterName === 'Archiv' || filterName === 'Aktuell') {
      toast.error(t('filter.reservedNames'));
      return;
    }

    // Prüfe, ob ein Standardfilter mit diesem Namen bereits existiert
    const standardFilterExists = existingFilters.some(filter => 
      (filter.name === 'Archiv' || filter.name === 'Aktuell') && filter.name === filterName
    );
    
    if (standardFilterExists) {
      toast.error(t('filter.cannotOverwriteStandard'));
      return;
    }

    // Nur gültige Bedingungen senden
    const validConditions = conditions.filter(c => c.column !== '');
    
    if (validConditions.length === 0) {
      toast.error(t('filter.noConditions'));
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error(t('filter.notAuthenticated'));
        return;
      }
      
      const response = await axiosInstance.post(
        API_ENDPOINTS.SAVED_FILTERS.BASE,
        {
          tableId,
          name: filterName,
          conditions: validConditions,
          operators: logicalOperators,
          sortDirections: sortDirections
        }
      );
      
      toast.success(t('filter.saveSuccess'));
      setShowSaveInput(false);
      setFilterName('');
    } catch (err) {
      console.error('Fehler beim Speichern des Filters:', err);
      toast.error(t('filter.saveError'));
    }
  };
  
  return (
    <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
      <h3 className="text-base font-medium text-gray-700 dark:text-gray-200 mb-3">{t('filter.title')}</h3>
      
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
              sortDirection={(() => {
                const sortDir = getSortDirectionForIndex(index);
                return sortDir ? sortDir.direction : undefined;
              })()}
              sortPriority={(() => {
                const sortDir = getSortDirectionForIndex(index);
                return sortDir ? sortDir.priority : undefined;
              })()}
              onSortDirectionChange={condition.column && condition.column !== '' ? (direction) => {
                handleSortDirectionChange(index, direction);
              } : undefined}
              onPriorityChange={(() => {
                const sortDir = getSortDirectionForIndex(index);
                if (sortDir) {
                  return (newPriority: number) => handlePriorityChange(index, newPriority);
                }
                return undefined;
              })()}
              canMoveUp={(() => {
                const sortDir = getSortDirectionForIndex(index);
                if (sortDir && sortDir.priority > 1) {
                  return true;
                }
                return false;
              })()}
              canMoveDown={(() => {
                const sortDir = getSortDirectionForIndex(index);
                if (sortDir) {
                  const maxPriority = sortDirections.length > 0 
                    ? Math.max(...sortDirections.map(sd => sd.priority))
                    : 0;
                  return sortDir.priority < maxPriority;
                }
                return false;
              })()}
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
            placeholder={t('filter.filterName')}
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
          />
          <button
            onClick={handleSaveFilter}
            className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
            title={t('filter.saveFilter')}
          >
            <BookmarkIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowSaveInput(false)}
            className="p-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
            title={t('filter.cancel')}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={handleResetFilters}
            className="p-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
            title={t('filter.reset')}
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowSaveInput(true)}
            className="p-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
            title={t('filter.save')}
          >
            <BookmarkIcon className="h-5 w-5" />
          </button>
          <button
            onClick={handleApplyFilters}
            className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
            title={t('filter.apply')}
          >
            <CheckIcon className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterPane; 