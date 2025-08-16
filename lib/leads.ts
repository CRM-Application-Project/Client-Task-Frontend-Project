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
  status: LeadStatus;   // or: string if you don't want enums
  priority: LeadPriority; // or: string
  source: LeadSource;   // or: string
  assignedTo: string;
  transferredTo?: string; // <-- added
  assignedToAvatar?: string;
  createdAt: Date;
  updatedAt: Date;

  leadLabel?: string;
  leadReference?: string;
}


export interface LeadFilters {
  priority?: LeadPriority;
  status?: LeadStatus;
  source?: LeadSource;
  assignedTo?: string;
}


// types/lead.ts
export interface ImportLeadResponse {
  isSuccess: boolean;
  message: string;
  data: {
    statusCode: number;
    message: string;
  };
}

// interfaces.ts
export interface AddFollowUpRequest {
  leadId: string;
  nextFollowUpDate: string;
  followUpType: string; // simple string
  comment: string;
}

export interface AddFollowUpResponse {
  isSuccess: boolean;
  message: string;
  data: {
    statusCode: number;
    message: string;
  };
}


// Lead Transfer Request
export interface LeadTransferRequest {
  leadId: string;
  transferTo: string;
}

// Lead Transfer Response
export interface LeadTransferResponse {
  isSuccess: boolean;
  message: string;
  data: {
    statusCode: number;
    message: string;
  };
}