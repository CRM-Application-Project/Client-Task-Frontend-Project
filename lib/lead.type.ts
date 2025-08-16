interface CreateLeadRequest {
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
  customerMobileNumber: string;
  companyEmailAddress: string;
  customerName: string;
  customerEmailAddress: string;
  leadLabel: string;
  leadReference: string;
  leadAddress: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
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
