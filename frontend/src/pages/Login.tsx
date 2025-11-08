import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.tsx';
import LanguageSelector from '../components/LanguageSelector.tsx';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login, user } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Prüfe ob Profil unvollständig ist
  const isProfileIncomplete = (user: any) => {
    return !user.birthday || !user.bankDetails || !user.contract || !user.salary || !user.normalWorkingHours;
  };

  // Überprüfe, ob der Benutzer bereits eingeloggt ist
  useEffect(() => {
    if (user) {
      console.log('Benutzer bereits eingeloggt, prüfe Profilvollständigkeit');
      if (isProfileIncomplete(user)) {
        navigate('/profile');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(formData.username, formData.password);
      // Navigation wird im useEffect behandelt, sobald user state aktualisiert ist
    } catch (err: any) {
      console.error('Login-Fehler:', err);
      
      // Detaillierte Fehlermeldung anzeigen
      const errorMessage = err.response?.data?.message || err.message || t('login.loginFailed');
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 relative">
      <div className="fixed top-2 right-2 z-50">
        <LanguageSelector />
      </div>
      <div className="max-w-lg w-full space-y-8 p-10 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">{t('login.title')}</h2>
        {error && <p className="text-red-500 dark:text-red-400 text-center">{error}</p>}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('login.username')}
            </label>
            <input
              type="text"
              name="username"
              id="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700 dark:text-white"
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('login.password')}
            </label>
            <input
              type="password"
              name="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700 dark:text-white"
              disabled={loading}
            />
            <div className="mt-2">
              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                {t('login.forgotPassword')}
              </Link>
            </div>
          </div>
          <button
            type="submit"
            className={`w-full py-2 px-4 text-white rounded-md ${
              loading ? 'bg-blue-400 dark:bg-blue-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800'
            }`}
            disabled={loading}
          >
            {loading ? t('login.submitting') : t('login.submit')}
          </button>
        </form>
        <p className="text-center mt-4 text-gray-700 dark:text-gray-300">
          {t('login.noAccount')}{' '}
          <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
            {t('login.register')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login; 