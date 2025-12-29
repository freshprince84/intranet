import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useScroll, useTransform } from 'framer-motion';
import DeviceFrame from '../components/DeviceFrame.tsx';
import LanguageSelector from '../components/LanguageSelector.tsx';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  SparklesIcon,
  ClockIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

// Assets
const IMG_WORKTRACKER = '/landing-assets/worktracker.png';
const IMG_CONSULTATIONS = '/landing-assets/consultations.png';
const IMG_DOCUMENT = '/landing-assets/document-recognition.png';
const IMG_TEAM = '/landing-assets/team-worktime.png';
const IMG_MOBILE = '/landing-assets/mobile.png';

// Reusable Components
const FeatureCard = ({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-50px' }}
    transition={{ duration: 0.5, delay }}
    className={`bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 ${className}`}
  >
    {children}
  </motion.div>
);

const LandingPage: React.FC = () => {
  const { t } = useTranslation();
  const { scrollYProgress } = useScroll();
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  // SEO & Meta
  useEffect(() => {
    document.title = t('landing.seo.title');
    const description = t('landing.seo.description');
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = description;
      document.head.appendChild(meta);
    }
  }, [t]);

  // Schema.org
  const jsonLd = useMemo(() => {
    return JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: t('landing.schema.productName'),
      description: t('landing.seo.description'),
      applicationCategory: 'BusinessApplication',
      offers: {
        '@type': 'Offer',
        availability: 'https://schema.org/InStock',
        price: '0',
        priceCurrency: 'CHF',
      },
    });
  }, [t]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      
      {/* Header - Glassmorphism */}
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-gray-950/70 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              IN
            </div>
            <span className="font-semibold tracking-tight">Intranet</span>
          </div>
          <nav className="flex items-center gap-4">
            <LanguageSelector />
            <Link
              to="/login"
              className="text-sm font-medium hover:text-blue-600 transition-colors"
            >
              {t('landing.hero.ctaLogin')}
            </Link>
            <Link
              to="/register"
              className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {t('landing.hero.ctaRegister')}
            </Link>
          </nav>
        </div>
      </header>

      <main className="space-y-32 pb-32">
        
        {/* Hero Section */}
        <section className="pt-24 px-6 max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8 mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs font-semibold tracking-wide uppercase">
              <SparklesIcon className="w-4 h-4" />
              {t('landing.hero.badge')}
            </div>
            <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-balance text-gray-900 dark:text-white max-w-4xl mx-auto">
              {t('landing.hero.headline')}
            </h1>
            <p className="text-xl md:text-2xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-balance font-light">
              {t('landing.hero.subline')}
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                to="/register"
                className="group bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                {t('landing.hero.ctaRegister')}
                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="#contact"
                className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                {t('landing.hero.ctaDemo')}
              </Link>
            </div>
          </motion.div>

          <motion.div 
            style={{ scale: heroScale, opacity: heroOpacity }}
            className="relative mx-auto max-w-6xl shadow-2xl rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900"
          >
             <DeviceFrame type="browser">
                <img
                  src={IMG_WORKTRACKER}
                  alt="Dashboard Preview"
                  className="w-full h-auto object-cover"
                />
             </DeviceFrame>
             <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-950 via-transparent to-transparent opacity-20 pointer-events-none" />
          </motion.div>
        </section>

        {/* Feature Grid: Operations */}
        <section className="px-6 max-w-7xl mx-auto">
            <div className="mb-12">
                <h2 className="text-3xl font-semibold tracking-tight">{t('landing.features.operations.title')}</h2>
                <p className="text-gray-500 text-lg mt-2">{t('landing.features.title')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[500px]">
                {/* Large Card */}
                <FeatureCard className="md:col-span-2 relative group">
                    <div className="absolute top-8 left-8 z-10 max-w-md">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-4 shadow-lg">
                            <ClockIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-2xl font-semibold mb-2">{t('landing.features.labels.teamControl')}</h3>
                        <p className="text-gray-500">{t('landing.features.operations.teamControl')}</p>
                    </div>
                    <div className="absolute inset-x-8 bottom-0 top-40 overflow-hidden rounded-t-2xl shadow-2xl border-t border-l border-r border-gray-200 dark:border-gray-700 translate-y-8 group-hover:translate-y-6 transition-transform duration-500">
                         <img src={IMG_TEAM} alt="Team Control" className="w-full h-full object-cover object-top" />
                    </div>
                </FeatureCard>

                {/* Tall Card */}
                <FeatureCard className="md:col-span-1 relative bg-gray-50 dark:bg-gray-900">
                    <div className="absolute top-8 left-8 right-8 z-10">
                        <h3 className="text-2xl font-semibold mb-2">{t('landing.features.labels.mobile')}</h3>
                        <p className="text-gray-500 text-sm">{t('landing.features.integration.mobile')}</p>
                    </div>
                    <div className="absolute inset-0 flex items-end justify-center pb-8 pt-32">
                         <div className="w-48 transform translate-y-4 hover:translate-y-0 transition-transform duration-500">
                            <DeviceFrame type="phone">
                                <img src={IMG_MOBILE} alt="Mobile App" className="w-full h-full object-cover" />
                            </DeviceFrame>
                         </div>
                    </div>
                </FeatureCard>
            </div>
        </section>

        {/* Feature Grid: Intelligence & Billing */}
        <section className="px-6 max-w-7xl mx-auto">
            <div className="mb-12">
                 <h2 className="text-3xl font-semibold tracking-tight">{t('landing.features.ai.title')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FeatureCard className="p-8 flex flex-col justify-between h-[400px]">
                    <div>
                        <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-4 shadow-lg">
                            <SparklesIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-2xl font-semibold mb-2">{t('landing.features.labels.documentRecognition')}</h3>
                        <p className="text-gray-500">{t('landing.features.ai.documentRecognition')}</p>
                    </div>
                    <div className="mt-8 rounded-xl overflow-hidden shadow-inner border border-gray-100 bg-gray-50 relative h-48">
                         <img src={IMG_DOCUMENT} alt="AI Docs" className="w-full h-full object-cover opacity-80" />
                         <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent" />
                    </div>
                 </FeatureCard>

                 <FeatureCard className="p-8 flex flex-col justify-between h-[400px] bg-gray-900 text-white border-none">
                    <div>
                        <div className="w-10 h-10 rounded-xl bg-green-500 text-white flex items-center justify-center mb-4 shadow-lg">
                            <CurrencyDollarIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-2xl font-semibold mb-2">{t('landing.features.labels.consultations')}</h3>
                        <p className="text-gray-400">{t('landing.features.billing.consultations')}</p>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-sm flex-1 border border-white/10">
                            <div className="opacity-50 text-xs uppercase mb-1">Total</div>
                            <div className="text-xl font-mono">CHF 1,240.00</div>
                        </div>
                         <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-sm flex-1 border border-white/10">
                            <div className="opacity-50 text-xs uppercase mb-1">Status</div>
                            <div className="text-green-400 font-medium flex items-center gap-1">
                                <CheckCircleIcon className="w-3 h-3" /> Paid
                            </div>
                        </div>
                    </div>
                 </FeatureCard>
            </div>
        </section>

        {/* Reviews / Proof */}
        <section className="px-6 max-w-4xl mx-auto text-center">
            <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-12"
            >
                <div className="flex justify-center gap-1 text-yellow-500 mb-6">
                    {[...Array(5)].map((_, i) => (
                        <SparklesIcon key={i} className="w-5 h-5 fill-current" />
                    ))}
                </div>
                <blockquote className="text-2xl font-medium text-gray-900 dark:text-white mb-6 leading-relaxed">
                    "{t('landing.proof.review1')}"
                </blockquote>
                <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    {t('landing.proof.hospitality.title')}
                </div>
            </motion.div>
        </section>

        {/* CTA */}
        <section id="contact" className="px-6 max-w-7xl mx-auto text-center pb-24">
            <div className="bg-blue-600 rounded-3xl p-12 md:p-24 text-white overflow-hidden relative">
                <div className="relative z-10 max-w-2xl mx-auto space-y-8">
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight">{t('landing.cta.title')}</h2>
                    <p className="text-blue-100 text-xl">{t('landing.cta.subtitle')}</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            to="/register"
                            className="w-full sm:w-auto bg-white text-blue-600 px-8 py-4 rounded-full text-lg font-bold hover:bg-blue-50 transition-colors shadow-lg"
                        >
                            {t('landing.hero.ctaRegister')}
                        </Link>
                         <Link
                            to="mailto:demo@intranet.com"
                            className="w-full sm:w-auto bg-blue-700 text-white border border-blue-500 px-8 py-4 rounded-full text-lg font-medium hover:bg-blue-800 transition-colors"
                        >
                            {t('landing.cta.formTitle')}
                        </Link>
                    </div>
                </div>
                
                {/* Decorative Background Elements */}
                <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 translate-x-1/3 translate-y-1/3"></div>
            </div>
        </section>

      </main>

      <footer className="border-t border-gray-100 dark:border-gray-800 py-12 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-sm text-gray-500">
                © {new Date().getFullYear()} Intranet Platform. {t('landing.footer.copy')}
            </div>
            <div className="flex gap-6">
                <Link to="/login" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">{t('landing.hero.ctaLogin')}</Link>
                <Link to="/register" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">{t('landing.hero.ctaRegister')}</Link>
            </div>
        </div>
      </footer>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </div>
  );
};

export default LandingPage;
