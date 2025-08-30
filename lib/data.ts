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
  message: string;
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
  finalStage: boolean;
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


// types/task.ts
export interface TaskDecisionRequest {
  isAccept: boolean;
  comment: string;
}

export interface TaskDecisionResponse {
  isSuccess: boolean;
  message: string;
  data: string; // e.g. "Task has been reviewed and accepted"
}


// types/task.ts
export interface TaskDiscussionCommentRequest {
  message: string;
  mentions: string[]; // array of user IDs
}

export interface Mention {
  id: number;
  isRead: boolean;
  mentioned: {
    id: string;
    label: string;
  };
  readAt: string | null;
}



export interface TaskDiscussionCommentResponse {
  isSuccess: boolean;
  message: string;
  data: TaskDiscussionComment;
}


// types/task.ts
export interface PaginationMeta {
  totalPages: number;
  totalElements: number;
  pageSize: number;
  pageIndex: number;
  numberOfElementsInThePage: number;
}

export interface TaskDiscussionFilterResponse {
  isSuccess: boolean;
  message: string;
  data: PaginationMeta & {
    content: TaskDiscussionComment[];
  };
}
// types/task.ts
export interface PaginationMeta {
  totalPages: number;
  totalElements: number;
  pageSize: number;
  pageIndex: number;
  numberOfElementsInThePage: number;
}

export interface TaskDiscussionAuthor {
  id: string;
  label: string;
}

export interface TaskDiscussionFile {
  id: number;
  fileName: string;
  filetype: string;
}

export interface TaskDiscussionMention {
  id: number;
  isRead: boolean;
  mentioned: TaskDiscussionAuthor;
  readAt: string | null;
}

export interface TaskDiscussionReaction {
  id: number | null;
  reactedBy: TaskDiscussionAuthor;
  reaction: string; // e.g., "LIKE", "HEART"
  createdAt: string;
}

export interface TaskDiscussionComment {
  id: number;
  parentId: number | null;
  author: TaskDiscussionAuthor;
  message: string;
  createdAt: string;
  replyCount: number;
  isDeletable: boolean;
  mentions: TaskDiscussionMention[];
  reactions: TaskDiscussionReaction[];
  files: TaskDiscussionFile[];
}

export interface PaginationMeta {
  totalPages: number;
  totalElements: number;
  pageSize: number;
  pageIndex: number;
  numberOfElementsInThePage: number;
}

export interface TaskDiscussionFilterResponse {
  isSuccess: boolean;
  message: string;
  data: PaginationMeta & {
    content: TaskDiscussionComment[];
  };
}


export interface Mention {
  userId: number;
  userName: string;
}




export interface TaskDiscussionReactionRequest {
  reactionType: "LIKE" | "HEART" | "LAUGH" | "CLAP" | string; // extend as needed
}

export interface TaskDiscussionReactionResponse {
  isSuccess: boolean;
  message: string;
  data: {
    id: string | null;
    reactedBy: {
      id: string;
      label: string;
    };
    reaction: string;
    createdAt: string;
  };
}