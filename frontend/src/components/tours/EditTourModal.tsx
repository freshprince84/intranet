import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../config/axios.ts';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS, getTourImageUrl, getTourGalleryImageUrl } from '../../config/api.ts';
import { useAuth } from '../../hooks/useAuth.tsx';
import { Tour, TourType, TourProvider } from '../../types/tour.ts';
import useMessage from '../../hooks/useMessage.ts';

interface Branch {
    id: number;
    name: string;
}

interface EditTourModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTourUpdated: (updatedTour: Tour) => void;
    tour: Tour | null;
}

const EditTourModal = ({ isOpen, onClose, onTourUpdated, tour }: EditTourModalProps) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { showMessage } = useMessage();
    
    const [title, setTitle] = useState(tour?.title || '');
    const [description, setDescription] = useState(tour?.description || '');
    const [type, setType] = useState<TourType>(tour?.type || TourType.OWN);
    const [isActive, setIsActive] = useState(tour?.isActive ?? true);
    const [duration, setDuration] = useState<number | ''>(tour?.duration || '');
    const [maxParticipants, setMaxParticipants] = useState<number | ''>(tour?.maxParticipants || '');
    const [minParticipants, setMinParticipants] = useState<number | ''>(tour?.minParticipants || '');
    const [price, setPrice] = useState<number | ''>(tour?.price ? (typeof tour.price === 'string' ? parseFloat(tour.price) : tour.price) : '');
    const [currency, setCurrency] = useState(tour?.currency || 'COP');
    const [location, setLocation] = useState(tour?.location || '');
    const [meetingPoint, setMeetingPoint] = useState(tour?.meetingPoint || '');
    const [includes, setIncludes] = useState(tour?.includes || '');
    const [excludes, setExcludes] = useState(tour?.excludes || '');
    const [requirements, setRequirements] = useState(tour?.requirements || '');
    const [totalCommission, setTotalCommission] = useState<number | ''>(tour?.totalCommission ? (typeof tour.totalCommission === 'string' ? parseFloat(tour.totalCommission) : tour.totalCommission) : '');
    const [totalCommissionPercent, setTotalCommissionPercent] = useState<number | ''>(tour?.totalCommissionPercent ? (typeof tour.totalCommissionPercent === 'string' ? parseFloat(tour.totalCommissionPercent) : tour.totalCommissionPercent) : '');
    const [sellerCommissionPercent, setSellerCommissionPercent] = useState<number | ''>(tour?.sellerCommissionPercent ? (typeof tour.sellerCommissionPercent === 'string' ? parseFloat(tour.sellerCommissionPercent) : tour.sellerCommissionPercent) : '');
    const [sellerCommissionFixed, setSellerCommissionFixed] = useState<number | ''>(tour?.sellerCommissionFixed ? (typeof tour.sellerCommissionFixed === 'string' ? parseFloat(tour.sellerCommissionFixed) : tour.sellerCommissionFixed) : '');
    const [externalProviderId, setExternalProviderId] = useState<number | ''>(tour?.externalProviderId || '');
    const [externalBookingUrl, setExternalBookingUrl] = useState(tour?.externalBookingUrl || '');
    const [branchId, setBranchId] = useState<number | ''>(tour?.branchId || '');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(tour?.imageUrl ? getTourImageUrl(tour.id) : null);
    const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
    const [galleryPreviews, setGalleryPreviews] = useState<string[]>(tour?.galleryUrls?.map((url, index) => getTourGalleryImageUrl(tour.id, index)) || []);
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

    // Update form when tour changes
    useEffect(() => {
        if (tour) {
            setTitle(tour.title || '');
            setDescription(tour.description || '');
            setType(tour.type || TourType.OWN);
            setIsActive(tour.isActive ?? true);
            setDuration(tour.duration || '');
            setMaxParticipants(tour.maxParticipants || '');
            setMinParticipants(tour.minParticipants || '');
            setPrice(tour.price ? (typeof tour.price === 'string' ? parseFloat(tour.price) : tour.price) : '');
            setCurrency(tour.currency || 'COP');
            setLocation(tour.location || '');
            setMeetingPoint(tour.meetingPoint || '');
            setIncludes(tour.includes || '');
            setExcludes(tour.excludes || '');
            setRequirements(tour.requirements || '');
            setTotalCommission(tour.totalCommission ? (typeof tour.totalCommission === 'string' ? parseFloat(tour.totalCommission) : tour.totalCommission) : '');
            setTotalCommissionPercent(tour.totalCommissionPercent ? (typeof tour.totalCommissionPercent === 'string' ? parseFloat(tour.totalCommissionPercent) : tour.totalCommissionPercent) : '');
            setSellerCommissionPercent(tour.sellerCommissionPercent ? (typeof tour.sellerCommissionPercent === 'string' ? parseFloat(tour.sellerCommissionPercent) : tour.sellerCommissionPercent) : '');
            setSellerCommissionFixed(tour.sellerCommissionFixed ? (typeof tour.sellerCommissionFixed === 'string' ? parseFloat(tour.sellerCommissionFixed) : tour.sellerCommissionFixed) : '');
            setExternalProviderId(tour.externalProviderId || '');
            setExternalBookingUrl(tour.externalBookingUrl || '');
            setBranchId(tour.branchId || '');
            setImagePreview(tour.imageUrl ? getTourImageUrl(tour.id) : null);
            setGalleryPreviews(tour.galleryUrls?.map((url, index) => getTourGalleryImageUrl(tour.id, index)) || []);
        }
    }, [tour]);
    
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
    
    const removeMainImage = async () => {
        if (!tour?.imageUrl) return;
        
        try {
            await axiosInstance.delete(API_ENDPOINTS.TOURS.DELETE_IMAGE(tour.id));
            // Lade Tour neu
            const response = await axiosInstance.get(API_ENDPOINTS.TOURS.BY_ID(tour.id));
            if (response.data.success) {
                onTourUpdated(response.data.data);
                setImagePreview(null);
                setImageFile(null);
                showMessage(t('tours.imageDeleted', 'Hauptbild erfolgreich gelöscht'), 'success');
            }
        } catch (err: any) {
            console.error('Fehler beim Löschen des Hauptbildes:', err);
            showMessage(err.response?.data?.message || t('errors.deleteError'), 'error');
        }
    };
    
    const removeGalleryImage = async (index: number) => {
        // Wenn es ein existierendes Bild ist (aus tour.galleryUrls), lösche es vom Server
        const currentGallery = tour.galleryUrls || [];
        if (index < currentGallery.length) {
            try {
                await axiosInstance.delete(API_ENDPOINTS.TOURS.DELETE_GALLERY_IMAGE(tour.id, index));
                // Lade Tour neu
                const response = await axiosInstance.get(API_ENDPOINTS.TOURS.BY_ID(tour.id));
                if (response.data.success) {
                    onTourUpdated(response.data.data);
                }
            } catch (err: any) {
                console.error('Fehler beim Löschen des Galerie-Bildes:', err);
                showMessage(err.response?.data?.message || t('errors.deleteError'), 'error');
            }
        } else {
            // Wenn es ein neues Bild ist (noch nicht hochgeladen), entferne es nur aus dem State
            const newIndex = index - currentGallery.length;
            setGalleryFiles(prev => prev.filter((_, i) => i !== newIndex));
            setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validierungen
        if (!title.trim() || title.trim().length < 3) {
            setError(t('tours.validation.titleMinLength', { defaultValue: 'Titel muss mindestens 3 Zeichen lang sein' }));
            return;
        }

        const maxPart = maxParticipants ? Number(maxParticipants) : null;
        const minPart = minParticipants ? Number(minParticipants) : null;
        if (maxPart !== null && minPart !== null && maxPart < minPart) {
            setError(t('tours.validation.maxParticipantsMin', { defaultValue: 'Maximale Teilnehmeranzahl muss >= minimale Teilnehmeranzahl sein' }));
            return;
        }

        if (type === TourType.EXTERNAL && !externalProviderId) {
            setError(t('tours.validation.externalProviderRequired', { defaultValue: 'Externer Anbieter ist bei externen Touren erforderlich' }));
            return;
        }

        // Preise >= 0
        if (price !== '' && Number(price) < 0) {
            setError(t('tours.validation.priceNonNegative', { defaultValue: 'Preis muss >= 0 sein' }));
            return;
        }

        if (totalCommission !== '' && Number(totalCommission) < 0) {
            setError(t('tours.validation.commissionNonNegative', { defaultValue: 'Kommission muss >= 0 sein' }));
            return;
        }

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

            const response = await axiosInstance.put(API_ENDPOINTS.TOURS.BY_ID(tour.id), tourData);
            
            if (response.data.success) {
                const updatedTour = response.data.data;
                
                // Hauptbild hochladen (falls geändert)
                if (imageFile) {
                    try {
                        setUploadingImage(true);
                        const formData = new FormData();
                        formData.append('image', imageFile);
                        await axiosInstance.post(API_ENDPOINTS.TOURS.UPLOAD_IMAGE(tour.id), formData, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });
                    } catch (imgErr: any) {
                        console.error('Fehler beim Hochladen des Hauptbildes:', imgErr);
                        showMessage(t('tours.imageUploadError', 'Tour aktualisiert, aber Fehler beim Hochladen des Bildes'), 'warning');
                    } finally {
                        setUploadingImage(false);
                    }
                }
                
                // Neue Galerie-Bilder hochladen (falls vorhanden)
                if (galleryFiles.length > 0) {
                    try {
                        setUploadingImage(true);
                        for (const file of galleryFiles) {
                            const formData = new FormData();
                            formData.append('image', file);
                            await axiosInstance.post(API_ENDPOINTS.TOURS.UPLOAD_GALLERY(tour.id), formData, {
                                headers: { 'Content-Type': 'multipart/form-data' }
                            });
                        }
                    } catch (galleryErr: any) {
                        console.error('Fehler beim Hochladen der Galerie-Bilder:', galleryErr);
                        showMessage(t('tours.galleryUploadError', 'Tour aktualisiert, aber Fehler beim Hochladen der Galerie-Bilder'), 'warning');
                    } finally {
                        setUploadingImage(false);
                    }
                }
                
                showMessage(t('tours.updateSuccess', 'Tour erfolgreich aktualisiert'), 'success');
                // Lade Tour neu, um aktualisierte Bilder zu erhalten
                const updatedResponse = await axiosInstance.get(API_ENDPOINTS.TOURS.BY_ID(tour.id));
                onTourUpdated(updatedResponse.data.data);
                onClose();
            } else {
                setError(response.data.message || t('errors.saveError'));
            }
        } catch (err: any) {
            console.error('Fehler beim Aktualisieren der Tour:', err);
            const errorMessage = err.response?.data?.message || t('errors.saveError');
            setError(errorMessage);
            showMessage(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !tour) return null;

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-4xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
                            {t('tours.edit', 'Tour bearbeiten')}
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

                        {/* Bild-Upload */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                {t('tours.images', 'Bilder')}
                            </h3>
                            
                            {/* Hauptbild */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('tours.mainImage', 'Hauptbild')}
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                                {imagePreview && (
                                    <div className="mt-2 relative inline-block">
                                        <img
                                            src={imagePreview}
                                            alt="Vorschau"
                                            className="max-w-xs h-48 object-cover rounded-md border border-gray-300 dark:border-gray-600"
                                        />
                                        {tour?.imageUrl && (
                                            <button
                                                type="button"
                                                onClick={removeMainImage}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 z-10 shadow-lg"
                                                title={t('tours.deleteImage', 'Hauptbild löschen')}
                                            >
                                                <XMarkIcon className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {/* Galerie */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('tours.gallery', 'Galerie')}
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleGalleryChange}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                                {galleryPreviews.length > 0 && (
                                    <div className="mt-2 grid grid-cols-3 gap-2">
                                        {galleryPreviews.map((preview, index) => (
                                            <div key={index} className="relative">
                                                <img
                                                    src={preview}
                                                    alt={`Galerie ${index + 1}`}
                                                    className="w-full h-32 object-cover rounded-md border border-gray-300 dark:border-gray-600"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeGalleryImage(index)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                                >
                                                    <XMarkIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                                title={t('common.cancel', 'Abbrechen')}
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                            <button
                                type="submit"
                                disabled={loading || loadingData || uploadingImage}
                                className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
                                title={loading ? t('common.saving', 'Speichere...') : t('common.save', 'Speichern')}
                            >
                                <CheckIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default EditTourModal;

