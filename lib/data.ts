export interface TaskStage {
  id: number;
  name: string;
}

export interface TaskStagesDropdownResponse {
  isSuccess: boolean;
  message: string;
  data: TaskStage[];
}

export interface FilterLeadsParams {
  startDate?: string | null;
  endDate?: string | null;
  leadLabel?: string | null;
  leadSource?: string | null;
  assignedTo?: string | null;
  sortBy?: string | null;
  direction?: "asc" | "desc" | null;
  
}

export interface FilterLeadsResponse {
  isSuccess: boolean;
  message: string;
  data: Lead[];
}


export interface CreateLeadRequest {
  leadStatus: LeadStatus;
  leadSource: LeadSource;
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