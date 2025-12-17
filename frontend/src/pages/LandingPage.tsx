import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { motion } from 'framer-motion';
import DeviceFrame from '../components/DeviceFrame';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  CommandLineIcon,
  DocumentCheckIcon,
  FingerPrintIcon,
  InboxArrowDownIcon,
  LinkIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Squares2X2Icon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

type Feature = {
  key: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  descriptionKey: string;
};

type AudienceCard = {
  key: string;
  points: string[];
};

type FAQItem = {
  questionKey: string;
  answerKey: string;
};

const IMG_WORKTRACKER = '/landing-assets/worktracker.png';
const IMG_CONSULTATIONS = '/landing-assets/consultations.png';
const IMG_DOCUMENT = '/landing-assets/document-recognition.png';
const IMG_TEAM = '/landing-assets/team-worktime.png';
const IMG_CEREBRO = '/landing-assets/cerebro.png';
const IMG_MOBILE = '/landing-assets/mobile.png';

const CTAIconButton: React.FC<{
  to: string;
  title: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}> = ({ to, title, Icon }) => (
  <Link
    to={to}
    className="inline-flex items-center justify-center rounded-full bg-blue-600 text-white p-3 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
    title={title}
    aria-label={title}
  >
    <Icon className="h-5 w-5" />
    <span className="sr-only">{title}</span>
  </Link>
);

const LandingPage: React.FC = () => {
  const { t } = useTranslation();
  const [demoForm, setDemoForm] = useState({
    name: '',
    organization: '',
    contact: '',
    size: '',
    useCase: '',
  });

  const featureClusters: Array<{ titleKey: string; features: Feature[] }> = [
    {
      titleKey: 'landing.features.operations.title',
      features: [
        { key: 'worktime', icon: ClockIcon, descriptionKey: 'landing.features.operations.worktime' },
        { key: 'worktracker', icon: Squares2X2Icon, descriptionKey: 'landing.features.operations.worktracker' },
        { key: 'teamControl', icon: UserGroupIcon, descriptionKey: 'landing.features.operations.teamControl' },
      ],
    },
    {
      titleKey: 'landing.features.knowledge.title',
      features: [
        { key: 'cerebro', icon: InboxArrowDownIcon, descriptionKey: 'landing.features.knowledge.cerebro' },
        { key: 'workflow', icon: CommandLineIcon, descriptionKey: 'landing.features.knowledge.workflow' },
      ],
    },
    {
      titleKey: 'landing.features.billing.title',
      features: [
        { key: 'consultations', icon: CheckCircleIcon, descriptionKey: 'landing.features.billing.consultations' },
        { key: 'invoices', icon: DocumentCheckIcon, descriptionKey: 'landing.features.billing.invoices' },
      ],
    },
    {
      titleKey: 'landing.features.ai.title',
      features: [
        { key: 'documentRecognition', icon: FingerPrintIcon, descriptionKey: 'landing.features.ai.documentRecognition' },
        { key: 'filters', icon: SparklesIcon, descriptionKey: 'landing.features.ai.filters' },
      ],
    },
    {
      titleKey: 'landing.features.integration.title',
      features: [
        { key: 'lobbypms', icon: LinkIcon, descriptionKey: 'landing.features.integration.lobbypms' },
        { key: 'mobile', icon: ShieldCheckIcon, descriptionKey: 'landing.features.integration.mobile' },
      ],
    },
  ];

  const audiences: AudienceCard[] = [
    {
      key: 'hospitality',
      points: [
        'landing.audience.hospitality.point1',
        'landing.audience.hospitality.point2',
        'landing.audience.hospitality.point3',
      ],
    },
    {
      key: 'consulting',
      points: [
        'landing.audience.consulting.point1',
        'landing.audience.consulting.point2',
        'landing.audience.consulting.point3',
      ],
    },
  ];

  const faqs: FAQItem[] = [
    { questionKey: 'landing.faq.integration.q', answerKey: 'landing.faq.integration.a' },
    { questionKey: 'landing.faq.support.q', answerKey: 'landing.faq.support.a' },
    { questionKey: 'landing.faq.security.q', answerKey: 'landing.faq.security.a' },
    { questionKey: 'landing.faq.onboarding.q', answerKey: 'landing.faq.onboarding.a' },
  ];

  const handleDemoChange = (field: keyof typeof demoForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDemoForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleDemoSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Hinweis: Backend-Endpoint/Mailto muss projektseitig konfiguriert werden.
    alert(t('landing.cta.formFallback'));
  };

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

    // Optional: canonical/hreflang Konfiguration, wenn Domain/Subdomain gesetzt werden soll
    // const canonicalHref = `${window.location.origin}/landing`;
    // let canonicalLink = document.querySelector("link[rel='canonical']");
    // if (!canonicalLink) {
    //   canonicalLink = document.createElement('link');
    //   canonicalLink.setAttribute('rel', 'canonical');
    //   document.head.appendChild(canonicalLink);
    // }
    // canonicalLink.setAttribute('href', canonicalHref);
  }, [t]);

  const jsonLd = useMemo(() => {
    const data = {
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
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        reviewCount: '24',
      },
      review: [
        {
          '@type': 'Review',
          author: { '@type': 'Person', name: 'Operations Lead' },
          reviewBody: t('landing.proof.review1'),
          reviewRating: { '@type': 'Rating', ratingValue: '5' },
        },
        {
          '@type': 'Review',
          author: { '@type': 'Person', name: 'Consulting Lead' },
          reviewBody: t('landing.proof.review2'),
          reviewRating: { '@type': 'Rating', ratingValue: '5' },
        },
      ],
    };
    return JSON.stringify(data);
  }, [t]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
              IN
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('landing.hero.label')}</p>
              <p className="font-semibold">{t('landing.hero.title')}</p>
            </div>
          </div>
          <nav className="flex items-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors font-medium text-sm"
            >
              {t('landing.hero.ctaRegister')}
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors text-sm"
            >
              {t('landing.hero.ctaLogin')}
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        <motion.section
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid md:grid-cols-2 gap-10 items-center"
        >
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-wide text-blue-600 font-semibold">{t('landing.hero.badge')}</p>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">{t('landing.hero.headline')}</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">{t('landing.hero.subline')}</p>
            <div className="flex items-center gap-3 flex-wrap">
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-6 py-3 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors font-semibold"
              >
                {t('landing.hero.ctaRegister')}
                <ArrowRightIcon className="h-5 w-5 ml-2" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                {t('landing.hero.ctaLogin')}
              </Link>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                <p className="text-2xl font-bold text-blue-600">24/7</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('landing.stats.uptime')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('landing.stats.uptimeDesc')}</p>
              </div>
              <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                <p className="text-2xl font-bold text-blue-600">120+</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('landing.stats.automation')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('landing.stats.automationDesc')}</p>
              </div>
              <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                <p className="text-2xl font-bold text-blue-600">3</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('landing.stats.languages')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('landing.stats.languagesDesc')}</p>
              </div>
            </div>
          </div>
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={30}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            className="w-full"
          >
            <SwiperSlide>
              <DeviceFrame type="browser">
                <div className="group relative">
                  <img
                    src={IMG_WORKTRACKER}
                    alt={t('landing.assets.placeholderWorktracker')}
                    loading="lazy"
                    className="w-full h-64 sm:h-96 md:h-[500px] object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-blue-600/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <p className="text-white font-semibold text-xl sm:text-2xl">{t('landing.features.labels.worktracker')}</p>
                  </div>
                </div>
              </DeviceFrame>
            </SwiperSlide>
            <SwiperSlide>
              <DeviceFrame type="browser">
                <div className="group relative">
                  <img
                    src={IMG_CONSULTATIONS}
                    alt={t('landing.assets.placeholderConsultations')}
                    loading="lazy"
                    className="w-full h-64 sm:h-96 md:h-[500px] object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-blue-600/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <p className="text-white font-semibold text-xl sm:text-2xl">{t('landing.features.labels.consultations')}</p>
                  </div>
                </div>
              </DeviceFrame>
            </SwiperSlide>
            <SwiperSlide>
              <DeviceFrame type="browser">
                <div className="group relative">
                  <img
                    src={IMG_DOCUMENT}
                    alt={t('landing.assets.placeholderDocument')}
                    loading="lazy"
                    className="w-full h-64 sm:h-96 md:h-[500px] object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-blue-600/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <p className="text-white font-semibold text-xl sm:text-2xl">{t('landing.features.labels.documentRecognition')}</p>
                  </div>
                </div>
              </DeviceFrame>
            </SwiperSlide>
          </Swiper>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="grid md:grid-cols-2 gap-8"
          id="audiences"
        >
          {audiences.map((audience) => (
            <div key={audience.key} className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-sm animate-fade-in-up">
              <h2 className="text-2xl font-bold mb-4">{t(`landing.audience.${audience.key}.title`)}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">{t(`landing.audience.${audience.key}.description`)}</p>
              <ul className="space-y-3">
                {audience.points.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <CheckCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                    <span>{t(point)}</span>
                  </li>
                ))}
              </ul>
            </div>
            ))}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
          id="features"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold">{t('landing.features.title')}</h2>
            <CTAIconButton to="#contact" title={t('landing.hero.ctaDemo')} Icon={SparklesIcon} />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featureClusters.map((cluster) => (
              <div key={cluster.titleKey} className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-sm space-y-4">
                <h3 className="text-xl font-semibold">{t(cluster.titleKey)}</h3>
                <div className="space-y-3">
                  {cluster.features.map((feature) => (
                    <div key={feature.key} className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center">
                        <feature.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium">{t(`landing.features.labels.${feature.key}`)}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{t(feature.descriptionKey)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-3 animate-fade-in-up">
            {/* Großes Feature (2 Spalten) */}
            <div className="md:col-span-2 space-y-2">
              <DeviceFrame type="browser">
                <div className="group relative">
                  <img
                    src={IMG_TEAM}
                    alt={t('landing.features.labels.teamControl')}
                    loading="lazy"
                    className="w-full h-96 sm:h-[500px] md:h-[600px] object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-blue-600/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <p className="text-white font-semibold text-lg">{t('landing.features.labels.teamControl')}</p>
                  </div>
                </div>
              </DeviceFrame>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">{t('landing.features.screenshots.teamControl')}</p>
            </div>
            {/* Kleine Features (1 Spalte) */}
            <div className="space-y-4">
              <div className="space-y-2">
                <DeviceFrame type="browser">
                  <div className="group relative">
                    <img
                      src={IMG_CEREBRO}
                      alt={t('landing.features.labels.cerebro')}
                      loading="lazy"
                      className="w-full h-48 sm:h-64 object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-blue-600/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <p className="text-white font-semibold text-sm">{t('landing.features.labels.cerebro')}</p>
                    </div>
                  </div>
                </DeviceFrame>
                <p className="text-xs text-gray-600 dark:text-gray-400 text-center">{t('landing.features.screenshots.cerebro')}</p>
              </div>
              <div className="space-y-2">
                <DeviceFrame type="phone">
                  <div className="group relative">
                    <img
                      src={IMG_MOBILE}
                      alt={t('landing.features.labels.mobile')}
                      loading="lazy"
                      className="w-full h-48 sm:h-64 object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-blue-600/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <p className="text-white font-semibold text-sm">{t('landing.features.labels.mobile')}</p>
                    </div>
                  </div>
                </DeviceFrame>
                <p className="text-xs text-gray-600 dark:text-gray-400 text-center">{t('landing.features.screenshots.mobile')}</p>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="grid md:grid-cols-3 gap-6"
          id="proof"
        >
          <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-sm">
            <p className="text-sm uppercase tracking-wide text-blue-600 font-semibold mb-2">{t('landing.proof.badge')}</p>
            <p className="text-2xl font-bold mb-2">{t('landing.proof.title')}</p>
            <p className="text-gray-600 dark:text-gray-300">{t('landing.proof.description')}</p>
          </div>
          <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold">H</div>
              <div>
                <p className="font-semibold">{t('landing.proof.hospitality.title')}</p>
                <p className="text-xs text-gray-500">Operations</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{t('landing.proof.review1')}</p>
          </div>
          <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-green-50 dark:bg-green-900/40 flex items-center justify-center text-green-600 dark:text-green-300 font-semibold">C</div>
              <div>
                <p className="font-semibold">{t('landing.proof.consulting.title')}</p>
                <p className="text-xs text-gray-500">Consulting</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{t('landing.proof.review2')}</p>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="grid md:grid-cols-2 gap-8 items-center"
          id="contact"
        >
          <div className="space-y-4">
            <h2 className="text-3xl font-bold">{t('landing.cta.title')}</h2>
            <p className="text-gray-600 dark:text-gray-300">{t('landing.cta.subtitle')}</p>
            <div className="flex items-center gap-3">
              <CTAIconButton to="/register" title={t('landing.hero.ctaRegister')} Icon={ArrowRightIcon} />
              <CTAIconButton to="/login" title={t('landing.hero.ctaLogin')} Icon={CheckCircleIcon} />
            </div>
          </div>
          <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-sm space-y-4">
            <h3 className="text-xl font-semibold">{t('landing.cta.formTitle')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{t('landing.cta.formHint')}</p>
            <form className="space-y-3" onSubmit={handleDemoSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={demoForm.name}
                  onChange={handleDemoChange('name')}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('landing.cta.formName')}
                  aria-label={t('landing.cta.formName')}
                />
                <input
                  value={demoForm.organization}
                  onChange={handleDemoChange('organization')}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('landing.cta.formOrganization')}
                  aria-label={t('landing.cta.formOrganization')}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={demoForm.contact}
                  onChange={handleDemoChange('contact')}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('landing.cta.formContact')}
                  aria-label={t('landing.cta.formContact')}
                />
                <input
                  value={demoForm.size}
                  onChange={handleDemoChange('size')}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('landing.cta.formSize')}
                  aria-label={t('landing.cta.formSize')}
                />
              </div>
              <textarea
                value={demoForm.useCase}
                onChange={handleDemoChange('useCase')}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder={t('landing.cta.formUseCase')}
                aria-label={t('landing.cta.formUseCase')}
              />
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full bg-blue-600 text-white p-3 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  title={t('landing.cta.formSubmit')}
                  aria-label={t('landing.cta.formSubmit')}
                >
                  <SparklesIcon className="h-5 w-5" />
                  <span className="sr-only">{t('landing.cta.formSubmit')}</span>
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('landing.cta.formSecondary')}</span>
              </div>
            </form>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="space-y-4"
          id="faq"
        >
          <h2 className="text-3xl font-bold">{t('landing.faq.title')}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {faqs.map((faq) => (
              <div key={faq.questionKey} className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-sm">
                <p className="font-semibold mb-2">{t(faq.questionKey)}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{t(faq.answerKey)}</p>
              </div>
            ))}
          </div>
        </motion.section>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold">{t('landing.footer.title')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('landing.footer.copy')}</p>
          </div>
          <div className="flex items-center gap-3">
            <CTAIconButton to="/register" title={t('landing.hero.ctaRegister')} Icon={ArrowRightIcon} />
            <CTAIconButton to="/login" title={t('landing.hero.ctaLogin')} Icon={CheckCircleIcon} />
            <CTAIconButton to="#contact" title={t('landing.hero.ctaDemo')} Icon={SparklesIcon} />
          </div>
        </div>
      </footer>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </div>
  );
};

export default LandingPage;
