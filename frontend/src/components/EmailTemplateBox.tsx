import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EnvelopeIcon, PaperAirplaneIcon, ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline';
import axiosInstance from '../config/axios.ts';
import useMessage from '../hooks/useMessage.ts';

interface Task {
  id: number;
  title: string;
  description: string | null;
  [key: string]: any;
}

interface EmailTemplateBoxProps {
  task: Task;
}

const EmailTemplateBox: React.FC<EmailTemplateBoxProps> = ({ task }) => {
  const { t } = useTranslation();
  const { showMessage } = useMessage();
  const [emailTemplate, setEmailTemplate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Prüfe ob Task ein Lebenszyklus-Task ist
  const isLifecycleTask = task.title?.includes('ARL') || 
                          task.title?.includes('EPS') || 
                          task.title?.includes('Pension') || 
                          task.title?.includes('Caja') ||
                          task.description?.includes('lifecycle');

  // Zeige Box nur wenn es ein Lebenszyklus-Task ist
  if (!isLifecycleTask) {
    return null;
  }

  const handleGenerateTemplate = async () => {
    setGenerating(true);
    try {
      // API-Call zum Generieren der Email-Vorlage
      // TODO: Endpoint implementieren wenn Backend bereit ist
      // const response = await axiosInstance.post(`/api/tasks/${task.id}/generate-email`);
      // setEmailTemplate(response.data.template);
      
      // Temporär: Generiere einfache Vorlage basierend auf Task-Daten
      const template = `Sehr geehrte Damen und Herren,

im Rahmen des Onboarding-Prozesses benötigen wir die Anmeldung für ${task.title}.

Bitte senden Sie uns die erforderlichen Informationen zurück.

Mit freundlichen Grüßen
Ihr Team`;
      
      setEmailTemplate(template);
      showMessage(t('lifecycle.templateGenerated', { defaultValue: 'Email-Vorlage generiert' }), 'success');
    } catch (error: any) {
      console.error('Fehler beim Generieren der Email-Vorlage:', error);
      showMessage(
        error.response?.data?.message || t('lifecycle.templateGenerationError', { defaultValue: 'Fehler beim Generieren der Vorlage' }),
        'error'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailTemplate.trim()) {
      showMessage(t('lifecycle.templateRequired', { defaultValue: 'Bitte generieren Sie zuerst eine Vorlage' }), 'warning');
      return;
    }

    setLoading(true);
    try {
      // API-Call zum Versenden der Email
      // TODO: Endpoint implementieren wenn Backend bereit ist
      // await axiosInstance.post(`/api/tasks/${task.id}/send-email`, {
      //   template: emailTemplate
      // });
      
      // Temporär: Simuliere Versand
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setEmailSent(true);
      showMessage(t('lifecycle.emailSent', { defaultValue: 'Email erfolgreich versendet' }), 'success');
    } catch (error: any) {
      console.error('Fehler beim Versenden der Email:', error);
      showMessage(
        error.response?.data?.message || t('lifecycle.emailSendError', { defaultValue: 'Fehler beim Versenden der Email' }),
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center dark:text-white">
          <EnvelopeIcon className="h-5 w-5 mr-2" />
          {t('lifecycle.emailTemplate', { defaultValue: 'Email-Vorlage' })}
        </h3>
        <button
          onClick={handleGenerateTemplate}
          disabled={generating}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
        >
          {generating ? (
            <>
              <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              {t('common.generating', { defaultValue: 'Generiere...' })}
            </>
          ) : (
            t('lifecycle.generateTemplate', { defaultValue: 'Vorlage generieren' })
          )}
        </button>
      </div>
      
      {emailTemplate && (
        <div className="space-y-4">
          <textarea
            value={emailTemplate}
            onChange={(e) => {
              setEmailTemplate(e.target.value);
              setEmailSent(false);
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={10}
            placeholder={t('lifecycle.templatePlaceholder', { defaultValue: 'Email-Vorlage wird hier angezeigt...' })}
          />
          <div className="flex justify-end">
            <button
              onClick={handleSendEmail}
              disabled={loading || emailSent}
              className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={loading ? t('common.sending', { defaultValue: 'Sende...' }) : emailSent ? t('lifecycle.emailSent', { defaultValue: 'Versendet' }) : t('lifecycle.sendEmail', { defaultValue: 'Email versenden' })}
            >
              {loading ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              ) : emailSent ? (
                <CheckIcon className="h-5 w-5" />
              ) : (
                <PaperAirplaneIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      )}
      
      {!emailTemplate && (
        <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
          {t('lifecycle.noTemplate', { defaultValue: 'Klicken Sie auf "Vorlage generieren" um eine Email-Vorlage zu erstellen' })}
        </div>
      )}
    </div>
  );
};

export default EmailTemplateBox;

