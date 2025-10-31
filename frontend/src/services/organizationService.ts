import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { 
  Organization, 
  OrganizationJoinRequest,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  CreateJoinRequestRequest,
  ProcessJoinRequestRequest
} from '../types/organization';

export const organizationService = {
  // Aktuelle Organisation abrufen
  getCurrentOrganization: async (): Promise<Organization> => {
    const response = await axiosInstance.get(API_ENDPOINTS.ORGANIZATIONS.CURRENT);
    return response.data;
  },

  // Organisation erstellen
  createOrganization: async (data: CreateOrganizationRequest): Promise<Organization> => {
    const response = await axiosInstance.post(API_ENDPOINTS.ORGANIZATIONS.BASE, data);
    return response.data;
  },

  // Organisation aktualisieren
  updateOrganization: async (data: UpdateOrganizationRequest): Promise<Organization> => {
    const response = await axiosInstance.put(API_ENDPOINTS.ORGANIZATIONS.CURRENT, data);
    return response.data;
  },

  // Organisationen suchen
  searchOrganizations: async (search: string): Promise<Organization[]> => {
    const response = await axiosInstance.get(API_ENDPOINTS.ORGANIZATIONS.SEARCH, {
      params: { search }
    });
    return response.data;
  },

  // Beitrittsanfrage erstellen
  createJoinRequest: async (data: CreateJoinRequestRequest): Promise<OrganizationJoinRequest> => {
    const response = await axiosInstance.post(API_ENDPOINTS.ORGANIZATIONS.JOIN_REQUEST, data);
    return response.data;
  },

  // Beitrittsanfragen abrufen
  getJoinRequests: async (): Promise<OrganizationJoinRequest[]> => {
    const response = await axiosInstance.get(API_ENDPOINTS.ORGANIZATIONS.JOIN_REQUESTS);
    return response.data;
  },

  // Beitrittsanfrage bearbeiten
  processJoinRequest: async (id: number, data: ProcessJoinRequestRequest): Promise<OrganizationJoinRequest> => {
    const response = await axiosInstance.patch(
      API_ENDPOINTS.ORGANIZATIONS.PROCESS_JOIN_REQUEST(id), 
      data
    );
    return response.data;
  },

  // Organisation-Statistiken abrufen
  getOrganizationStats: async (): Promise<any> => {
    const response = await axiosInstance.get(API_ENDPOINTS.ORGANIZATIONS.STATS);
    return response.data;
  }
}; 