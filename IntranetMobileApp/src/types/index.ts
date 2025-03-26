/**
 * Zentrale Typdefinitionen für die mobile App
 */

// ------ Benutzertypen ------
export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  birthday?: string | null;
  bankDetails?: string | null;
  contract?: string | null;
  salary?: number | null;
  normalWorkingHours: number;
  country: string;
  language: string;
  payrollCountry?: string;
  hourlyRate?: number | null;
  contractType?: string | null;
  monthlySalary?: number | null;
  identificationNumber?: string | null;
  taxIdentificationNumber?: string | null;
  employeeNumber?: string | null;
  roles?: UserRole[];
  phoneNumber?: string;
  position?: string;
  avatarUrl?: string;
  roleId?: number;
  role?: Role;
  branchId?: number;
  branch?: Branch;
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
  description?: string | null;
  permissions?: Permission[];
}

export interface Permission {
  entity: string;
  entityType: string;
  accessLevel: AccessLevel;
}

export type AccessLevel = 'none' | 'read' | 'write' | 'both';

// ------ Requests (Anfragen) ------
export enum RequestStatus {
  pending = 'pending',
  approved = 'approved',
  denied = 'denied',
  cancelled = 'cancelled'
}

export enum RequestType {
  vacation = 'vacation',
  sick = 'sick',
  equipment = 'equipment',
  training = 'training',
  other = 'other'
}

export interface Request {
  id: number;
  title: string;
  description?: string;
  type: RequestType;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  requesterId: number;
  requester?: User;
  approverId?: number;
  approver?: User;
  startDate?: string;
  endDate?: string;
  branchId: number;
  branch?: Branch;
  documents?: Document[];
}

export interface RequestAttachment {
  id: number;
  requestId: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  uploadedAt: Date | string;
}

// ------ Tasks (Aufgaben) ------
export type TaskStatus = 'open' | 'in_progress' | 'improval' | 'quality_control' | 'done';

export enum TaskPriority {
  low = 'low',
  medium = 'medium',
  high = 'high',
  critical = 'critical'
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  responsibleId?: number | null;
  roleId?: number | null;
  responsible?: User | null;
  role?: Role | null;
  qualityControl?: User | null;
  qualityControlId?: number | null;
  branch?: Branch | null;
  branchId?: number | null;
  dueDate: string | null;
  attachments?: TaskAttachment[];
}

export interface TaskAttachment {
  id: number;
  taskId: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  uploadedAt: Date | string;
}

// ------ Benachrichtigungen ------
export interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  relatedEntityType?: string; 
  relatedEntityId?: number;
}

// Typen für Benachrichtigungen
export enum NotificationType {
  task = 'task',
  request = 'request',
  user = 'user',
  role = 'role',
  worktime = 'worktime',
  worktime_manager_stop = 'worktime_manager_stop',
  system = 'system'
}

// ------ Einstellungen ------
export interface Settings {
  id: number;
  userId: number;
  darkMode: boolean;
  sidebarCollapsed: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface NotificationSettings {
  id: number;
  userId: number;
  taskCreate: boolean;
  taskUpdate: boolean;
  taskDelete: boolean;
  taskStatusChange: boolean;
  requestCreate: boolean;
  requestUpdate: boolean;
  requestDelete: boolean;
  requestStatusChange: boolean;
  userCreate: boolean;
  userUpdate: boolean;
  userDelete: boolean;
  roleCreate: boolean;
  roleUpdate: boolean;
  roleDelete: boolean;
  worktimeStart: boolean;
  worktimeStop: boolean;
  worktimeAutoStop: boolean;
  worktimeManagerStop: boolean;
}

// ------ Worktime und Branch ------
export interface WorkTime {
  id: number;
  startTime: Date | string;
  endTime?: Date | string | null;
  branchId: number;
  userId: number;
  branch: {
    id: number;
    name: string;
  };
  notes?: string;
}

export interface MobileWorkTime extends WorkTime {
  offlineId?: string;
  synced?: boolean;
  notes?: string;
  active?: boolean;
}

export interface WorkTimeStatistics {
  totalHours: number;
  daysWorked: number;
  averageHoursPerDay: number;
  weeklyData: {
    day: string;
    hours: number;
    date: string;
  }[]
}

export interface Branch {
  id: number;
  name: string;
  address?: string;
  city?: string;
  zipCode?: string;
  country?: string;
  phoneNumber?: string;
  email?: string;
  isActive: boolean;
}

// ------ Dokumente ------
export interface Document {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  entityType?: string;
  entityId?: number;
  uploadedAt: string | Date;
  uploadedBy?: User;
  uploadedById: number;
}

// ------ Auth ------
export interface AuthResponse {
  message: string;
  token: string;
  refreshToken?: string;
  user: User;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

// ------ API-Antworten ------
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// ------ Paginierung ------
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ------ Filter-Optionen ------
export interface FilterOptions {
  [key: string]: string | number | boolean | Date | undefined;
} 