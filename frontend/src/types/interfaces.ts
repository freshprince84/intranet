export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
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
  roles: UserRole[];
  identificationDocuments?: IdentificationDocument[];
}

export interface UserRole {
  id: number;
  userId: number;
  roleId: number;
  role: Role;
  lastUsed: boolean;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  permissions: Permission[];
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