import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { useAuth } from '../hooks/useAuth.tsx';

interface Branch {
    id: number;
    name: string;
    lastUsed?: boolean;
}

interface BranchContextType {
    branches: Branch[];
    selectedBranch: number | null;
    setSelectedBranch: (branchId: number | null) => void;
    loadBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType>({
    branches: [],
    selectedBranch: null,
    setSelectedBranch: () => {},
    loadBranches: async () => {}
});

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
    const { user, isLoading } = useAuth();

    // Funktion zum Laden der Niederlassungen des Benutzers mit lastUsed-Flag
    const loadBranches = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                if (process.env.NODE_ENV === 'development') {
                  console.error('Kein Authentifizierungstoken gefunden');
                }
                return;
            }
            
            // ✅ MEMORY: AbortController für Request-Cancellation
            // Hinweis: AbortController wird von aufrufenden Komponenten verwaltet
            // Lade User-Branches mit lastUsed-Flag
            const response = await axiosInstance.get(API_ENDPOINTS.BRANCHES.USER);
            const data = response.data;
            setBranches(data);
            
            // Setze den lastUsed-Branch als selectedBranch, falls vorhanden
            if (data.length > 0) {
                const lastUsedBranch = data.find((branch: Branch) => branch.lastUsed === true);
                
                if (lastUsedBranch) {
                    // Verwende den lastUsed-Branch
                    setSelectedBranch(lastUsedBranch.id);
                } else if (!selectedBranch) {
                    // Fallback: Erste Branch, falls keine lastUsed-Branch vorhanden
                    setSelectedBranch(data[0].id);
                }
                // Wenn selectedBranch bereits gesetzt ist (z.B. aus localStorage), behalte ihn
            } else {
                // Keine Branches vorhanden
                setSelectedBranch(null);
            }
        } catch (error: any) {
            // ✅ MEMORY: Ignoriere Abort-Errors
            if (error.name === 'AbortError' || error.name === 'CanceledError') {
                return; // Request wurde abgebrochen
            }
            if (process.env.NODE_ENV === 'development') {
              console.error('Fehler beim Laden der Niederlassungen:', error);
            }
            // Bei Fehler: Fallback auf alle Branches (ohne lastUsed)
            try {
                const fallbackResponse = await axiosInstance.get(API_ENDPOINTS.BRANCHES.BASE);
                const fallbackData = fallbackResponse.data;
                setBranches(fallbackData);
                
                // Setze erste Branch als Fallback
                if (fallbackData.length > 0 && !selectedBranch) {
                    setSelectedBranch(fallbackData[0].id);
                }
            } catch (fallbackError: any) {
                // ✅ MEMORY: Ignoriere Abort-Errors
                if (fallbackError.name === 'AbortError' || fallbackError.name === 'CanceledError') {
                    return; // Request wurde abgebrochen
                }
                if (process.env.NODE_ENV === 'development') {
                  console.error('Fehler beim Fallback-Laden der Niederlassungen:', fallbackError);
                }
            }
        }
    };

    // ✅ MEMORY: Verzögertes Laden - nicht sofort wenn User geladen, sondern nach kurzem Delay
    // Dies reduziert die Anzahl der parallelen API-Calls beim Initial Load
    useEffect(() => {
        if (!isLoading && user) {
            // Verzögere das Laden um 150ms - gibt anderen kritischen Requests Vorrang
            const timeoutId = setTimeout(() => {
                loadBranches();
            }, 150);
            
            return () => {
                clearTimeout(timeoutId);
            };
        }
    }, [isLoading, user]);

    // Speichere die ausgewählte Niederlassung im localStorage (als Fallback)
    useEffect(() => {
        if (selectedBranch) {
            localStorage.setItem('selectedBranch', selectedBranch.toString());
        }
    }, [selectedBranch]);

    return (
        <BranchContext.Provider value={{ branches, selectedBranch, setSelectedBranch, loadBranches }}>
            {children}
        </BranchContext.Provider>
    );
};

export const useBranch = () => useContext(BranchContext); 