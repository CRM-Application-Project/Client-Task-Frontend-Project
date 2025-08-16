export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'DEMO' | 'NEGOTIATIONS' | 'CLOSED_WON' | 'CLOSED_LOST';
export type LeadPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type LeadSource = 'WEBSITE' | 'REFERRAL' | 'SOCIAL_MEDIA' | 'EMAIL' | 'PHONE' | 'EVENT' | 'OTHER';

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  location: string;
  status: LeadStatus;
  priority: LeadPriority;
  source: LeadSource;
  assignedTo: string;
  assignedToAvatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadFilters {
  priority?: LeadPriority;
  status?: LeadStatus;
  source?: LeadSource;
  assignedTo?: string;
}