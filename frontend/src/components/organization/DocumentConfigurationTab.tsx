import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DocumentTextIcon, ArrowPathIcon, CheckIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import axiosInstance from '../../config/axios.ts';
import useMessage from '../../hooks/useMessage.ts';

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
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (organization) {
      loadTemplates();
    }
  }, [organization]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      // TODO: Endpoint implementieren wenn Backend bereit ist
      // const response = await axiosInstance.get('/organizations/current/document-templates');
      // setTemplates(response.data.templates || []);
      
      // Temporär: Leere Liste
      setTemplates([]);
    } catch (error: any) {
      console.error('Fehler beim Laden der Templates:', error);
      if (error.response?.status !== 404) {
        showMessage(
          error.response?.data?.message || t('lifecycle.loadTemplatesError') || 'Fehler beim Laden der Templates',
          'error'
        );
      }
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
        t('lifecycle.onlyPdfAllowed') || 'Nur PDF-Dateien sind erlaubt',
        'error'
      );
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'certificate'); // TODO: Aus UI auswählbar machen

      // TODO: Endpoint implementieren wenn Backend bereit ist
      // const response = await axiosInstance.post('/organizations/current/document-templates', formData, {
      //   headers: { 'Content-Type': 'multipart/form-data' }
      // });
      
      // Temporär: Simuliere Upload
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showMessage(
        t('lifecycle.templateUploaded') || 'Template erfolgreich hochgeladen',
        'success'
      );
      
      // Lade Templates neu
      loadTemplates();
    } catch (error: any) {
      console.error('Fehler beim Hochladen:', error);
      showMessage(
        error.response?.data?.message || t('lifecycle.uploadError') || 'Fehler beim Hochladen',
        'error'
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (!window.confirm(t('lifecycle.deleteTemplateConfirm') || 'Template wirklich löschen?')) {
      return;
    }

    try {
      // TODO: Endpoint implementieren wenn Backend bereit ist
      // await axiosInstance.delete(`/organizations/current/document-templates/${templateId}`);
      
      showMessage(
        t('lifecycle.templateDeleted') || 'Template erfolgreich gelöscht',
        'success'
      );
      
      // Lade Templates neu
      loadTemplates();
    } catch (error: any) {
      console.error('Fehler beim Löschen:', error);
      showMessage(
        error.response?.data?.message || t('lifecycle.deleteError') || 'Fehler beim Löschen',
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
            {t('organization.documentTemplates') || 'Dokumenten-Templates'}
          </h3>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={uploading ? (t('common.uploading') || 'Lade hoch...') : (t('lifecycle.uploadTemplate') || 'Template hochladen')}
          >
            {uploading ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              <PlusIcon className="h-5 w-5" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
        
        {/* Hinweis: Template-System noch nicht vollständig implementiert */}
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            {t('organization.templateSystemNotice') || '⚠️ Hinweis: Das Template-System ist noch nicht vollständig implementiert. Hochgeladene Templates werden aktuell nicht gespeichert oder verwendet. Dokumente werden mit einer Standard-Vorlage generiert.'}
          </p>
        </div>
        
        {templates.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>{t('lifecycle.noTemplates') || 'Keine Templates vorhanden'}</p>
            <p className="text-sm mt-2">{t('lifecycle.uploadFirstTemplate') || 'Laden Sie Ihr erstes Template hoch'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id || template.name}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div>
                  <div className="font-medium dark:text-white">{template.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {template.type === 'certificate' 
                      ? (t('lifecycle.certificate') || 'Arbeitszeugnis')
                      : (t('lifecycle.contract') || 'Arbeitsvertrag')}
                    {template.version && ` - Version ${template.version}`}
                  </div>
                </div>
                <button
                  onClick={() => template.id && handleDeleteTemplate(template.id)}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded-md"
                  title={t('common.delete') || 'Löschen'}
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">
          {t('organization.documentSettings') || 'Dokumenten-Einstellungen'}
        </h3>
        <div className="space-y-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {t('lifecycle.documentSettingsInfo') || 'Weitere Einstellungen für die Dokumenten-Generierung werden hier konfiguriert.'}
          </div>
          {/* TODO: Weitere Einstellungen hinzufügen wenn Backend bereit ist */}
        </div>
      </div>
    </div>
  );
};

export default DocumentConfigurationTab;

