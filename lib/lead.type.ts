type LeadStatus = string;

type LeadPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type LeadSource =
  | "WEBSITE"
  | "REFERRAL"
  | "SOCIAL_MEDIA"
  | "EMAIL"
  | "PHONE"
  | "EVENT"
  | "OTHER";

interface CreateLeadRequest {
  leadStatus: LeadStatus;
  leadSource: LeadSource;
  leadAddedBy: string;
  customerMobileNumber?: string;
  companyEmailAddress: string;
  customerName: string;
  companyName: string;
  customerEmailAddress: string;
  leadLabel?: string;
  leadReference?: string;
  leadPriority?: LeadPriority;
  leadAddress?: string;
  comment: string;
}

interface CreateLeadResponse {
  isSuccess: boolean;
  message: string;
  data: {
    statusCode: number;
    message: string;
  };
}

interface Lead {
  leadId: string;
  leadStatus: string;
  leadSource: string;
  leadAddedBy: string;
  leadAssignedTo: string | null;
  companyName: string | null;
  companyEmailAddress: string;
  customerMobileNumber: string;
  customerEmailAddress: string;
  customerName: string;
  leadPriority: LeadPriority;
  leadLabel: string;
  leadReference: string;
  leadAddress: string;
  comment: string;
  leadFollowUp: string;
  nextFollowUpDate: string | null;
  createdAt: string;
  updatedAt: string;
  assignedToName?: string;
}

interface PaginatedLeadsResponse {
  isSuccess: boolean;
  message: string;
  data: {
    items: Lead[];
    currentPage: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    lastPage: boolean;
  };
}

interface GetLeadByIdResponse {
  isSuccess: boolean;
  message: string;
  data: Lead;
}

interface UpdateLeadRequest {
  leadId: string;
  leadStatus: string;
  leadSource: string;
  leadAddedBy: string;
  customerMobileNumber: string;
  companyEmailAddress: string;
  customerName: string;
  customerEmailAddress: string;
  leadLabel: string;
  leadReference: string;
  leadAddress: string;
  comment: string;
  leadPriority: LeadPriority;
}

interface UpdateLeadResponse {
  isSuccess: boolean;
  message: string;
  data: {
    statusCode: number;
    message: string;
  };
}

interface DeleteLeadResponse {
  isSuccess: boolean;
  message: string;
  data: {
    statusCode: number;
    message: string;
  };
}