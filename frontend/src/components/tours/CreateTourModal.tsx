import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../config/axios.ts';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../../config/api.ts';
import { useAuth } from '../../hooks/useAuth.tsx';
import { Tour, TourType, TourProvider } from '../../types/tour.ts';
import useMessage from '../../hooks/useMessage.ts';

interface Branch {
    id: number;
    name: string;
}

interface CreateTourModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTourCreated: (newTour: Tour) => void;
}

const CreateTourModal = ({ isOpen, onClose, onTourCreated }: CreateTourModalProps) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { showMessage } = useMessage();
    
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<TourType>(TourType.OWN);
    const [isActive, setIsActive] = useState(true);
    const [duration, setDuration] = useState<number | ''>('');
    const [maxParticipants, setMaxParticipants] = useState<number | ''>('');
    const [minParticipants, setMinParticipants] = useState<number | ''>('');
    const [price, setPrice] = useState<number | ''>('');
    const [currency, setCurrency] = useState('COP');
    const [location, setLocation] = useState('');
    const [meetingPoint, setMeetingPoint] = useState('');
    const [includes, setIncludes] = useState('');
    const [excludes, setExcludes] = useState('');
    const [requirements, setRequirements] = useState('');
    const [totalCommission, setTotalCommission] = useState<number | ''>('');
    const [totalCommissionPercent, setTotalCommissionPercent] = useState<number | ''>('');
    const [sellerCommissionPercent, setSellerCommissionPercent] = useState<number | ''>('');
    const [sellerCommissionFixed, setSellerCommissionFixed] = useState<number | ''>('');
    const [externalProviderId, setExternalProviderId] = useState<number | ''>('');
    const [externalBookingUrl, setExternalBookingUrl] = useState('');
    const [branchId, setBranchId] = useState<number | ''>('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
    const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
    const [uploadingImage, setUploadingImage] = useState(false);
    
    const [branches, setBranches] = useState<Branch[]>([]);
    const [tourProviders, setTourProviders] = useState<TourProvider[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);

    // Lade Branches und TourProviders
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoadingData(true);
                const [branchesRes, providersRes] = await Promise.all([
                    axiosInstance.get(API_ENDPOINTS.BRANCHES.BASE),
                    axiosInstance.get(API_ENDPOINTS.TOUR_PROVIDERS?.BASE || '/api/tour-providers')
                ]);
                
                setBranches(branchesRes.data?.data || branchesRes.data || []);
                setTourProviders(providersRes.data?.data || providersRes.data || []);
            } catch (err: any) {
                console.error('Fehler beim Laden der Daten:', err);
                showMessage(t('errors.loadError'), 'error');
            } finally {
                setLoadingData(false);
            }
        };
        
        if (isOpen) {
            loadData();
        }
    }, [isOpen, t, showMessage]);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setTitle('');
            setDescription('');
            setType(TourType.OWN);
            setIsActive(true);
            setDuration('');
            setMaxParticipants('');
            setMinParticipants('');
            setPrice('');
            setCurrency('COP');
            setLocation('');
            setMeetingPoint('');
            setIncludes('');
            setExcludes('');
            setRequirements('');
            setTotalCommission('');
            setTotalCommissionPercent('');
            setSellerCommissionPercent('');
            setSellerCommissionFixed('');
            setExternalProviderId('');
            setExternalBookingUrl('');
            setBranchId('');
            setImageFile(null);
            setImagePreview(null);
            setGalleryFiles([]);
            setGalleryPreviews([]);
            setError(null);
        }
    }, [isOpen]);
    
    // Bild-Vorschau erstellen
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setGalleryFiles(prev => [...prev, ...files]);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setGalleryPreviews(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
    };
    
    const removeGalleryImage = (index: number) => {
        setGalleryFiles(prev => prev.filter((_, i) => i !== index));
        setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const tourData: any = {
                title,
                description: description || null,
                type,
                isActive,
                duration: duration ? Number(duration) : null,
                maxParticipants: maxParticipants ? Number(maxParticipants) : null,
                minParticipants: minParticipants ? Number(minParticipants) : null,
                price: price ? Number(price) : null,
                currency: currency || 'COP',
                location: location || null,
                meetingPoint: meetingPoint || null,
                includes: includes || null,
                excludes: excludes || null,
                requirements: requirements || null,
                totalCommission: totalCommission ? Number(totalCommission) : null,
                totalCommissionPercent: totalCommissionPercent ? Number(totalCommissionPercent) : null,
                sellerCommissionPercent: sellerCommissionPercent ? Number(sellerCommissionPercent) : null,
                sellerCommissionFixed: sellerCommissionFixed ? Number(sellerCommissionFixed) : null,
                externalProviderId: externalProviderId ? Number(externalProviderId) : null,
                externalBookingUrl: externalBookingUrl || null,
                branchId: branchId ? Number(branchId) : null
            };

            const response = await axiosInstance.post(API_ENDPOINTS.TOURS.BASE, tourData);
            
            if (response.data.success) {
                const createdTour = response.data.data;
                
                // Hauptbild hochladen (falls vorhanden)
                if (imageFile && createdTour.id) {
                    try {
                        setUploadingImage(true);
                        const formData = new FormData();
                        formData.append('image', imageFile);
                        await axiosInstance.post(API_ENDPOINTS.TOURS.UPLOAD_IMAGE(createdTour.id), formData, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });
                    } catch (imgErr: any) {
                        console.error('Fehler beim Hochladen des Hauptbildes:', imgErr);
                        showMessage(t('tours.imageUploadError', 'Tour erstellt, aber Fehler beim Hochladen des Bildes'), 'warning');
                    } finally {
                        setUploadingImage(false);
                    }
                }
                
                // Galerie-Bilder hochladen (falls vorhanden)
                if (galleryFiles.length > 0 && createdTour.id) {
                    try {
                        setUploadingImage(true);
                        for (const file of galleryFiles) {
                            const formData = new FormData();
                            formData.append('image', file);
                            await axiosInstance.post(API_ENDPOINTS.TOURS.UPLOAD_GALLERY(createdTour.id), formData, {
                                headers: { 'Content-Type': 'multipart/form-data' }
                            });
                        }
                    } catch (galleryErr: any) {
                        console.error('Fehler beim Hochladen der Galerie-Bilder:', galleryErr);
                        showMessage(t('tours.galleryUploadError', 'Tour erstellt, aber Fehler beim Hochladen der Galerie-Bilder'), 'warning');
                    } finally {
                        setUploadingImage(false);
                    }
                }
                
                showMessage(t('tours.createSuccess', 'Tour erfolgreich erstellt'), 'success');
                // Lade Tour neu, um Bilder zu erhalten
                const updatedResponse = await axiosInstance.get(API_ENDPOINTS.TOURS.BY_ID(createdTour.id));
                onTourCreated(updatedResponse.data.data);
                onClose();
            } else {
                setError(response.data.message || t('errors.saveError'));
            }
        } catch (err: any) {
            console.error('Fehler beim Erstellen der Tour:', err);
            const errorMessage = err.response?.data?.message || t('errors.saveError');
            setError(errorMessage);
            showMessage(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-4xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
                            {t('tours.create', 'Neue Tour erstellen')}
                        </Dialog.Title>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        {/* Grundinformationen */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                {t('tours.basicInfo', 'Grundinformationen')}
                            </h3>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('tours.name', 'Titel')} *
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('tours.description', 'Beschreibung')}
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('tours.type', 'Typ')} *
                                    </label>
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value as TourType)}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value={TourType.OWN}>{t('tours.typeOwn', 'Eigene Tour')}</option>
                                        <option value={TourType.EXTERNAL}>{t('tours.typeExternal', 'Externe Tour')}</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('tours.status', 'Status')}
                                    </label>
                                    <select
                                        value={isActive ? 'true' : 'false'}
                                        onChange={(e) => setIsActive(e.target.value === 'true')}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="true">{t('tours.statusActive', 'Aktiv')}</option>
                                        <option value="false">{t('tours.statusInactive', 'Inaktiv')}</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('tours.branch', 'Niederlassung')}
                                </label>
                                <select
                                    value={branchId}
                                    onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : '')}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="">{t('common.all', 'Alle')}</option>
                                    {branches.map(branch => (
                                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Tour-Details */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                {t('tours.details', 'Tour-Details')}
                            </h3>
                            
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('tours.duration', 'Dauer (Stunden)')}
                                    </label>
                                    <input
                                        type="number"
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : '')}
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('tours.minParticipants', 'Min. Teilnehmer')}
                                    </label>
                                    <input
                                        type="number"
                                        value={minParticipants}
                                        onChange={(e) => setMinParticipants(e.target.value ? Number(e.target.value) : '')}
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('tours.maxParticipants', 'Max. Teilnehmer')}
                                    </label>
                                    <input
                                        type="number"
                                        value={maxParticipants}
                                        onChange={(e) => setMaxParticipants(e.target.value ? Number(e.target.value) : '')}
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('tours.price', 'Preis')}
                                    </label>
                                    <input
                                        type="number"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                                        min="0"
                                        step="0.01"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('tours.currency', 'Währung')}
                                    </label>
                                    <input
                                        type="text"
                                        value={currency}
                                        onChange={(e) => setCurrency(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('tours.location', 'Ort')}
                                </label>
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('tours.meetingPoint', 'Treffpunkt')}
                                </label>
                                <input
                                    type="text"
                                    value={meetingPoint}
                                    onChange={(e) => setMeetingPoint(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Externe Tour-Informationen */}
                        {type === TourType.EXTERNAL && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                    {t('tours.externalInfo', 'Externe Tour-Informationen')}
                                </h3>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('tours.externalProvider', 'Externer Anbieter')}
                                    </label>
                                    <select
                                        value={externalProviderId}
                                        onChange={(e) => setExternalProviderId(e.target.value ? Number(e.target.value) : '')}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="">{t('common.select', 'Auswählen')}</option>
                                        {tourProviders.map(provider => (
                                            <option key={provider.id} value={provider.id}>{provider.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('tours.externalBookingUrl', 'Externe Buchungs-URL')}
                                    </label>
                                    <input
                                        type="url"
                                        value={externalBookingUrl}
                                        onChange={(e) => setExternalBookingUrl(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Kommissionen */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                {t('tours.commissions', 'Kommissionen')}
                            </h3>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('tours.totalCommission', 'Gesamtkommission')}
                                    </label>
                                    <input
                                        type="number"
                                        value={totalCommission}
                                        onChange={(e) => setTotalCommission(e.target.value ? Number(e.target.value) : '')}
                                        min="0"
                                        step="0.01"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('tours.totalCommissionPercent', 'Gesamtkommission (%)')}
                                    </label>
                                    <input
                                        type="number"
                                        value={totalCommissionPercent}
                                        onChange={(e) => setTotalCommissionPercent(e.target.value ? Number(e.target.value) : '')}
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('tours.sellerCommissionPercent', 'Verkäufer-Kommission (%)')}
                                    </label>
                                    <input
                                        type="number"
                                        value={sellerCommissionPercent}
                                        onChange={(e) => setSellerCommissionPercent(e.target.value ? Number(e.target.value) : '')}
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('tours.sellerCommissionFixed', 'Verkäufer-Kommission (Fix)')}
                                    </label>
                                    <input
                                        type="number"
                                        value={sellerCommissionFixed}
                                        onChange={(e) => setSellerCommissionFixed(e.target.value ? Number(e.target.value) : '')}
                                        min="0"
                                        step="0.01"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Zusätzliche Informationen */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                {t('tours.additionalInfo', 'Zusätzliche Informationen')}
                            </h3>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('tours.includes', 'Enthält')}
                                </label>
                                <textarea
                                    value={includes}
                                    onChange={(e) => setIncludes(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('tours.excludes', 'Nicht enthalten')}
                                </label>
                                <textarea
                                    value={excludes}
                                    onChange={(e) => setExcludes(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('tours.requirements', 'Anforderungen')}
                                </label>
                                <textarea
                                    value={requirements}
                                    onChange={(e) => setRequirements(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                            >
                                {t('common.cancel', 'Abbrechen')}
                            </button>
                            <button
                                type="submit"
                                disabled={loading || loadingData}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? t('common.saving', 'Speichere...') : t('common.save', 'Speichern')}
                            </button>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default CreateTourModal;

