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
  leadStatus?: string | null;
  leadPriority?: string | null;
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
  companyEmailAddress?: string;
  customerName: string;
  customerEmailAddress: string;
  leadLabel?: string;
  leadReference?: string;
  leadAddress?: string;
  comment: string;
}



export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  isSuccess: boolean;
  message: string;
}


export interface UpdateUserResponse {
  isSuccess: boolean;
  message: string;
  data: {
    userId: string;
    firstName?: string;
    lastName?: string;
    emailAddress?: string;
    contactNumber?: string;
    dateOfBirth?: string;
    dateOfJoin?: string;
    departmentId?: number;
    departmentName?: string;
    isActive?: boolean;
    isPasswordUpdated?: boolean;
    modules?: {
      id: number;
      moduleId: number;
      moduleName: string;
      canView: boolean;
      canEdit: boolean;
      canDelete: boolean;
      createdAt: string;
      updatedAt: string;
    }[];
    createdAt: string;
    updatedAt: string;
  };
}

export interface UpdateUserRequest {
  userRole?: string;
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  contactNumber?: string;
  dateOfBirth?: string;   // ISO date string
  dateOfJoin?: string;    // ISO date string
  password?: string;
  departmentId?: number;
  isActive?: boolean;
}


export interface LoginRequestData {
  emailAddress: string;
  password: string;
  deviceType: string;
  accessRegion: string;
  companyName?: string;
}

export interface UserModule {
  id: number;
  moduleId: number;
  moduleName: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  contactNumber: string;
  dateOfBirth: string | null;
  dateOfJoin: string | null;
  userRole: string;
  departmentId: number | null;
  departmentName: string | null;
  isActive: boolean;
  isPasswordUpdated: boolean;
  modules: UserModule[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokenResponse {
  token: string | null;
  refreshToken: string | null;
}

export interface LoginResponse {
  isSuccess: boolean;
  message: string;
  data: {
    profileResponse: UserProfile;
    authTokenResponse: AuthTokenResponse;
  };
}

export interface UsersListResponse {
  isSuccess: boolean;
  message: string;
  data: UserProfile[];
}



// Generate OTP
export interface GenerateOtpRequest {
  emailAddress: string;
  deviceType: string;
}

export interface GenerateOtpResponse {
  isSuccess: boolean;
  message: string;
  data: {
    id: number;
    status: string; // "SENT"
  };
}

// Verify OTP
export interface VerifyOtpRequest {
  id: number;
  otp: string;
  deviceType: string;
}

export interface VerifyOtpResponse {
  isSuccess: boolean;
  message: string;
  data: {
    id: number;
    status: string; // "VERIFIED"
  };
}


export interface ResetRequest {
  otpId: number;
  userEmail: string;
  password: string;
  deviceType: string;
}

export interface ResetResponse {
  isSuccess: boolean;
  message: string;
  data: {
    statusCode: number;
    message: string;
  };
}




// types/track.ts
export interface LeadTrack {
  actionBy: string;
  actionTime: string; // ISO timestamp
  actionDescription: string;
}

export interface FetchLeadTrackResponse {
  isSuccess: boolean;
  message: string;
  data: LeadTrack[];
}



export interface CreateLeadStageRequest {
  leadStageName: string;
  leadStageDescription: string;
  leadStagePriority: number;
}

// Response type
export interface CreateLeadStageResponse {
  isSuccess: boolean;
  message: string;
  data: {
    statusCode: number;
    message: string;
  };
}


export interface LeadStage {
  leadStageId: string;
  leadStageName: string;
  leadStageDescription: string;
  leadStagePriority: number;
  createdAt: string;
  updatedAt: string;
}

export interface FetchLeadStagesResponse {
  isSuccess: boolean;
  message: string;
  data: LeadStage[];
}

export interface UpdateLeadStageRequest {
  leadStageId: string;
  leadStageName: string;
  leadStageDescription: string;
  leadStagePriority: number;
}

export interface UpdateLeadStageResponse {
  isSuccess: boolean;
  message: string;
  data: {
    statusCode: number;
    message: string;
  };
}