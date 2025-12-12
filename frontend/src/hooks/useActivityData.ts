import { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';

export type ActivityType = 'user-tasks' | 'user-requests' | 'tasks' | 'requests';

export interface UseActivityDataOptions {
    type: ActivityType;
    period: string;
    startDate?: string;
    endDate?: string;
    userId?: number;
    branchId?: number;
    cacheKey?: string; // Für manuelles Cache-Invalidierung
}

export const useActivityData = (options: UseActivityDataOptions) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    
    // ✅ MEMORY: Ref für options, um Memory Leak zu vermeiden
    const optionsRef = useRef(options);
    useEffect(() => {
        optionsRef.current = options;
    }, [options]);
    
    // ✅ CACHING: Cache-Key basierend auf Parametern
    const cacheKey = options.cacheKey || `${options.type}-${options.period}-${options.startDate}-${options.endDate}-${options.userId}-${options.branchId}`;
    
    // ✅ MEMORY: fetchData ohne options-Dependency (verwendet Ref)
    const fetchData = useCallback(async () => {
        const opts = optionsRef.current; // Ref verwenden!
        
        // ✅ CACHING: Prüfe lokalen Cache (sessionStorage)
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            try {
                const cachedData = JSON.parse(cached);
                const cacheAge = Date.now() - cachedData.timestamp;
                // Cache gültig für 5 Minuten
                if (cacheAge < 5 * 60 * 1000) {
                    setData(cachedData.data);
                    return;
                }
            } catch (e) {
                // Cache invalid, weiter mit Fetch
            }
        }
        
        setLoading(true);
        setError(null);
        
        try {
            const params: any = {
                period: opts.period
            };
            
            if (opts.startDate) params.startDate = opts.startDate;
            if (opts.endDate) params.endDate = opts.endDate;
            if (opts.userId) params.userId = opts.userId;
            if (opts.branchId) params.branchId = opts.branchId;
            
            let endpoint = '';
            switch (opts.type) {
                case 'user-tasks':
                    endpoint = API_ENDPOINTS.TEAM_WORKTIME.ANALYTICS.USER_TASKS_ACTIVITY;
                    break;
                case 'user-requests':
                    endpoint = API_ENDPOINTS.TEAM_WORKTIME.ANALYTICS.USER_REQUESTS_ACTIVITY;
                    break;
                case 'tasks':
                    endpoint = API_ENDPOINTS.TEAM_WORKTIME.ANALYTICS.TASKS_ACTIVITY;
                    break;
                case 'requests':
                    endpoint = API_ENDPOINTS.TEAM_WORKTIME.ANALYTICS.REQUESTS_ACTIVITY;
                    break;
            }
            
            const response = await axiosInstance.get(endpoint, { params });
            
            // ✅ CACHING: Speichere in sessionStorage
            try {
                sessionStorage.setItem(cacheKey, JSON.stringify({
                    data: response.data,
                    timestamp: Date.now()
                }));
            } catch (e) {
                // sessionStorage voll oder nicht verfügbar, ignoriere
            }
            
            setData(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    }, [cacheKey]); // Nur cacheKey als Dependency!
    
    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    // ✅ MEMORY: Optional: Cleanup für Cache beim Unmount
    useEffect(() => {
        return () => {
            // Optional: Cache löschen beim Unmount
            // sessionStorage.removeItem(cacheKey);
        };
    }, [cacheKey]);
    
    return {
        data,
        loading,
        error,
        refetch: fetchData
    };
};

