import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../config/axios.ts';
import LanguageSelector from '../components/LanguageSelector.tsx';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenError(true);
      setError(t('resetPassword.noToken'));
    }
  }, [token, t]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return t('resetPassword.passwordTooShort');
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validierungen
    if (!token) {
      setError(t('resetPassword.noToken'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('resetPassword.passwordsDoNotMatch'));
      return;
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    try {
      await axiosInstance.post('/auth/reset-password', {
        token: token,
        password: formData.password
      });
      
      setSuccess(true);
      
      // Automatische Weiterleitung zur Login-Seite nach 3 Sekunden
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      console.error('Passwort-Reset Fehler:', err);
      const errorMessage = err.response?.data?.message || err.message || t('resetPassword.error');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 relative">
        <div className="fixed top-2 right-2 z-50">
          <LanguageSelector />
        </div>
        <div className="max-w-lg w-full space-y-8 p-10 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
            {t('resetPassword.title')}
          </h2>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-red-800 dark:text-red-200 text-center">
              {t('resetPassword.noToken')}
            </p>
          </div>
          <div className="text-center">
            <Link
              to="/forgot-password"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              {t('resetPassword.requestNewLink')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 relative">
      <div className="fixed top-2 right-2 z-50">
        <LanguageSelector />
      </div>
      <div className="max-w-lg w-full space-y-8 p-10 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
          {t('resetPassword.title')}
        </h2>
        
        {success ? (
          <div className="mt-8 space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
              <p className="text-green-800 dark:text-green-200 text-center">
                {t('resetPassword.success')}
              </p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              {t('resetPassword.redirecting')}
            </p>
          </div>
        ) : (
          <>
            <p className="text-center text-gray-600 dark:text-gray-400">
              {t('resetPassword.description')}
            </p>
            
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                <p className="text-red-800 dark:text-red-200 text-center">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('resetPassword.newPassword')}
                </label>
                <input
                  type="password"
                  name="password"
                  id="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                  disabled={loading}
                  minLength={8}
                  placeholder={t('resetPassword.passwordPlaceholder')}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('resetPassword.passwordHint')}
                </p>
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('resetPassword.confirmPassword')}
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                  disabled={loading}
                  minLength={8}
                  placeholder={t('resetPassword.confirmPasswordPlaceholder')}
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
                {loading ? t('resetPassword.submitting') : t('resetPassword.submit')}
              </button>
            </form>

            <div className="text-center mt-4">
              <Link
                to="/login"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                {t('resetPassword.backToLogin')}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;

