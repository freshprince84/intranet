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
  roles: UserRole[];
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