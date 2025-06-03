import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PayrollComponent from '../components/PayrollComponent.tsx';
import InvoiceManagementTab from '../components/InvoiceManagementTab.tsx';
import MonthlyReportsTab from '../components/MonthlyReportsTab.tsx';
import { CalculatorIcon, DocumentTextIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

type TabType = 'invoices' | 'monthly-reports' | 'payroll';

const Payroll: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('invoices');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

  // URL-Parameter verarbeiten
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const tabParam = queryParams.get('tab') as TabType;
    const invoiceIdParam = queryParams.get('invoiceId');
    const reportIdParam = queryParams.get('reportId');

    if (tabParam && ['invoices', 'monthly-reports', 'payroll'].includes(tabParam)) {
      setActiveTab(tabParam);
    }

    if (invoiceIdParam) {
      const invoiceId = parseInt(invoiceIdParam, 10);
      if (!isNaN(invoiceId)) {
        setSelectedInvoiceId(invoiceId);
      }
    }

    if (reportIdParam) {
      const reportId = parseInt(reportIdParam, 10);
      if (!isNaN(reportId)) {
        setSelectedReportId(reportId);
      }
    }
  }, [location.search]);

  const tabs = [
    {
      id: 'invoices' as TabType,
      name: 'Beratungsrechnungen',
      icon: DocumentTextIcon,
      component: <InvoiceManagementTab />
    },
    {
      id: 'monthly-reports' as TabType,
      name: 'Monatsabrechnungen',
      icon: ClipboardDocumentListIcon,
      component: <MonthlyReportsTab />
    },
    {
      id: 'payroll' as TabType,
      name: 'Lohnabrechnungen',
      icon: CalculatorIcon,
      component: <PayrollComponent />
    }
  ];

  return (
    <div className="min-h-screen dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
          {/* Tab Headers */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 px-6 pt-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group inline-flex items-center pb-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {tabs.find(tab => tab.id === activeTab)?.component}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payroll; 