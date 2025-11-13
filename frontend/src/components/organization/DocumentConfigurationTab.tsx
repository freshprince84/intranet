import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DocumentTextIcon, ArrowPathIcon, CheckIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import axiosInstance from '../../config/axios.ts';
import { API_ENDPOINTS } from '../../config/api.ts';
import useMessage from '../../hooks/useMessage.ts';
import { organizationService } from '../../services/organizationService.ts';

interface Organization {
  id: number;
  displayName?: string;
  name?: string;
  settings?: any;
}

interface DocumentConfigurationTabProps {
  organization: Organization | null;
  onSave?: () => void;
}

interface DocumentTemplate {
  id?: number;
  name: string;
  type: 'certificate' | 'contract';
  filePath?: string;
  version?: string;
}

const DocumentConfigurationTab: React.FC<DocumentConfigurationTabProps> = ({
  organization,
  onSave
}) => {
  const { t } = useTranslation();
  const { showMessage } = useMessage();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [templateType, setTemplateType] = useState<'certificate' | 'contract'>('certificate');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (organization) {
      loadTemplates();
    }
  }, [organization]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.ORGANIZATION_LIFECYCLE.DOCUMENT_TEMPLATES);
      const documentTemplates = response.data.documentTemplates || {};
      
      // Konvertiere zu Template-Array
      const templatesList: DocumentTemplate[] = [];
      if (documentTemplates.employmentCertificate) {
        templatesList.push({
          name: 'Arbeitszeugnis',
          type: 'certificate',
          filePath: documentTemplates.employmentCertificate.path,
          version: documentTemplates.employmentCertificate.version
        });
      }
      if (documentTemplates.employmentContract) {
        templatesList.push({
          name: 'Arbeitsvertrag',
          type: 'contract',
          filePath: documentTemplates.employmentContract.path,
          version: documentTemplates.employmentContract.version
        });
      }
      
      setTemplates(templatesList);
    } catch (error: any) {
      console.error('Fehler beim Laden der Templates:', error);
      if (error.response?.status !== 404) {
        showMessage(
          error.response?.data?.message || t('lifecycle.loadTemplatesError', { defaultValue: 'Fehler beim Laden der Templates' }),
          'error'
        );
      }
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Prüfe Dateityp
    if (file.type !== 'application/pdf') {
      showMessage(
        t('lifecycle.onlyPdfAllowed', { defaultValue: 'Nur PDF-Dateien sind erlaubt' }),
        'error'
      );
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', templateType === 'certificate' ? 'employmentCertificate' : 'employmentContract');

      const response = await axiosInstance.post(
        API_ENDPOINTS.ORGANIZATION_LIFECYCLE.UPLOAD_TEMPLATE,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );
      
      showMessage(
        response.data.message || t('lifecycle.templateUploaded', { defaultValue: 'Template erfolgreich hochgeladen' }),
        'success'
      );
      
      // Lade Templates neu
      loadTemplates();
    } catch (error: any) {
      console.error('Fehler beim Hochladen:', error);
      showMessage(
        error.response?.data?.message || t('lifecycle.uploadError', { defaultValue: 'Fehler beim Hochladen' }),
        'error'
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteTemplate = async (templateType: 'certificate' | 'contract') => {
    if (!window.confirm(t('lifecycle.deleteTemplateConfirm', { defaultValue: 'Template wirklich löschen?' }))) {
      return;
    }

    try {
      // Hole aktuelle Organisation
      const orgResponse = await axiosInstance.get(API_ENDPOINTS.ORGANIZATIONS.CURRENT);
      const settings = orgResponse.data.settings || {};
      
      // Entferne Template
      if (settings.documentTemplates) {
        const typeKey = templateType === 'certificate' ? 'employmentCertificate' : 'employmentContract';
        delete settings.documentTemplates[typeKey];
        
        // Aktualisiere Organisation
        await axiosInstance.put(API_ENDPOINTS.ORGANIZATIONS.CURRENT, {
          settings
        });
      }
      
      showMessage(
        t('lifecycle.templateDeleted', { defaultValue: 'Template erfolgreich gelöscht' }),
        'success'
      );
      
      // Lade Templates neu
      loadTemplates();
    } catch (error: any) {
      console.error('Fehler beim Löschen:', error);
      showMessage(
        error.response?.data?.message || t('lifecycle.deleteError', { defaultValue: 'Fehler beim Löschen' }),
        'error'
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center dark:text-white">
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            {t('organization.documentTemplates', { defaultValue: 'Dokumenten-Templates' })}
          </h3>
          <div className="flex items-center space-x-2">
            <select
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value as 'certificate' | 'contract')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="certificate">Arbeitszeugnis</option>
              <option value="contract">Arbeitsvertrag</option>
            </select>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={uploading ? t('common.uploading', { defaultValue: 'Lade hoch...' }) : t('lifecycle.uploadTemplate', { defaultValue: 'Template hochladen' })}
            >
              {uploading ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              ) : (
                <PlusIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
        
        {templates.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>{t('lifecycle.noTemplates', { defaultValue: 'Keine Templates vorhanden' })}</p>
            <p className="text-sm mt-2">{t('lifecycle.uploadFirstTemplate', { defaultValue: 'Laden Sie Ihr erstes Template hoch' })}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.type}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div>
                  <div className="font-medium dark:text-white">{template.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {template.type === 'certificate' 
                      ? t('lifecycle.certificate', { defaultValue: 'Arbeitszeugnis' })
                      : t('lifecycle.contract', { defaultValue: 'Arbeitsvertrag' })}
                    {template.version && ` - Version ${template.version}`}
                  </div>
                  {template.filePath && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {template.filePath}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteTemplate(template.type)}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded-md"
                  title={t('common.delete', { defaultValue: 'Löschen' })}
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center dark:text-white">
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            {t('organization.documentSignatures', { defaultValue: 'Dokumenten-Signaturen' })}
          </h3>
        </div>
        
        <SignatureUploadSection 
          organization={organization}
          onUpload={loadTemplates}
        />
      </div>
      
      <FieldPositionConfiguration 
        organization={organization}
        onSave={onSave}
      />
    </div>
  );
};

interface SignatureUploadSectionProps {
  organization: Organization | null;
  onUpload: () => void;
}

const SignatureUploadSection: React.FC<SignatureUploadSectionProps> = ({
  organization,
  onUpload
}) => {
  const { t } = useTranslation();
  const { showMessage } = useMessage();
  const [signatures, setSignatures] = useState<Array<{
    type: 'certificate' | 'contract';
    signerName: string;
    signerPosition?: string;
    path: string;
    position?: {
      x: number;
      y: number;
      page: number;
    };
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [signatureType, setSignatureType] = useState<'certificate' | 'contract'>('certificate');
  const [signerName, setSignerName] = useState('');
  const [signerPosition, setSignerPosition] = useState('');
  const [positionX, setPositionX] = useState<string>('400');
  const [positionY, setPositionY] = useState<string>('100');
  const [positionPage, setPositionPage] = useState<string>('1');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (organization) {
      loadSignatures();
    }
  }, [organization]);

  const loadSignatures = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.ORGANIZATION_LIFECYCLE.DOCUMENT_SIGNATURES);
      const documentSignatures = response.data.documentSignatures || {};
      
      const signaturesList: Array<{
        type: 'certificate' | 'contract';
        signerName: string;
        signerPosition?: string;
        path: string;
        position?: {
          x: number;
          y: number;
          page: number;
        };
      }> = [];
      
      if (documentSignatures.employmentCertificate) {
        signaturesList.push({
          type: 'certificate',
          signerName: documentSignatures.employmentCertificate.signerName,
          signerPosition: documentSignatures.employmentCertificate.signerPosition,
          path: documentSignatures.employmentCertificate.path,
          position: documentSignatures.employmentCertificate.position
        });
      }
      if (documentSignatures.employmentContract) {
        signaturesList.push({
          type: 'contract',
          signerName: documentSignatures.employmentContract.signerName,
          signerPosition: documentSignatures.employmentContract.signerPosition,
          path: documentSignatures.employmentContract.path,
          position: documentSignatures.employmentContract.position
        });
      }
      
      setSignatures(signaturesList);
    } catch (error: any) {
      console.error('Fehler beim Laden der Signaturen:', error);
      if (error.response?.status !== 404) {
        showMessage(
          error.response?.data?.message || t('lifecycle.loadSignaturesError', { defaultValue: 'Fehler beim Laden der Signaturen' }),
          'error'
        );
      }
      setSignatures([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Prüfe Dateityp
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      showMessage(
        t('lifecycle.onlyImageOrPdfAllowed', { defaultValue: 'Nur Bilder (JPEG, PNG, GIF) oder PDF-Dateien sind erlaubt' }),
        'error'
      );
      return;
    }

    if (!signerName.trim()) {
      showMessage(
        t('lifecycle.signerNameRequired', { defaultValue: 'Name des Unterzeichners ist erforderlich' }),
        'error'
      );
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', signatureType === 'certificate' ? 'employmentCertificate' : 'employmentContract');
      formData.append('signerName', signerName);
      if (signerPosition) {
        formData.append('signerPosition', signerPosition);
      }
      // Positionen hinzufügen
      formData.append('positionX', positionX || '400');
      formData.append('positionY', positionY || '100');
      formData.append('page', positionPage || '1');

      const response = await axiosInstance.post(
        API_ENDPOINTS.ORGANIZATION_LIFECYCLE.UPLOAD_SIGNATURE,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );
      
      showMessage(
        response.data.message || t('lifecycle.signatureUploaded', { defaultValue: 'Signatur erfolgreich hochgeladen' }),
        'success'
      );
      
      // Reset form
      setSignerName('');
      setSignerPosition('');
      setPositionX('400');
      setPositionY('100');
      setPositionPage('1');
      
      // Lade Signaturen neu
      loadSignatures();
      onUpload();
    } catch (error: any) {
      console.error('Fehler beim Hochladen:', error);
      showMessage(
        error.response?.data?.message || t('lifecycle.uploadError', { defaultValue: 'Fehler beim Hochladen' }),
        'error'
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteSignature = async (signatureType: 'certificate' | 'contract') => {
    if (!window.confirm(t('lifecycle.deleteSignatureConfirm', { defaultValue: 'Signatur wirklich löschen?' }))) {
      return;
    }

    try {
      const orgResponse = await axiosInstance.get(API_ENDPOINTS.ORGANIZATIONS.CURRENT);
      const settings = orgResponse.data.settings || {};
      
      if (settings.documentSignatures) {
        const typeKey = signatureType === 'certificate' ? 'employmentCertificate' : 'employmentContract';
        delete settings.documentSignatures[typeKey];
        
        await axiosInstance.put(API_ENDPOINTS.ORGANIZATIONS.CURRENT, {
          settings
        });
      }
      
      showMessage(
        t('lifecycle.signatureDeleted', { defaultValue: 'Signatur erfolgreich gelöscht' }),
        'success'
      );
      
      loadSignatures();
    } catch (error: any) {
      console.error('Fehler beim Löschen:', error);
      showMessage(
        error.response?.data?.message || t('lifecycle.deleteError', { defaultValue: 'Fehler beim Löschen' }),
        'error'
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <ArrowPathIcon className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('lifecycle.signatureType', { defaultValue: 'Signatur-Typ' })}
            </label>
            <select
              value={signatureType}
              onChange={(e) => setSignatureType(e.target.value as 'certificate' | 'contract')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            >
              <option value="certificate">{t('lifecycle.certificate', { defaultValue: 'Arbeitszeugnis' })}</option>
              <option value="contract">{t('lifecycle.contract', { defaultValue: 'Arbeitsvertrag' })}</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('lifecycle.signerName', { defaultValue: 'Name des Unterzeichners' })} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              placeholder={t('lifecycle.signerNamePlaceholder', { defaultValue: 'z.B. Stefan Bossart' })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('lifecycle.signerPosition', { defaultValue: 'Position' })}
            </label>
            <input
              type="text"
              value={signerPosition}
              onChange={(e) => setSignerPosition(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              placeholder={t('lifecycle.signerPositionPlaceholder', { defaultValue: 'z.B. Geschäftsführer' })}
            />
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('lifecycle.signaturePosition', { defaultValue: 'Signatur-Position im PDF' })}
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('lifecycle.positionX', { defaultValue: 'X (horizontal)' })}
                </label>
                <input
                  type="number"
                  value={positionX}
                  onChange={(e) => setPositionX(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
                  placeholder="400"
                  min="0"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('lifecycle.positionXHint', { defaultValue: '0 = links' })}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('lifecycle.positionY', { defaultValue: 'Y (vertikal)' })}
                </label>
                <input
                  type="number"
                  value={positionY}
                  onChange={(e) => setPositionY(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
                  placeholder="100"
                  min="0"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('lifecycle.positionYHint', { defaultValue: '0 = unten' })}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('lifecycle.positionPage', { defaultValue: 'Seite' })}
                </label>
                <input
                  type="number"
                  value={positionPage}
                  onChange={(e) => setPositionPage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
                  placeholder="1"
                  min="1"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('lifecycle.positionPageHint', { defaultValue: 'Seitennummer' })}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {t('lifecycle.signaturePositionHint', { defaultValue: 'Koordinaten in PDF-Punkten (1 Punkt = 1/72 Zoll). A4: 595 x 842 Punkte. Standard: X=400, Y=100, Seite=1' })}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('lifecycle.signatureFile', { defaultValue: 'Signatur-Datei' })} <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !signerName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <span className="flex items-center space-x-2">
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    <span>{t('common.uploading', { defaultValue: 'Lade hoch...' })}</span>
                  </span>
                ) : (
                  t('lifecycle.selectSignatureFile', { defaultValue: 'Datei auswählen' })
                )}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {t('lifecycle.signatureFileHint', { defaultValue: 'JPEG, PNG, GIF oder PDF (max. 5MB)' })}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {signatures.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('lifecycle.uploadedSignatures', { defaultValue: 'Hochgeladene Signaturen' })}
          </h4>
          {signatures.map((signature) => (
            <div
              key={signature.type}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div>
                <div className="font-medium dark:text-white">
                  {signature.type === 'certificate' 
                    ? t('lifecycle.certificate', { defaultValue: 'Arbeitszeugnis' })
                    : t('lifecycle.contract', { defaultValue: 'Arbeitsvertrag' })}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {signature.signerName}
                  {signature.signerPosition && ` - ${signature.signerPosition}`}
                </div>
                {signature.position && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {t('lifecycle.position', { defaultValue: 'Position' })}: X={signature.position.x}, Y={signature.position.y}, {t('lifecycle.page', { defaultValue: 'Seite' })} {signature.position.page}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDeleteSignature(signature.type)}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded-md"
                title={t('common.delete', { defaultValue: 'Löschen' })}
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface FieldPositionConfigurationProps {
  organization: Organization | null;
  onSave?: () => void;
}

const FieldPositionConfiguration: React.FC<FieldPositionConfigurationProps> = ({
  organization,
  onSave
}) => {
  const { t } = useTranslation();
  const { showMessage } = useMessage();
  const [templateType, setTemplateType] = useState<'certificate' | 'contract'>('certificate');
  const [fields, setFields] = useState<Record<string, { x: number; y: number; fontSize?: number }>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Standard-Felder für Certificate und Contract
  const certificateFields = ['userName', 'organizationName', 'currentDate', 'identificationNumber', 'startDate', 'endDate'];
  const contractFields = ['userName', 'organizationName', 'currentDate', 'identificationNumber', 'startDate', 'endDate', 'position', 'salary', 'workingHours'];

  useEffect(() => {
    if (organization) {
      loadFields();
    }
  }, [organization, templateType]);

  const loadFields = async () => {
    try {
      const settings = organization?.settings as any;
      const templateSettings = settings?.documentTemplates?.[templateType === 'certificate' ? 'employmentCertificate' : 'employmentContract'];
      const savedFields = templateSettings?.fields || {};
      
      // Standard-Positionen (A4: 595.28 x 841.89 Punkte)
      // Y-Koordinate: 0 ist unten, 841.89 ist oben (PDF-Koordinatensystem)
      const pageHeight = 841.89;
      const margin = 50;
      const lineHeight = 20;
      let currentY = pageHeight - margin - 30;
      
      // Lade gespeicherte Felder oder verwende Standard-Werte (synchronisiert mit Backend)
      const defaultFields: Record<string, { x: number; y: number; fontSize?: number }> = {};
      const fieldList = templateType === 'certificate' ? certificateFields : contractFields;
      
      // Standard-Positionen (wie im Backend getDefaultFieldPositions)
      const defaultPositions: Record<string, { x: number; y: number; fontSize?: number }> = {
        userName: { x: margin, y: currentY, fontSize: 14 },
        organizationName: { x: margin, y: currentY - lineHeight, fontSize: 12 },
        currentDate: { x: margin, y: currentY - lineHeight * 2, fontSize: 12 },
        identificationNumber: { x: margin, y: currentY - lineHeight * 3, fontSize: 12 },
        startDate: { x: margin, y: currentY - lineHeight * 4, fontSize: 12 },
        endDate: { x: margin, y: currentY - lineHeight * 5, fontSize: 12 }
      };
      
      if (templateType === 'contract') {
        defaultPositions.position = { x: margin, y: currentY - lineHeight * 6, fontSize: 12 };
        defaultPositions.salary = { x: margin, y: currentY - lineHeight * 7, fontSize: 12 };
        defaultPositions.workingHours = { x: margin, y: currentY - lineHeight * 8, fontSize: 12 };
      }
      
      fieldList.forEach((fieldName) => {
        defaultFields[fieldName] = savedFields[fieldName] || defaultPositions[fieldName] || {
          x: margin,
          y: currentY,
          fontSize: fieldName === 'userName' ? 14 : 12
        };
      });
      
      setFields(defaultFields);
    } catch (error) {
      console.error('Fehler beim Laden der Felder:', error);
    }
  };

  const handleFieldChange = (fieldName: string, property: 'x' | 'y' | 'fontSize', value: string) => {
    setFields(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        [property]: property === 'fontSize' ? parseFloat(value) || 12 : parseFloat(value) || 0
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const orgResponse = await axiosInstance.get(API_ENDPOINTS.ORGANIZATIONS.CURRENT);
      const currentSettings = orgResponse.data.settings || {};
      
      if (!currentSettings.documentTemplates) {
        currentSettings.documentTemplates = {};
      }
      
      const typeKey = templateType === 'certificate' ? 'employmentCertificate' : 'employmentContract';
      if (!currentSettings.documentTemplates[typeKey]) {
        currentSettings.documentTemplates[typeKey] = {};
      }
      
      currentSettings.documentTemplates[typeKey].fields = fields;
      
      await organizationService.updateOrganization({
        settings: currentSettings
      });
      
      showMessage(
        t('lifecycle.fieldPositionsSaved', { defaultValue: 'Feld-Positionen erfolgreich gespeichert' }),
        'success'
      );
      
      if (onSave) {
        onSave();
      }
    } catch (error: any) {
      console.error('Fehler beim Speichern:', error);
      showMessage(
        error.response?.data?.message || t('lifecycle.saveError', { defaultValue: 'Fehler beim Speichern' }),
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm(t('lifecycle.resetFieldPositionsConfirm', { defaultValue: 'Positionen auf Standardwerte zurücksetzen?' }))) {
      // Setze Felder auf Standard-Werte zurück
      const pageHeight = 841.89;
      const margin = 50;
      const lineHeight = 20;
      let currentY = pageHeight - margin - 30;
      
      const defaultPositions: Record<string, { x: number; y: number; fontSize?: number }> = {
        userName: { x: margin, y: currentY, fontSize: 14 },
        organizationName: { x: margin, y: currentY - lineHeight, fontSize: 12 },
        currentDate: { x: margin, y: currentY - lineHeight * 2, fontSize: 12 },
        identificationNumber: { x: margin, y: currentY - lineHeight * 3, fontSize: 12 },
        startDate: { x: margin, y: currentY - lineHeight * 4, fontSize: 12 },
        endDate: { x: margin, y: currentY - lineHeight * 5, fontSize: 12 }
      };
      
      if (templateType === 'contract') {
        defaultPositions.position = { x: margin, y: currentY - lineHeight * 6, fontSize: 12 };
        defaultPositions.salary = { x: margin, y: currentY - lineHeight * 7, fontSize: 12 };
        defaultPositions.workingHours = { x: margin, y: currentY - lineHeight * 8, fontSize: 12 };
      }
      
      const fieldList = templateType === 'certificate' ? certificateFields : contractFields;
      const resetFields: Record<string, { x: number; y: number; fontSize?: number }> = {};
      
      fieldList.forEach((fieldName) => {
        resetFields[fieldName] = defaultPositions[fieldName] || {
          x: margin,
          y: currentY,
          fontSize: fieldName === 'userName' ? 14 : 12
        };
      });
      
      setFields(resetFields);
    }
  };

  const fieldList = templateType === 'certificate' ? certificateFields : contractFields;
  const fieldLabels: Record<string, string> = {
    userName: t('lifecycle.fieldUserName', { defaultValue: 'Benutzername' }),
    organizationName: t('lifecycle.fieldOrganizationName', { defaultValue: 'Organisationsname' }),
    currentDate: t('lifecycle.fieldCurrentDate', { defaultValue: 'Aktuelles Datum' }),
    identificationNumber: t('lifecycle.fieldIdentificationNumber', { defaultValue: 'Ausweisnummer' }),
    startDate: t('lifecycle.fieldStartDate', { defaultValue: 'Startdatum' }),
    endDate: t('lifecycle.fieldEndDate', { defaultValue: 'Enddatum' }),
    position: t('lifecycle.fieldPosition', { defaultValue: 'Position' }),
    salary: t('lifecycle.fieldSalary', { defaultValue: 'Gehalt' }),
    workingHours: t('lifecycle.fieldWorkingHours', { defaultValue: 'Arbeitsstunden' })
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold dark:text-white">
          {t('organization.fieldPositions', { defaultValue: 'Feld-Positionen konfigurieren' })}
        </h3>
        <div className="flex items-center space-x-2">
          <select
            value={templateType}
            onChange={(e) => setTemplateType(e.target.value as 'certificate' | 'contract')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
          >
            <option value="certificate">{t('lifecycle.certificate', { defaultValue: 'Certificado Laboral' })}</option>
            <option value="contract">{t('lifecycle.contract', { defaultValue: 'Contrato de Trabajo' })}</option>
          </select>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">
            {t('lifecycle.fieldPositionsInfo', { defaultValue: 'Konfigurieren Sie die Positionen der Felder im Template-PDF.' })}
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            {t('lifecycle.fieldPositionsHint', { defaultValue: 'Koordinaten in PDF-Punkten. A4: 595 x 842 Punkte. Y=0 ist unten, Y=842 ist oben. X=0 ist links, X=595 ist rechts.' })}
          </p>
        </div>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {fieldList.map((fieldName) => (
            <div key={fieldName} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="font-medium text-sm dark:text-white mb-2">
                {fieldLabels[fieldName] || fieldName}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    X
                  </label>
                  <input
                    type="number"
                    value={fields[fieldName]?.x || 0}
                    onChange={(e) => handleFieldChange(fieldName, 'x', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Y
                  </label>
                  <input
                    type="number"
                    value={fields[fieldName]?.y || 0}
                    onChange={(e) => handleFieldChange(fieldName, 'y', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    {t('lifecycle.fontSize', { defaultValue: 'Schriftgröße' })}
                  </label>
                  <input
                    type="number"
                    value={fields[fieldName]?.fontSize || 12}
                    onChange={(e) => handleFieldChange(fieldName, 'fontSize', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
                    min="8"
                    max="72"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleReset}
            className="p-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
            title={t('common.reset', { defaultValue: 'Zurücksetzen' })}
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-700 dark:hover:bg-blue-800"
            title={saving ? t('common.saving', { defaultValue: 'Speichern...' }) : t('common.save', { defaultValue: 'Speichern' })}
          >
            {saving ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              <CheckIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentConfigurationTab;

