import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../config/axios.ts';
import LanguageSelector from '../components/LanguageSelector.tsx';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await axiosInstance.post('/auth/reset-password-request', { email });
      setSuccess(true);
    } catch (err: any) {
      console.error('Passwort-Reset-Anfrage Fehler:', err);
      const errorMessage = err.response?.data?.message || err.message || t('forgotPassword.error');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 relative">
      <div className="fixed top-2 right-2 z-50">
        <LanguageSelector />
      </div>
      <div className="max-w-lg w-full space-y-8 p-10 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
          {t('forgotPassword.title')}
        </h2>
        
        {success ? (
          <div className="mt-8 space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
              <p className="text-green-800 dark:text-green-200 text-center">
                {t('forgotPassword.success')}
              </p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              {t('forgotPassword.checkEmail')}
            </p>
            <div className="text-center">
              <Link
                to="/login"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                {t('forgotPassword.backToLogin')}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="text-center text-gray-600 dark:text-gray-400">
              {t('forgotPassword.description')}
            </p>
            
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                <p className="text-red-800 dark:text-red-200 text-center">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('forgotPassword.email')}
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                  disabled={loading}
                  placeholder={t('forgotPassword.emailPlaceholder')}
                />
              </div>
              
              <button
                type="submit"
                className={`w-full py-2 px-4 text-white rounded-md ${
                  loading
                    ? 'bg-blue-400 dark:bg-blue-500 cursor-not-allowed'
                    : 'bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800'
                }`}
                disabled={loading}
              >
                {loading ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
              </button>
            </form>

            <div className="text-center mt-4">
              <Link
                to="/login"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                {t('forgotPassword.backToLogin')}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;

