import { Client } from './client';

export interface MonthlyConsultationReport {
  id: number;
  reportNumber: string;
  periodStart: string;
  periodEnd: string;
  recipient: string;
  totalHours: number;
  currency: string;
  status: 'GENERATED' | 'SENT' | 'ARCHIVED';
  generatedAt: string;
  pdfPath?: string | null;
  userId: number;
  items?: MonthlyConsultationReportItem[];
}

export interface MonthlyConsultationReportItem {
  id: number;
  reportId: number;
  clientId: number;
  clientName: string;
  totalHours: number;
  consultationCount: number;
  client?: {
    id: number;
    name: string;
  };
}

export interface GenerateMonthlyReportRequest {
  periodStart: string;
  periodEnd: string;
  recipient: string;
}

export interface UpdateReportStatusRequest {
  status: MonthlyReportStatus;
}

export interface UnbilledConsultationsCheck {
  count: number;
  hasUnbilledConsultations: boolean;
  preview?: Array<{
    id: number;
    startTime: string;
    endTime: string | null;
    client: {
      id: number;
      name: string;
    } | null;
  }>;
}

export interface MonthlyReportSettings {
  monthlyReportEnabled: boolean;
  monthlyReportDay: number;
  monthlyReportRecipient?: string;
}

export type MonthlyReportStatus = 'GENERATED' | 'SENT' | 'ARCHIVED'; 