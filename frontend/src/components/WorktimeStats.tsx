import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, getWeek, getYear, parse, addDays } from 'date-fns';
import { de, es, enUS } from 'date-fns/locale';
import { useLanguage } from '../hooks/useLanguage.ts';
import { ChartBarIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { API_URL, API_ENDPOINTS } from '../config/api.ts';
import WorktimeList from './WorktimeList.tsx';
import axios from 'axios';
import axiosInstance from '../config/axios.ts';
import { WorktimeModal } from './WorktimeModal.tsx';
import { convertWeekToDate, getWeekDays, getQuinzenaFromDate, convertQuinzenaToDate, getQuinzenaDays, getCurrentQuinzena } from '../utils/dateUtils.ts';
import { useAuth } from '../hooks/useAuth.tsx';
import { useOrganization } from '../contexts/OrganizationContext.tsx';

// Neue Schnittstelle für das WorktimeModal mit selectedDate
interface WorktimeModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate: string; // Im Kontext von WorktimeStats ist selectedDate immer erforderlich
}

interface WorktimeStats {
    totalHours: number;
    averageHoursPerDay: number;
    daysWorked: number;
    weeklyData: {
        day: string;
        hours: number;
        date: string; // Datum im Format YYYY-MM-DD
    }[];
}

const WorktimeStats: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { activeLanguage } = useLanguage();
    const { user } = useAuth();
    const { organization } = useOrganization();
    const [stats, setStats] = useState<WorktimeStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [maxHours, setMaxHours] = useState<number>(8); // Standard 8 Stunden
    
    // Prüfe ob Organisation oder User aus Kolumbien kommt
    const isColombia = useMemo(() => {
        // Prüfe zuerst User-Land, dann Organisation (falls vorhanden)
        const userIsColombia = user?.country === 'CO';
        const orgIsColombia = organization?.country === 'CO'; // KORREKTUR: Direkt auf organization, nicht settings
        const result = userIsColombia || orgIsColombia;
        console.log('Quinzena-Check:', { 
            userCountry: user?.country, 
            orgCountry: organization?.country, // KORREKTUR: Direkt auf organization
            isColombia: result 
        });
        return result;
    }, [user?.country, organization?.country]); // KORREKTUR: Spezifische Dependency
    
    // Ref um zu tracken, ob useQuinzena manuell geändert wurde (nicht durch isColombia)
    const isManualPeriodChange = useRef(false);
    
    // State für Woche/Quinzena-Modus
    // Initial: basierend auf isColombia (kann auch user?.country prüfen, bevor organization geladen ist)
    const [useQuinzena, setUseQuinzena] = useState<boolean>(() => {
        // Initial: Prüfe user?.country, da organization möglicherweise noch nicht geladen ist
        return user?.country === 'CO';
    });
    
    // Dynamisches Locale basierend auf aktueller Sprache
    const dateLocale = useMemo(() => {
        const lang = activeLanguage || i18n.language || 'de';
        switch (lang) {
            case 'es': return es;
            case 'en': return enUS;
            default: return de;
        }
    }, [activeLanguage, i18n.language]);
    
    // Aktuelle Woche/Quinzena im Format YYYY-Www oder YYYY-Qq für das Input-Element
    const today = new Date();
    
    const currentWeekInput = useMemo(() => {
        return `${getYear(today)}-W${String(getWeek(today, { locale: dateLocale })).padStart(2, '0')}`;
    }, [dateLocale]);
    
    const currentQuinzenaInput = useMemo(() => {
        return getCurrentQuinzena();
    }, []);
    
    const [selectedWeekInput, setSelectedWeekInput] = useState<string>(currentWeekInput);
    const [selectedQuinzenaInput, setSelectedQuinzenaInput] = useState<string>(currentQuinzenaInput);
    
    // Aktualisiere selectedWeekInput/selectedQuinzenaInput wenn sich die Sprache ändert
    useEffect(() => {
        if (useQuinzena) {
            setSelectedQuinzenaInput(currentQuinzenaInput);
        } else {
            setSelectedWeekInput(currentWeekInput);
        }
    }, [currentWeekInput, currentQuinzenaInput, useQuinzena]);
    
    // Berechne das Datum des Montags der aktuellen Woche oder Start der Quinzena
    const currentMonday = startOfWeek(today, { weekStartsOn: 1 });
    const currentQuinzenaStart = convertQuinzenaToDate(currentQuinzenaInput);
    
    const [selectedWeekDate, setSelectedWeekDate] = useState<string>(format(currentMonday, 'yyyy-MM-dd'));
    const [selectedQuinzenaDate, setSelectedQuinzenaDate] = useState<string>(currentQuinzenaStart);
    
    // Sicherstellen, dass selectedDate immer korrekt ist (MUSS vor useEffect definiert werden)
    const selectedDate = useMemo(() => {
        const result = useQuinzena 
            ? (selectedQuinzenaDate || convertQuinzenaToDate(getCurrentQuinzena()))
            : (selectedWeekDate || format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
        console.log('selectedDate calculated:', { useQuinzena, selectedQuinzenaDate, selectedWeekDate, result });
        return result;
    }, [useQuinzena, selectedQuinzenaDate, selectedWeekDate]);
    
    // State für das WorktimeModal
    const [showWorkTimeModal, setShowWorkTimeModal] = useState(false);
    const [selectedDateForModal, setSelectedDateForModal] = useState<string>('');

    // useEffect-Hook für das Laden der Statistikdaten
    // Warte bis user geladen ist, bevor wir Daten laden (um isColombia korrekt zu prüfen)
    useEffect(() => {
        // Warte bis user geladen ist (um isColombia korrekt zu prüfen)
        if (!user) {
            return;
        }
        fetchStats();
    }, [selectedDate, user, useQuinzena]);

    // Neue Funktion: fetchStatsWithDate (kann mit explizitem Datum aufgerufen werden)
    const fetchStatsWithDate = async (dateToSend: string, isQuinzena: boolean) => {
        try {
            setLoading(true);
            
            if (!dateToSend) {
                console.error('Kein Datum zum Senden verfügbar');
                setError('Kein Datum verfügbar');
                setLoading(false);
                return;
            }
            
            console.log('Fetch Stats:', { isQuinzena, dateToSend });
            
            const endpoint = isQuinzena 
                ? `${API_ENDPOINTS.WORKTIME.STATS}?quinzena=${dateToSend}`
                : `${API_ENDPOINTS.WORKTIME.STATS}?week=${dateToSend}`;
            
            console.log('API Endpoint:', endpoint);
            
            const response = await axiosInstance.get(endpoint);
            const data = response.data;
            
            console.log('API Response:', data);
            
            // Wichtig: Stelle sicher, dass die weeklyData das richtige date-Format haben
            if (data && data.weeklyData) {
                if (isQuinzena) {
                    // Für Quinzenas: Backend gibt bereits korrekte Daten mit date zurück
                    console.log('Quinzena-Daten vom Backend:', {
                        totalHours: data.totalHours,
                        weeklyDataLength: data.weeklyData.length,
                        weeklyData: data.weeklyData
                    });
                    
                    // Stelle sicher, dass alle Einträge ein date-Feld haben und sortiere nach Datum
                    const validatedData = {
                        ...data,
                        weeklyData: data.weeklyData
                            .map(item => ({
                                ...item,
                                date: item.date || '',
                                hours: item.hours || 0
                            }))
                            .sort((a, b) => {
                                // Sortiere nach Datum
                                if (a.date && b.date) {
                                    return a.date.localeCompare(b.date);
                                }
                                return 0;
                            })
                    };
                    console.log('Validierte Quinzena-Daten:', validatedData);
                    setStats(validatedData);
                } else {
                    // Für Wochen: Mappe Wochentage zu Daten
                    const weekdayMapping: Record<string, number> = {
                        "Montag": 1,
                        "Dienstag": 2,
                        "Mittwoch": 3,
                        "Donnerstag": 4,
                        "Freitag": 5,
                        "Samstag": 6,
                        "Sonntag": 7,
                        // Fallback für andere Sprachen
                        [t('worktime.days.monday')]: 1,
                        [t('worktime.days.tuesday')]: 2,
                        [t('worktime.days.wednesday')]: 3,
                        [t('worktime.days.thursday')]: 4,
                        [t('worktime.days.friday')]: 5,
                        [t('worktime.days.saturday')]: 6,
                        [t('worktime.days.sunday')]: 7
                    };
                    
                    // Berechne die Tagesdaten für die Woche (7 Tage)
                    const periodDates: string[] = [];
                    for (let i = 0; i < 7; i++) {
                        periodDates.push(incrementDateString(dateToSend, i));
                    }
                    
                    // Konvertiere die Wochentage in Daten im YYYY-MM-DD Format
                    const enrichedData = {
                        ...data,
                        weeklyData: data.weeklyData.map((item) => {
                            const dayIndex = weekdayMapping[item.day as keyof typeof weekdayMapping];
                            if (dayIndex === undefined) {
                                console.error(`Unbekannter Wochentag: ${item.day}`);
                                return item;
                            }
                            
                            // Für Wochen: Da unser weekdayMapping bei 1 beginnt, müssen wir 1 subtrahieren
                            const formattedDate = periodDates[dayIndex - 1];
                            return {
                                ...item,
                                date: formattedDate
                            };
                        })
                    };
                    
                    setStats(enrichedData);
                }
            } else {
                setStats(data);
            }
            
            setError(null);
        } catch (err: any) {
            console.error('Fehler beim Abrufen der Statistikdaten:', err);
            setError(err?.response?.data?.message || 'Fehler beim Laden der Daten');
        } finally {
            setLoading(false);
        }
    };

    // Alte fetchStats-Funktion bleibt für useEffect-Kompatibilität
    const fetchStats = async () => {
        fetchStatsWithDate(selectedDate, useQuinzena);
    };

    const handleExport = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axiosInstance.get(`${API_ENDPOINTS.WORKTIME.BASE}/export?week=${selectedWeekDate}`, {
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = t('worktime.stats.exportFilename', { week: selectedWeekInput.split('W')[1] });
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Fehler beim Exportieren:', error);
            setError(t('worktime.stats.export') + ': ' + t('common.error'));
        }
    };

    const handleQuinzenaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newQuinzenaInput = e.target.value;
        if (!newQuinzenaInput) return;
        
        setSelectedQuinzenaInput(newQuinzenaInput);
        
        // Konvertiere das Quinzena-Format in ein Datum für die API
        const newQuinzenaDate = convertQuinzenaToDate(newQuinzenaInput);
        setSelectedQuinzenaDate(newQuinzenaDate);
        
        // Explizit Daten neu laden
        queueMicrotask(() => {
            fetchStatsWithDate(newQuinzenaDate, true);
        });
    };
    
    // Handler für Radio-Button-Wechsel zwischen Semana und Quinzena
    const handlePeriodChange = (newUseQuinzena: boolean) => {
        // Markiere als manuelle Änderung
        isManualPeriodChange.current = true;
        
        // 1. Setze useQuinzena sofort
        setUseQuinzena(newUseQuinzena);
        
        // 2. Berechne das korrekte Datum synchron
        let newDate: string;
        let newInput: string;
        
        if (newUseQuinzena) {
            // Quinzena-Modus
            const currentQuinzena = getCurrentQuinzena();
            newInput = currentQuinzena;
            newDate = convertQuinzenaToDate(currentQuinzena);
            setSelectedQuinzenaInput(newInput);
            setSelectedQuinzenaDate(newDate);
        } else {
            // Woche-Modus
            newInput = currentWeekInput;
            newDate = convertWeekToDate(currentWeekInput);
            setSelectedWeekInput(newInput);
            setSelectedWeekDate(newDate);
        }
        
        // 3. Rufe fetchStatsWithDate explizit mit dem neuen Datum auf
        // Verwende queueMicrotask, um sicherzustellen, dass State-Updates verarbeitet wurden
        queueMicrotask(() => {
            fetchStatsWithDate(newDate, newUseQuinzena);
            // Reset nach kurzer Verzögerung
            setTimeout(() => {
                isManualPeriodChange.current = false;
            }, 100);
        });
    };
    
    // useEffect für automatische isColombia-Änderungen (nicht für manuelle Radio-Button-Wechsel)
    useEffect(() => {
        // Überspringe, wenn die Änderung manuell war
        if (isManualPeriodChange.current) {
            return;
        }
        
        // Nur ausführen, wenn sich isColombia ändert (nicht bei manuellem Radio-Button-Klick)
        if (isColombia && !useQuinzena) {
            // Automatisch auf Quinzena umschalten wenn Kolumbien erkannt wird
            const currentQuinzena = getCurrentQuinzena();
            setSelectedQuinzenaInput(currentQuinzena);
            const quinzenaDate = convertQuinzenaToDate(currentQuinzena);
            setSelectedQuinzenaDate(quinzenaDate);
            setUseQuinzena(true);
            // Daten neu laden
            queueMicrotask(() => {
                fetchStatsWithDate(quinzenaDate, true);
            });
        } else if (!isColombia && useQuinzena) {
            // Automatisch auf Woche umschalten wenn nicht Kolumbien
            const weekDate = convertWeekToDate(currentWeekInput);
            setSelectedWeekInput(currentWeekInput);
            setSelectedWeekDate(weekDate);
            setUseQuinzena(false);
            // Daten neu laden
            queueMicrotask(() => {
                fetchStatsWithDate(weekDate, false);
            });
        }
    }, [isColombia, useQuinzena]); // isColombia UND useQuinzena als Dependencies, aber mit Ref-Check

    // Funktion zum Öffnen des Modals für den ausgewählten Tag
    const openWorkTimeModal = (date: string) => {
        // Sicherheitsprüfung: Falls date undefined ist, nichts tun
        if (!date) {
            console.error('Kein Datum für Modal angegeben');
            return;
        }
        
        // Klare Debug-Ausgabe ohne unnötige Komplexität
        // console.log(`Modal wird geöffnet mit Datum: ${date}`);
        
        // Einfache Sicherheitsüberprüfung: Stelle sicher, dass ein gültiges Datumsformat verwendet wird
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            console.error(`Ungültiges Datum für Modal: ${date}`);
            return;
        }
        
        // Keine weitere Manipulationen am Datum - nutze direkt den übergebenen Wert
        setSelectedDateForModal(date);
        setShowWorkTimeModal(true);
    };

    // Funktion zum Schließen des Modals
    const closeWorkTimeModal = () => {
        setShowWorkTimeModal(false);
    };

    useEffect(() => {
        if (!loading && stats && stats.weeklyData) {
            // Finde den höchsten Stundenwert für die Skalierung
            const maxHours = stats.weeklyData.reduce((max, day) => {
                const hours = typeof day.hours === 'number' ? day.hours : parseFloat(day.hours);
                return hours > max ? hours : max;
            }, 0);
            
            setMaxHours(maxHours);
        }
    }, [loading, stats]);

    if (loading) return <div className="p-4">{t('common.loading')}</div>;
    if (error) return <div className="p-4 text-red-600">{error}</div>;
    if (!stats) return null;

    const periodDays = useQuinzena ? getQuinzenaDays(selectedQuinzenaDate) : getWeekDays(selectedWeekDate);
    
    // Finde den höchsten Stundenwert für die Skalierung
    // Der scaleMax-Wert wird aus dem State-maxHours berechnet
    const scaleMax = Math.max(8, Math.ceil(maxHours * 1.1));
    
    // Konstante für die Sollarbeitszeit aus dem Benutzerprofil
    const targetWorkHours = user?.normalWorkingHours ?? 7.6;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center pl-2 sm:pl-0">
                    <ChartBarIcon className="h-6 w-6 mr-2 dark:text-white" />
                    <h2 className="text-xl font-semibold dark:text-white">{t('worktime.stats.title')}</h2>
                </div>
                <div className="flex items-center space-x-4">
                    {/* Radio-Buttons für Woche/Quinzena - nur anzeigen wenn Kolumbien */}
                    {isColombia && (
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="periodType"
                                    checked={!useQuinzena}
                                    onChange={() => handlePeriodChange(false)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                                />
                                <span className="text-sm dark:text-white">{t('worktime.stats.week')}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="periodType"
                                    checked={useQuinzena}
                                    onChange={() => handlePeriodChange(true)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                                />
                                <span className="text-sm dark:text-white">{t('worktime.stats.quinzena')}</span>
                            </label>
                        </div>
                    )}
                    {useQuinzena ? (
                        <input
                            type="text"
                            pattern="\d{4}-\d{2}-Q[12]"
                            placeholder="YYYY-MM-Q1"
                            value={selectedQuinzenaInput}
                            onChange={(e) => {
                                const value = e.target.value;
                                // Format: YYYY-MM-Q1 oder YYYY-MM-Q2
                                if (/^\d{4}-\d{2}-Q[12]$/.test(value) || value === '') {
                                    setSelectedQuinzenaInput(value);
                                    if (value.match(/^\d{4}-\d{2}-Q[12]$/)) {
                                        const newDate = convertQuinzenaToDate(value);
                                        setSelectedQuinzenaDate(newDate);
                                        // Explizit Daten neu laden
                                        queueMicrotask(() => {
                                            fetchStatsWithDate(newDate, true);
                                        });
                                    }
                                }
                            }}
                            className="border border-gray-300 dark:border-gray-600 rounded-md text-base sm:text-sm h-8 sm:h-10 px-3 dark:bg-gray-700 dark:text-white w-28"
                            title={t('worktime.stats.quinzenaFormat')}
                        />
                    ) : (
                        <input
                            type="text"
                            pattern="\d{4}-W\d{2}"
                            placeholder="YYYY-Www"
                            value={selectedWeekInput}
                            onChange={(e) => {
                                const value = e.target.value;
                                // Format: YYYY-Www
                                if (/^\d{4}-W\d{1,2}$/.test(value) || value === '') {
                                    setSelectedWeekInput(value);
                                    if (value.match(/^\d{4}-W\d{2}$/)) {
                                        const newDate = convertWeekToDate(value);
                                        setSelectedWeekDate(newDate);
                                        // Explizit Daten neu laden
                                        queueMicrotask(() => {
                                            fetchStatsWithDate(newDate, false);
                                        });
                                    }
                                }
                            }}
                            className="border border-gray-300 dark:border-gray-600 rounded-md text-base sm:text-sm h-8 sm:h-10 px-3 dark:bg-gray-700 dark:text-white w-28"
                            title={t('worktime.stats.weekFormat')}
                        />
                    )}
                    <button
                        onClick={handleExport}
                        className="bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-600 border border-blue-200 dark:border-gray-600 shadow-sm flex items-center justify-center min-w-8 min-h-8 w-8 h-8"
                        title={t('worktime.stats.export')}
                        aria-label={t('worktime.stats.exportTitle')}
                        style={{ marginTop: '1px', marginBottom: '1px' }}
                    >
                        <DocumentArrowDownIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="flex flex-row gap-2 mb-8 overflow-x-auto">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2 whitespace-nowrap text-sm sm:text-base md:text-lg text-center">{t('worktime.stats.totalHours')}</h3>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap text-center">{stats.totalHours}{t('worktime.stats.hourShort')}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-green-900 dark:text-green-100 mb-2 whitespace-nowrap text-sm sm:text-base md:text-lg text-center">{t('worktime.stats.averagePerDay')}</h3>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400 whitespace-nowrap text-center">{stats.averageHoursPerDay}{t('worktime.stats.hourShort')}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-purple-900 dark:text-purple-100 mb-2 whitespace-nowrap text-sm sm:text-base md:text-lg text-center">{t('worktime.stats.workDays')}</h3>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap text-center">{stats.daysWorked}</p>
                </div>
            </div>

            <div className="mt-8">
                <h3 className="text-lg font-medium mb-4 dark:text-white">
                    {useQuinzena ? t('worktime.stats.quinzenaProgress') : t('worktime.stats.weeklyProgress')}
                </h3>
                
                {/* Chart Container */}
                <div className="relative" style={{ height: '200px' }}>
                    {/* Y-Achse Beschriftungen */}
                    <div className="absolute right-0 h-full flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 pr-1">
                        <span>{scaleMax}h</span>
                        <span>{Math.round(scaleMax * 0.75)}h</span>
                        <span>{Math.round(scaleMax * 0.5)}h</span>
                        <span>{Math.round(scaleMax * 0.25)}h</span>
                        <span>0h</span>
                    </div>
                    
                    {/* Horizontale Hilfslinien */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pr-8">
                        <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                        <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                        <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                        <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                        <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                    </div>
                    
                    {/* Sollarbeitszeit-Linie - nur anzeigen wenn sie ins Diagramm passt */}
                    {targetWorkHours <= scaleMax && (
                        <div 
                            className="absolute w-full border-t-2 border-red-600 dark:border-red-500 z-10 pr-8"
                            style={{ 
                                bottom: `${(targetWorkHours / scaleMax) * 100}%`,
                                borderStyle: 'dashed'
                            }}
                        >
                            <span className="absolute -top-3 right-8 text-xs text-red-600 dark:text-red-500 font-medium">
                                {t('worktime.stats.target')}: {targetWorkHours}{t('worktime.stats.hourShort')}
                            </span>
                        </div>
                    )}
                    
                    {/* Legende */}
                    <div className="absolute top-0 left-0 text-xs flex items-center gap-2">
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-600 dark:border-blue-400 rounded-sm mr-1"></div>
                            <span className="text-blue-600 dark:text-blue-400">≤ {targetWorkHours}{t('worktime.stats.hourShort')}</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-red-100 dark:bg-red-900/50 border-2 border-red-600 dark:border-red-400 rounded-sm mr-1"></div>
                            <span className="text-red-600 dark:text-red-400">&gt; {targetWorkHours}{t('worktime.stats.hourShort')}</span>
                        </div>
                    </div>
                    
                    {/* Balken */}
                    <div className="absolute inset-0 pr-8 flex items-end">
                        <div className="w-full h-full flex justify-between">
                            {stats.weeklyData.map((dayData, index) => {
                                // Stellen Sie sicher, dass hours eine Zahl ist
                                const hours = typeof dayData.hours === 'number' ? dayData.hours : parseFloat(dayData.hours);
                                
                                // Berechnung der Höhe für den Teil über der Sollarbeitszeit
                                const overTargetHeight = hours > targetWorkHours 
                                    ? ((hours - targetWorkHours) / scaleMax) * 100 
                                    : 0;
                                
                                // Berechnung der Höhe für den Teil unter der Sollarbeitszeit
                                const normalHeight = Math.min(hours, targetWorkHours) / scaleMax * 100;
                                
                                // Verwende das bereits berechnete Datum aus weeklyData - keine weitere Berechnung notwendig!
                                const formattedDate = dayData.date;
                                
                                // Für Quinzenas: dynamische Breite basierend auf Anzahl der Tage
                                const quinzenaDaysCount = useQuinzena ? getQuinzenaDays(selectedQuinzenaDate).length : 7;
                                const containerWidth = useQuinzena ? `${100 / quinzenaDaysCount}%` : '13%';
                                const barWidth = useQuinzena ? 'w-3/12' : 'w-5/12';
                                
                                return (
                                    <div key={index} className="flex flex-col items-center" style={{ width: containerWidth }}>
                                        <div 
                                            className={`relative ${barWidth} h-full flex flex-col justify-end cursor-pointer`}
                                            title={t('worktime.stats.clickToView')}
                                        >
                                            {/* Teil über der Sollarbeitszeit (rot) */}
                                            {overTargetHeight > 0 && (
                                                <div 
                                                    className="w-full bg-red-100 dark:bg-red-900/50 border-2 border-red-600 dark:border-red-400 hover:bg-red-200 dark:hover:bg-red-900/70 cursor-pointer"
                                                    onClick={() => openWorkTimeModal(formattedDate)}
                                                    style={{ 
                                                        height: `${overTargetHeight}%`,
                                                        minHeight: '2px',
                                                        borderTopLeftRadius: '8px',
                                                        borderTopRightRadius: '8px',
                                                        borderBottomWidth: overTargetHeight > 0 && normalHeight > 0 ? '0' : '2px'
                                                    }}
                                                />
                                            )}
                                            {/* Teil unter der Sollarbeitszeit (blau) */}
                                            {normalHeight > 0 && (
                                                <div 
                                                    className="w-full bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-600 dark:border-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/70 cursor-pointer"
                                                    onClick={() => openWorkTimeModal(formattedDate)}
                                                    style={{ 
                                                        height: `${normalHeight}%`,
                                                        minHeight: hours > 0 ? '4px' : '0',
                                                        borderTopLeftRadius: overTargetHeight > 0 ? '0' : '8px',
                                                        borderTopRightRadius: overTargetHeight > 0 ? '0' : '8px',
                                                        borderBottomLeftRadius: '4px',
                                                        borderBottomRightRadius: '4px',
                                                        borderTopWidth: overTargetHeight > 0 ? '0' : '2px'
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    {/* X-Achse Beschriftungen */}
                    <div className="absolute bottom-0 left-0 right-8 pt-8 flex justify-between pointer-events-none">
                        {stats.weeklyData.map((dayData, index) => {
                            const quinzenaDaysCount = useQuinzena ? getQuinzenaDays(selectedQuinzenaDate).length : 7;
                            const widthPercent = useQuinzena ? `${100 / quinzenaDaysCount}%` : '13%';
                            return (
                                <div key={index} className="flex flex-col items-center" style={{ width: widthPercent }}>
                                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                        {(() => {
                                            // Übersetze deutschen Wochentag vom Backend
                                            const dayLower = dayData.day.toLowerCase();
                                            if (dayLower.includes('montag') || dayLower.includes('mo')) return t('worktime.days.monday').substring(0, 2);
                                            if (dayLower.includes('dienstag') || dayLower.includes('di')) return t('worktime.days.tuesday').substring(0, 2);
                                            if (dayLower.includes('mittwoch') || dayLower.includes('mi')) return t('worktime.days.wednesday').substring(0, 2);
                                            if (dayLower.includes('donnerstag') || dayLower.includes('do')) return t('worktime.days.thursday').substring(0, 2);
                                            if (dayLower.includes('freitag') || dayLower.includes('fr')) return t('worktime.days.friday').substring(0, 2);
                                            if (dayLower.includes('samstag') || dayLower.includes('sa')) return t('worktime.days.saturday').substring(0, 2);
                                            if (dayLower.includes('sonntag') || dayLower.includes('so')) return t('worktime.days.sunday').substring(0, 2);
                                            return dayData.day.substring(0, 2);
                                        })()}
                                    </div>
                                    <div className="text-xs sm:text-sm font-medium dark:text-gray-300">
                                        {dayData.hours.toFixed(1)}{t('worktime.stats.hourShort')}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            
            {/* WorktimeModal */}
            {showWorkTimeModal && (
                <WorktimeModal 
                    isOpen={showWorkTimeModal}
                    onClose={closeWorkTimeModal}
                    selectedDate={selectedDateForModal}
                />
            )}
        </div>
    );
};

// Hilfsfunktion zum Inkrementieren eines Datums im String-Format 'YYYY-MM-DD'
const incrementDateString = (dateString: string, daysToAdd: number): string => {
    // Zerlege das Datum
    const [year, month, day] = dateString.split('-').map(num => parseInt(num));
    
    // Erstelle ein Date-Objekt für diese Berechnung, aber mit Mittag als Uhrzeit
    // um Zeitzonenprobleme zu vermeiden
    const date = new Date(year, month - 1, day, 12, 0, 0);
    
    // Füge die Tage hinzu
    date.setDate(date.getDate() + daysToAdd);
    
    // Formatiere das Datum zurück als 'YYYY-MM-DD'
    return format(date, 'yyyy-MM-dd');
};

export default WorktimeStats; 