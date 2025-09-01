type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "PROPOSAL"
  | "DEMO"
  | "NEGOTIATIONS"
  | "CLOSED_WON"
  | "CLOSED_LOST";
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
  leadAssignedTo: string;
  customerMobileNumber: string;
  companyEmailAddress: string;
  customerName: string;
  customerEmailAddress: string;
  leadAddress: string;
  comment?: string;
  leadLabel?: string;
  leadReference?: string;
  leadPriority: LeadPriority;
  company?: string;
  createdAt: string;
  updatedAt: string;
  assignedToName?: string;
}

interface GetAllLeadsResponse {
  isSuccess: boolean;
  message: string;
  data: Lead[];
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
