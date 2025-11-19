import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../config/axios.ts';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, CheckIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../../config/api.ts';
import { useAuth } from '../../hooks/useAuth.tsx';
import { useSidepane } from '../../contexts/SidepaneContext.tsx';
import { format } from 'date-fns';

interface SwapRequest {
  id: number;
  originalShiftId: number;
  targetShiftId: number;
  requestedBy: number;
  requestedFrom: number;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  responseMessage?: string;
  createdAt: string;
  respondedAt?: string;
  originalShift: {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    shiftTemplate?: {
      name: string;
    };
    branch?: {
      name: string;
    };
    role?: {
      name: string;
    };
    user?: {
      id: number;
      firstName: string;
      lastName: string;
    };
  };
  targetShift: {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    shiftTemplate?: {
      name: string;
    };
    branch?: {
      name: string;
    };
    role?: {
      name: string;
    };
    user?: {
      id: number;
      firstName: string;
      lastName: string;
    };
  };
  requester: {
    id: number;
    firstName: string;
    lastName: string;
  };
  requestee: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

interface SwapRequestListProps {
  isOpen: boolean;
  onClose: () => void;
  onSwapRequestUpdated: () => void;
}

const SwapRequestList = ({ 
  isOpen, 
  onClose,
  onSwapRequestUpdated
}: SwapRequestListProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { openSidepane, closeSidepane } = useSidepane();
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsLargeScreen(window.innerWidth > 1070);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      openSidepane();
      fetchSwapRequests();
    } else {
      closeSidepane();
    }
    
    return () => {
      closeSidepane();
    };
  }, [isOpen, openSidepane, closeSidepane]);

  const fetchSwapRequests = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.SHIFTS.SWAPS.BASE, {
        params: user?.id ? { userId: user.id } : {}
      });
      
      const data = response.data?.data || response.data || [];
      setSwapRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Fehler beim Laden der Tausch-Anfragen:', err);
      setError(err.response?.data?.message || err.message || t('teamWorktime.shifts.swapList.errors.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (swapRequest: SwapRequest) => {
    if (!user) return;
    
    setProcessingId(swapRequest.id);
    setError(null);
    
    try {
      await axiosInstance.put(API_ENDPOINTS.SHIFTS.SWAPS.APPROVE(swapRequest.id), {
        responseMessage: null
      });
      
      await fetchSwapRequests();
      onSwapRequestUpdated();
    } catch (err: any) {
      console.error('Fehler beim Genehmigen der Tausch-Anfrage:', err);
      setError(err.response?.data?.message || err.message || t('teamWorktime.shifts.swapList.errors.approveError'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (swapRequest: SwapRequest) => {
    if (!user) return;
    
    setProcessingId(swapRequest.id);
    setError(null);
    
    try {
      await axiosInstance.put(API_ENDPOINTS.SHIFTS.SWAPS.REJECT(swapRequest.id), {
        responseMessage: null
      });
      
      await fetchSwapRequests();
      onSwapRequestUpdated();
    } catch (err: any) {
      console.error('Fehler beim Ablehnen der Tausch-Anfrage:', err);
      setError(err.response?.data?.message || err.message || t('teamWorktime.shifts.swapList.errors.rejectError'));
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = swapRequests.filter(req => {
    if (filterStatus === 'all') return true;
    return req.status === filterStatus;
  });

  const ownRequests = filteredRequests.filter(req => req.requestedBy === user?.id);
  const receivedRequests = filteredRequests.filter(req => req.requestedFrom === user?.id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return t('teamWorktime.shifts.swapList.status.pending');
      case 'approved':
        return t('teamWorktime.shifts.swapList.status.approved');
      case 'rejected':
        return t('teamWorktime.shifts.swapList.status.rejected');
      default:
        return status;
    }
  };

  const renderSwapRequest = (request: SwapRequest, isReceived: boolean) => (
    <div key={request.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg mb-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
              {getStatusText(request.status)}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {format(new Date(request.createdAt), 'dd.MM.yyyy HH:mm')}
            </span>
          </div>
          
          {isReceived ? (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium">{request.requester.firstName} {request.requester.lastName}</span> {t('teamWorktime.shifts.swapList.wantsToSwap')}
            </p>
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {t('teamWorktime.shifts.swapList.youRequestedSwap')} <span className="font-medium">{request.requestee.firstName} {request.requestee.lastName}</span>
            </p>
          )}
        </div>
      </div>

      {/* Schicht-Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
        {/* Original-Schicht */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">
            {isReceived ? t('teamWorktime.shifts.swapList.theirShift') : t('teamWorktime.shifts.swapList.yourShift')}
          </h4>
          <div className="text-xs text-blue-800 dark:text-blue-400">
            <div>{request.originalShift.shiftTemplate?.name || t('teamWorktime.shifts.swap.form.shift')}</div>
            <div>{format(new Date(request.originalShift.date), 'dd.MM.yyyy')}</div>
            <div>
              {format(new Date(request.originalShift.startTime), 'HH:mm')} - {format(new Date(request.originalShift.endTime), 'HH:mm')}
            </div>
            {request.originalShift.branch && (
              <div>{request.originalShift.branch.name}</div>
            )}
          </div>
        </div>

        {/* Ziel-Schicht */}
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <h4 className="text-xs font-semibold text-green-900 dark:text-green-300 mb-1">
            {isReceived ? t('teamWorktime.shifts.swapList.theirShift') : t('teamWorktime.shifts.swapList.yourShift')}
          </h4>
          <div className="text-xs text-green-800 dark:text-green-400">
            <div>{request.targetShift.shiftTemplate?.name || t('teamWorktime.shifts.swap.form.shift')}</div>
            <div>{format(new Date(request.targetShift.date), 'dd.MM.yyyy')}</div>
            <div>
              {format(new Date(request.targetShift.startTime), 'HH:mm')} - {format(new Date(request.targetShift.endTime), 'HH:mm')}
            </div>
            {request.targetShift.branch && (
              <div>{request.targetShift.branch.name}</div>
            )}
          </div>
        </div>
      </div>

      {/* Nachricht */}
      {request.message && (
        <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300">
          <span className="font-medium">{t('teamWorktime.shifts.swapList.message')}:</span> {request.message}
        </div>
      )}

      {/* Response Message */}
      {request.responseMessage && (
        <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-700 dark:text-blue-300">
          <span className="font-medium">{t('teamWorktime.shifts.swapList.response')}:</span> {request.responseMessage}
        </div>
      )}

      {/* Actions - nur für erhaltene Anfragen mit Status pending */}
      {isReceived && request.status === 'pending' && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => handleApprove(request)}
            disabled={processingId === request.id}
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processingId === request.id ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                {t('teamWorktime.shifts.swapList.approving')}
              </>
            ) : (
              <>
                <CheckIcon className="h-4 w-4" />
                {t('teamWorktime.shifts.swapList.approve')}
              </>
            )}
          </button>
          <button
            onClick={() => handleReject(request)}
            disabled={processingId === request.id}
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processingId === request.id ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                {t('teamWorktime.shifts.swapList.rejecting')}
              </>
            ) : (
              <>
                <XCircleIcon className="h-4 w-4" />
                {t('teamWorktime.shifts.swapList.reject')}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );

  const renderContent = () => (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1 text-sm rounded-md ${
            filterStatus === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          {t('teamWorktime.shifts.swapList.filter.all')}
        </button>
        <button
          onClick={() => setFilterStatus('pending')}
          className={`px-3 py-1 text-sm rounded-md ${
            filterStatus === 'pending'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          {t('teamWorktime.shifts.swapList.filter.pending')}
        </button>
        <button
          onClick={() => setFilterStatus('approved')}
          className={`px-3 py-1 text-sm rounded-md ${
            filterStatus === 'approved'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          {t('teamWorktime.shifts.swapList.filter.approved')}
        </button>
        <button
          onClick={() => setFilterStatus('rejected')}
          className={`px-3 py-1 text-sm rounded-md ${
            filterStatus === 'rejected'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          {t('teamWorktime.shifts.swapList.filter.rejected')}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          {t('common.loading')}
        </div>
      ) : (
        <>
          {/* Erhaltene Anfragen */}
          {receivedRequests.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                {t('teamWorktime.shifts.swapList.receivedRequests')} ({receivedRequests.length})
              </h3>
              {receivedRequests.map(req => renderSwapRequest(req, true))}
            </div>
          )}

          {/* Eigene Anfragen */}
          {ownRequests.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                {t('teamWorktime.shifts.swapList.yourRequests')} ({ownRequests.length})
              </h3>
              {ownRequests.map(req => renderSwapRequest(req, false))}
            </div>
          )}

          {filteredRequests.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {t('teamWorktime.shifts.swapList.noRequests')}
            </div>
          )}
        </>
      )}
    </div>
  );

  // Mobile (unter 640px) - Modal
  if (isMobile) {
    return (
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-lg w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-lg font-semibold dark:text-white">
                  {t('teamWorktime.shifts.swapList.title')}
                </Dialog.Title>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              {renderContent()}
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    );
  }

  // Desktop (ab 640px) - Sidepane
  return (
    <>
      {/* Backdrop - nur wenn offen und <= 1070px */}
      {isOpen && !isLargeScreen && (
        <div 
          className="fixed inset-0 bg-black/10 transition-opacity sidepane-overlay sidepane-backdrop z-40" 
          aria-hidden="true" 
          onClick={onClose}
          style={{
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 300ms ease-out'
          }}
        />
      )}
      
      {/* Sidepane - IMMER gerendert, Position wird via Transform geändert */}
      <div 
        className={`fixed top-16 bottom-0 right-0 max-w-2xl w-full bg-white dark:bg-gray-800 shadow-xl sidepane-panel sidepane-panel-container transform z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          transition: 'transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
        aria-hidden={!isOpen}
        role="dialog"
        aria-modal={isOpen}
      >
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold dark:text-white">
            {t('teamWorktime.shifts.swapList.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          {renderContent()}
        </div>
      </div>
    </>
  );
};

export default SwapRequestList;

