import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import DeviceFrame from '../components/DeviceFrame.tsx';
import LanguageSelector from '../components/LanguageSelector.tsx';
import { useAuth } from '../hooks/useAuth.tsx';
import LoadingScreen from '../components/LoadingScreen.tsx';
import {
  ArrowRightIcon,
  ClockIcon,
  CheckCircleIcon,
  SparklesIcon,
  DocumentTextIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  CpuChipIcon,
  ChatBubbleBottomCenterTextIcon,
  BanknotesIcon,
  KeyIcon,
  GlobeAltIcon,
  BriefcaseIcon
} from '@heroicons/react/24/outline';

// --- Code-Based Mockups ---

const DashboardMockup = () => (
  <div className="w-full h-full bg-gray-50 dark:bg-gray-900 flex overflow-hidden text-[0.6rem] sm:text-xs select-none cursor-default">
    {/* Sidebar */}
    <div className="w-16 sm:w-24 bg-gray-900 text-gray-400 flex flex-col items-center py-4 gap-4 border-r border-gray-800">
      <div className="w-8 h-8 rounded-lg bg-blue-600 mb-2"></div>
      <div className="w-8 h-1 rounded-full bg-gray-700"></div>
      <div className="w-8 h-1 rounded-full bg-gray-700"></div>
      <div className="w-8 h-1 rounded-full bg-gray-700"></div>
      <div className="mt-auto w-6 h-6 rounded-full bg-gray-700"></div>
    </div>
    {/* Main Content */}
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="h-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
        <div className="w-24 h-2 rounded bg-gray-200 dark:bg-gray-700"></div>
        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700"></div>
          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 flex items-center justify-center font-bold">A</div>
        </div>
      </div>
      {/* Dashboard Content */}
      <div className="p-4 flex-1 overflow-hidden flex flex-col gap-4">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-900/30 mb-2"></div>
              <div className="w-12 h-2 rounded bg-gray-100 dark:bg-gray-700 mb-1"></div>
              <div className="w-8 h-3 rounded bg-gray-200 dark:bg-gray-600 font-bold"></div>
            </div>
          ))}
        </div>
        {/* Kanban Board */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 flex gap-3 overflow-hidden">
          {[1, 2, 3].map((col) => (
            <div key={col} className="flex-1 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2 flex flex-col gap-2">
              <div className="w-16 h-2 rounded bg-gray-200 dark:bg-gray-600 mb-1"></div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="w-full h-1.5 rounded bg-gray-200 dark:bg-gray-600 mb-1"></div>
                <div className="w-2/3 h-1.5 rounded bg-gray-100 dark:bg-gray-700"></div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded shadow-sm border border-gray-100 dark:border-gray-700">
                 <div className="w-full h-1.5 rounded bg-gray-200 dark:bg-gray-600 mb-1"></div>
                 <div className="flex justify-between mt-2">
                    <div className="w-4 h-4 rounded-full bg-green-100 dark:bg-green-900"></div>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const MobileMockup = () => (
  <div className="w-full h-full bg-gray-50 dark:bg-gray-900 flex flex-col relative overflow-hidden">
    {/* Header */}
    <div className="bg-blue-600 h-24 rounded-b-[2rem] p-6 flex items-start justify-between text-white shadow-lg">
      <div className="space-y-1">
        <div className="w-4 h-4 rounded bg-white/20"></div>
        <div className="w-24 h-3 rounded bg-white/90 font-bold"></div>
      </div>
      <div className="w-8 h-8 rounded-full bg-white/20"></div>
    </div>
    {/* Content */}
    <div className="px-4 -mt-6 flex-1 space-y-3 overflow-hidden pb-4">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 flex items-center justify-between">
         <div>
            <div className="w-16 h-2 rounded bg-gray-200 dark:bg-gray-600 mb-1"></div>
            <div className="w-10 h-3 rounded bg-gray-800 dark:bg-gray-200 font-bold"></div>
         </div>
         <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 flex items-center justify-center">
            <ClockIcon className="w-5 h-5" />
         </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 shrink-0"></div>
          <div className="flex-1 space-y-1">
             <div className="w-3/4 h-2 rounded bg-gray-200 dark:bg-gray-600"></div>
             <div className="w-1/2 h-2 rounded bg-gray-100 dark:bg-gray-700"></div>
          </div>
        </div>
      ))}
    </div>
    {/* Tab Bar */}
    <div className="h-16 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-around px-6">
       <div className="w-6 h-6 rounded bg-blue-600"></div>
       <div className="w-6 h-6 rounded bg-gray-300 dark:bg-gray-600"></div>
       <div className="w-6 h-6 rounded bg-gray-300 dark:bg-gray-600"></div>
    </div>
  </div>
);

const InvoiceMockup = () => (
  <div className="w-full h-full bg-gray-100 dark:bg-gray-900 p-6 flex items-center justify-center">
    <div className="w-full aspect-[1/1.4] bg-white text-[0.5rem] p-6 shadow-lg rounded-sm flex flex-col gap-4 relative overflow-hidden">
        {/* Invoice Header */}
        <div className="flex justify-between items-start">
            <div className="space-y-1">
                <div className="w-20 h-3 bg-gray-800 rounded"></div>
                <div className="w-32 h-1 bg-gray-300 rounded"></div>
            </div>
            <div className="text-right space-y-1">
                <div className="w-16 h-2 bg-gray-300 rounded ml-auto"></div>
                <div className="w-12 h-1 bg-gray-200 rounded ml-auto"></div>
            </div>
        </div>
        {/* Table */}
        <div className="mt-4 space-y-2">
            <div className="w-full h-4 bg-gray-100 rounded flex items-center px-2 gap-2">
                <div className="w-1/2 h-1 bg-gray-300 rounded"></div>
                <div className="w-1/4 h-1 bg-gray-300 rounded"></div>
                <div className="w-1/4 h-1 bg-gray-300 rounded"></div>
            </div>
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center px-2 gap-2 border-b border-gray-50 py-1">
                    <div className="w-1/2 h-1 bg-gray-200 rounded"></div>
                    <div className="w-1/4 h-1 bg-gray-100 rounded"></div>
                    <div className="w-1/4 h-1 bg-gray-200 rounded"></div>
                </div>
            ))}
        </div>
        {/* Total */}
        <div className="mt-auto ml-auto w-1/3 p-2 bg-gray-50 rounded space-y-1">
            <div className="flex justify-between">
                <div className="w-8 h-1 bg-gray-300 rounded"></div>
                <div className="w-8 h-1 bg-gray-800 rounded"></div>
            </div>
        </div>
        {/* QR Code Section (Swiss QR Style) */}
        <div className="mt-4 pt-4 border-t border-dashed border-gray-200 flex gap-4 items-end">
            <div className="w-16 h-16 bg-gray-900 rounded-none flex items-center justify-center text-white text-[0.4rem]">QR</div>
            <div className="flex-1 space-y-1">
                 <div className="w-full h-1 bg-gray-200 rounded"></div>
                 <div className="w-2/3 h-1 bg-gray-200 rounded"></div>
            </div>
        </div>
    </div>
  </div>
);


// --- Main Components ---

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
  const { user, isLoading } = useAuth();
  const { scrollYProgress } = useScroll();
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  
  const [industryTab, setIndustryTab] = useState<'hostel' | 'consulting'>('hostel');

  // SEO & Meta
  useEffect(() => {
    if (!isLoading && !user) {
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
    }
  }, [t, isLoading, user]);

  // Schema.org
  const jsonLd = useMemo(() => {
    if (isLoading || user) {
      return '';
    }
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
  }, [t, isLoading, user]);

  // Warten auf Authentifizierung
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Eingeloggte User zum Dashboard weiterleiten
  if (user) {
    return <Navigate to="/app/dashboard" replace />;
  }

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
            </div>
          </motion.div>

          <motion.div 
            style={{ scale: heroScale, opacity: heroOpacity }}
            className="relative mx-auto max-w-6xl shadow-2xl rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900"
          >
             <DeviceFrame type="browser">
                <DashboardMockup />
             </DeviceFrame>
             <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-950 via-transparent to-transparent opacity-20 pointer-events-none" />
          </motion.div>
        </section>

        {/* Core Features */}
        <section className="px-6 max-w-7xl mx-auto">
            <div className="mb-12">
                <h2 className="text-3xl font-semibold tracking-tight">{t('landing.core.title')}</h2>
                <p className="text-gray-500 text-lg mt-2">{t('landing.core.subtitle')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[400px]">
                
                {/* 1. Zeiterfassung & Workcenter (Large) */}
                <FeatureCard className="md:col-span-2 relative group p-8">
                    <div className="flex flex-col h-full z-10 relative">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
                            <ClockIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">{t('landing.core.time.title')}</h3>
                        <p className="text-gray-500 max-w-md text-lg">{t('landing.core.time.desc')}</p>
                    </div>
                    {/* Abstract Decorative Element */}
                    <div className="absolute right-0 bottom-0 w-1/2 h-4/5 bg-gray-50 dark:bg-gray-900 rounded-tl-3xl border-t border-l border-gray-100 dark:border-gray-700 overflow-hidden shadow-inner">
                        <DashboardMockup />
                    </div>
                </FeatureCard>

                {/* 2. Worktracker / Tasks (Tall) */}
                <FeatureCard className="bg-gray-900 text-white border-none p-8 flex flex-col justify-between">
                    <div>
                         <div className="w-12 h-12 rounded-2xl bg-gray-800 text-white flex items-center justify-center mb-6 border border-gray-700">
                            <CheckCircleIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">{t('landing.core.tasks.title')}</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">{t('landing.core.tasks.desc')}</p>
                    </div>
                    <div className="space-y-3 mt-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-3 bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
                                <div className={`w-4 h-4 rounded-full border-2 ${i === 1 ? 'border-green-500 bg-green-500' : 'border-gray-600'}`}></div>
                                <div className="h-2 w-20 bg-gray-600 rounded-full"></div>
                            </div>
                        ))}
                    </div>
                </FeatureCard>

                {/* 3. Payroll & Lifecycle */}
                <FeatureCard className="p-8">
                     <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 flex items-center justify-center mb-6">
                        <BanknotesIcon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{t('landing.core.payroll.title')}</h3>
                    <p className="text-gray-500 text-sm">{t('landing.core.payroll.desc')}</p>
                    <div className="mt-8 flex gap-2">
                         <div className="px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 text-xs font-medium">CH & COL</div>
                         <div className="px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 text-xs font-medium">Automated</div>
                    </div>
                </FeatureCard>

                 {/* 4. Cerebro */}
                <FeatureCard className="p-8">
                     <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 flex items-center justify-center mb-6">
                        <DocumentTextIcon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{t('landing.core.knowledge.title')}</h3>
                    <p className="text-gray-500 text-sm">{t('landing.core.knowledge.desc')}</p>
                </FeatureCard>

                {/* 5. AI & Integration (Wide) */}
                <FeatureCard className="md:col-span-1 p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none">
                     <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur text-white flex items-center justify-center mb-6 border border-white/20">
                        <CpuChipIcon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{t('landing.core.ai.title')}</h3>
                    <p className="text-blue-100 text-sm mb-4">{t('landing.core.ai.desc')}</p>
                    <div className="p-4 bg-white/10 rounded-xl border border-white/10 backdrop-blur-sm">
                        <div className="flex items-center gap-3 text-sm">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            AI Bot Active
                        </div>
                    </div>
                </FeatureCard>

            </div>
        </section>

        {/* Industry Switcher */}
        <section className="px-6 max-w-7xl mx-auto">
             <div className="text-center max-w-2xl mx-auto mb-16">
                <h2 className="text-3xl font-semibold tracking-tight mb-4">{t('landing.industry.title')}</h2>
                <p className="text-gray-500 text-lg mb-8">{t('landing.industry.subtitle')}</p>
                
                {/* Switcher Controls */}
                <div className="inline-flex p-1 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setIndustryTab('hostel')}
                        className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                            industryTab === 'hostel' 
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        {t('landing.industry.hostel.tab')}
                    </button>
                    <button
                        onClick={() => setIndustryTab('consulting')}
                         className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                            industryTab === 'consulting' 
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        {t('landing.industry.consulting.tab')}
                    </button>
                </div>
             </div>

             <AnimatePresence mode="wait">
                 <motion.div
                    key={industryTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-8"
                 >
                    {industryTab === 'hostel' ? (
                        <>
                             {/* Hostel Content */}
                            <div className="p-6 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                                <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 flex items-center justify-center mb-4">
                                    <KeyIcon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold mb-2">{t('landing.industry.hostel.res.title')}</h3>
                                <p className="text-gray-500 text-sm">{t('landing.industry.hostel.res.desc')}</p>
                            </div>
                            <div className="p-6 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                                <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 flex items-center justify-center mb-4">
                                    <GlobeAltIcon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold mb-2">{t('landing.industry.hostel.tours.title')}</h3>
                                <p className="text-gray-500 text-sm">{t('landing.industry.hostel.tours.desc')}</p>
                            </div>
                            <div className="p-6 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center mb-4">
                                    <ChatBubbleBottomCenterTextIcon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold mb-2">{t('landing.industry.hostel.guest.title')}</h3>
                                <p className="text-gray-500 text-sm">{t('landing.industry.hostel.guest.desc')}</p>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Consulting Content */}
                             <div className="p-6 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center mb-4">
                                    <BriefcaseIcon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold mb-2">{t('landing.industry.consulting.clients.title')}</h3>
                                <p className="text-gray-500 text-sm">{t('landing.industry.consulting.clients.desc')}</p>
                            </div>
                            <div className="p-6 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center mb-4">
                                    <ClockIcon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold mb-2">{t('landing.industry.consulting.billing.title')}</h3>
                                <p className="text-gray-500 text-sm">{t('landing.industry.consulting.billing.desc')}</p>
                            </div>
                            <div className="p-6 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center mb-4">
                                    <DocumentTextIcon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold mb-2">{t('landing.industry.consulting.invoices.title')}</h3>
                                <p className="text-gray-500 text-sm">{t('landing.industry.consulting.invoices.desc')}</p>
                            </div>
                        </>
                    )}
                 </motion.div>
             </AnimatePresence>
        </section>

        {/* CTA */}
        <section id="contact" className="px-6 max-w-7xl mx-auto text-center pb-24">
            <div className="bg-gray-900 rounded-3xl p-12 md:p-24 text-white overflow-hidden relative">
                <div className="relative z-10 max-w-2xl mx-auto space-y-8">
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight">{t('landing.cta.title')}</h2>
                    <p className="text-gray-400 text-xl">{t('landing.cta.subtitle')}</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            to="/register"
                            className="w-full sm:w-auto bg-white text-gray-900 px-8 py-4 rounded-full text-lg font-bold hover:bg-gray-100 transition-colors shadow-lg"
                        >
                            {t('landing.hero.ctaRegister')}
                        </Link>
                    </div>
                </div>
                
                {/* Decorative Background Elements */}
                <div className="absolute top-0 left-0 w-64 h-64 bg-blue-600 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 translate-x-1/3 translate-y-1/3"></div>
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
