export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  birthday: string | null;
  bankDetails: string | null;
  contract: string | null;
  salary: number | null;
  normalWorkingHours: number;
  country: string;
  language: string;
  payrollCountry: string;
  hourlyRate: number | null;
  contractType: string | null;
  monthlySalary: number | null;
  identificationNumber?: string | null;
  taxIdentificationNumber?: string | null;
  employeeNumber?: string | null;
  active?: boolean;
  roles: UserRole[];
  identificationDocuments?: IdentificationDocument[];
  settings?: Settings;
  invoiceSettings?: InvoiceSettings;
}

export interface UserRole {
  id: number;
  userId: number;
  roleId: number;
  role: Role;
  lastUsed: boolean;
}

export interface Organization {
  id: number;
  name: string;
  displayName: string | null;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  permissions: Permission[];
  organization?: Organization | null;
}

export interface Permission {
  entity: string;
  entityType: string;
  accessLevel: AccessLevel;
}

export type AccessLevel = 'none' | 'read' | 'write' | 'both';

export interface IdentificationDocument {
  id: number;
  userId: number;
  documentType: string;
  documentNumber: string;
  issueDate: string | null;
  expiryDate: string | null;
  issuingCountry: string;
  issuingAuthority: string | null;
  documentFile: string | null;
  isVerified: boolean;
  verificationDate: string | null;
  verifiedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  id: number;
  userId: number;
  companyLogo?: string | null;
  darkMode: boolean;
  sidebarCollapsed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceSettings {
  id: number;
  userId: number;
  companyName: string;
  companyAddress: string;
  companyZip: string;
  companyCity: string;
  companyCountry: string;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyWebsite?: string | null;
  vatNumber?: string | null;
  iban: string;
  bankName?: string | null;
  defaultHourlyRate: number;
  defaultVatRate?: number | null;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  footerText?: string | null;
  monthlyReportEnabled: boolean;
  monthlyReportDay: number;
  monthlyReportRecipient?: string | null;
  createdAt: string;
  updatedAt: string;
} 