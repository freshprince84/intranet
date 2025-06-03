export interface Client {
  id: number;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastConsultationDate?: string;
  status?: 'past' | 'planned';
}

export interface Consultation {
  id: number;
  startTime: string;
  endTime: string | null;
  branchId: number;
  userId: number;
  clientId: number | null;
  notes: string | null;
  monthlyReportId?: number | null;
  branch: {
    id: number;
    name: string;
  };
  client: Client | null;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  taskLinks?: {
    id: number;
    task: {
      id: number;
      title: string;
      status: string;
    };
  }[];
  invoiceItems?: {
    id: number;
    invoice: {
      id: number;
      invoiceNumber: string;
      status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
      issueDate: string;
      total: number;
    };
  }[];
  monthlyReport?: {
    id: number;
    reportNumber: string;
    status: 'GENERATED' | 'SENT' | 'ARCHIVED';
  } | null;
} 