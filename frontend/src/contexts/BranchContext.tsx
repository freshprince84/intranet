import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';

interface Branch {
    id: number;
    name: string;
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

    // Funktion zum Laden der Niederlassungen
    const loadBranches = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('Kein Authentifizierungstoken gefunden');
                return;
            }
            
            const response = await axiosInstance.get(API_ENDPOINTS.BRANCHES.BASE);
            const data = response.data;
            setBranches(data);
            
            // Setze die erste Niederlassung als Standard, falls keine ausgewählt ist
            if (data.length > 0 && !selectedBranch) {
                setSelectedBranch(data[0].id);
            }
        } catch (error) {
            console.error('Fehler beim Laden der Niederlassungen:', error);
        }
    };

    // Lade Niederlassungen beim ersten Rendern
    useEffect(() => {
        loadBranches();
    }, []);

    // Speichere die ausgewählte Niederlassung im localStorage
    useEffect(() => {
        if (selectedBranch) {
            localStorage.setItem('selectedBranch', selectedBranch.toString());
        }
    }, [selectedBranch]);

    // Lade die gespeicherte Niederlassung beim Start
    useEffect(() => {
        const savedBranch = localStorage.getItem('selectedBranch');
        if (savedBranch) {
            setSelectedBranch(Number(savedBranch));
        }
    }, []);

    return (
        <BranchContext.Provider value={{ branches, selectedBranch, setSelectedBranch, loadBranches }}>
            {children}
        </BranchContext.Provider>
    );
};

export const useBranch = () => useContext(BranchContext); 