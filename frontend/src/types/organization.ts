export interface Organization {
  id: number;
  name: string;
  displayName: string;
  domain?: string | null;
  logo?: string | null;
  isActive: boolean;
  maxUsers: number;
  subscriptionPlan: 'basic' | 'pro' | 'enterprise' | 'trial';
  subscriptionEnd?: string | null;
  country?: string | null; // Land der Organisation (z.B. "CO" für Kolumbien)
  nit?: string | null; // NIT (Número de Identificación Tributaria) für Kolumbien
  settings?: OrganizationSettings;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationJoinRequest {
  id: number;
  organizationId: number;
  organization: {
    id: number;
    name: string;
    displayName: string;
    logo?: string;
  };
  requesterId: number;
  requester: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  message?: string | null;
  response?: string | null;
  processedBy?: number | null;
  processor?: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
  processedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationRequest {
  name: string;
  displayName: string;
  domain?: string;
}

export interface OrganizationSettings {
  // SMTP Settings (bestehend)
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFromEmail?: string;
  smtpFromName?: string;
  
  // LobbyPMS Settings
  lobbyPms?: {
    apiUrl?: string;
    apiKey?: string;
    propertyId?: string;
    syncEnabled?: boolean;
    autoCreateTasks?: boolean;
    lateCheckInThreshold?: string;
    notificationChannels?: ('email' | 'whatsapp')[];
  };
  
  // Door System Settings (TTLock)
  doorSystem?: {
    provider?: 'ttlock';
    apiUrl?: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    lockIds?: string[];
  };
  
  // SIRE Settings
  sire?: {
    apiUrl?: string;
    apiKey?: string;
    apiSecret?: string;
    enabled?: boolean;
    autoRegisterOnCheckIn?: boolean;
    propertyCode?: string;
  };
  
  // Bold Payment Settings
  boldPayment?: {
    apiKey?: string;
    merchantId?: string;
    environment?: 'sandbox' | 'production';
  };
  
  // WhatsApp Settings
  whatsapp?: {
    provider?: 'twilio' | 'whatsapp-business-api';
    apiKey?: string;
    apiSecret?: string;
    phoneNumberId?: string;
    businessAccountId?: string;
  };
  
  // Weitere Settings können hier hinzugefügt werden
  [key: string]: any;
}

export interface UpdateOrganizationRequest {
  displayName?: string;
  domain?: string;
  logo?: string;
  country?: string | null;
  nit?: string | null;
  settings?: OrganizationSettings;
}

export interface CreateJoinRequestRequest {
  organizationName: string;
  message?: string;
}

export interface ProcessJoinRequestRequest {
  action: 'approve' | 'reject';
  response?: string;
  roleId?: number;
} 