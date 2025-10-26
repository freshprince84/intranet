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
  settings?: any;
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

export interface UpdateOrganizationRequest {
  displayName?: string;
  domain?: string;
  logo?: string;
  settings?: any;
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