import {
  ChangePasswordRequest,
  ChangePasswordResponse,
  CreateLeadStageRequest,
  CreateLeadStageResponse,
  FetchLeadStagesResponse,
  FetchLeadTrackResponse,
  FilterLeadsParams,
  FilterLeadsResponse,
  GenerateOtpRequest,
  GenerateOtpResponse,
  LoginRequestData,
  LoginResponse,
  ResetRequest,
  ResetResponse,
  TaskDecisionRequest,
  TaskDecisionResponse,
  TaskDiscussionCommentRequest,
  TaskDiscussionCommentResponse,
  TaskDiscussionFilterResponse,
  TaskDiscussionReactionRequest,
  TaskDiscussionReactionResponse,
  TaskStagesDropdownResponse,
  UpdateLeadStageRequest,
  UpdateLeadStageResponse,
  UpdateUserRequest,
  UpdateUserResponse,

  VerifyOtpRequest,
  VerifyOtpResponse,
} from "@/lib/data";
import { API_CONSTANTS } from "./api.route";
import {
  deleteRequest,
  getRequest,
  postRequest,
  putRequest,
  patchRequest,
  postRequestFormData,
} from "./httpServices";
import {
  AddFollowUpRequest,
  AddFollowUpResponse,
  ImportLeadResponse,
  LeadTransferRequest,
  LeadTransferResponse,
} from "@/lib/leads";
import {
  GenerateBrandResponse,
  RegisterRequestData,
  RegisterResponse,
} from "@/lib/color";
import axios from "axios";
import { BASE_URL } from "../http-common";


export const registerUser = async (
  registerData: RegisterRequestData,
  logoFile?: File // add an optional File parameter
): Promise<RegisterResponse> => {
  const formData = new FormData();

  // Append JSON request
  const jsonBlob = new Blob([JSON.stringify(registerData)], {
    type: "application/json",
  });
  formData.append("request", jsonBlob);

  // Append logo if provided
  if (logoFile) {
    formData.append("logo", logoFile);
  }

  const res = await axios.post(`${BASE_URL}/register`, formData, {
    withCredentials: true,
    // DO NOT set Content-Type; Axios handles multipart/form-data
  });

  return res.data as RegisterResponse;
};

export const verifyUser = async (
  subDomainName: string,
  deviceType: string = "web"
): Promise<VerifyUserResponse> => {
  const baseUrl = "/verify";

  // Build query params
  const params = new URLSearchParams();
  params.append("deviceType", deviceType);
  params.append("subDomainName", subDomainName);

  const url = `${baseUrl}?${params.toString()}`;

  console.log("Final URL:", url);

  const res = await getRequest(url, {});

  return res as VerifyUserResponse;
};
export const loginUser = async (
  loginData: LoginRequestData
): Promise<LoginResponse> => {
  const res = await postRequest(API_CONSTANTS.USER.LOGIN, loginData);
  return res as LoginResponse;
};

export const createTask = async (
  taskData: CreateTaskRequest
): Promise<CreateTaskResponse> => {
  const res = await postRequest(API_CONSTANTS.TASK.CREATE, taskData);
  return res as CreateTaskResponse;
};

// ---- Types ----
export interface TaskActionData {
  id: number;
  startTime: string | null;
  endTime: string | null;
  userId: string;
  estimatedHours: number;
  hoursSpent: number | null;
  endDate: string | null;
}

export interface TaskActionResponse {
  isSuccess: boolean;
  message: string;
  data: TaskActionData;
}

// ---- APIs ----

// Start Task (no request body)
export const startTask = async (
  taskId: string
): Promise<TaskActionResponse> => {
  const res = await postRequest(API_CONSTANTS.TASK.START(taskId));
  return res as TaskActionResponse;
};

export const stopTask = async (
  taskId: string,
  body: { comment: string }
): Promise<TaskActionResponse> => {
  const res = await postRequest(API_CONSTANTS.TASK.STOP(taskId), body);
  return res as TaskActionResponse;
};

export const updateTask = async (
  taskId: number,
  updateData: Partial<UpdateTaskRequest>
): Promise<UpdateTaskResponse> => {
  // Log the partial update data for debugging
  console.log(`Updating task ${taskId} with partial data:`, updateData);

  // Only send fields that are present in updateData
  const filteredData = Object.entries(updateData).reduce(
    (acc, [key, value]) => {
      // Include field if value is not undefined
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    },
    {} as Record<string, any>
  );

  console.log("Filtered update payload:", filteredData);

  const url = API_CONSTANTS.TASK.UPDATE.replace("{taskId}", String(taskId));
  const res = await putRequest(url, filteredData);
  return res as UpdateTaskResponse;
};

export const getTaskById = async (
  taskId: number
): Promise<GetTaskByIdResponse> => {
  const url = API_CONSTANTS.TASK.GET_BY_ID.replace("{taskId}", String(taskId));
  const res = await getRequest(url);
  return res as GetTaskByIdResponse;
};
export const getLeadById = async (
  leadId: string // Changed from number to string since leadId is like "LD-ID3142"
): Promise<GetLeadByIdResponse> => {
  // Construct URL with query parameter
  const url = `${API_CONSTANTS.LEAD.GET_BY_ID}?leadId=${encodeURIComponent(
    leadId
  )}`;

  const res = await getRequest(url);
  return res as GetLeadByIdResponse;
};

export const deleteTask = async (
  taskId: number
): Promise<DeleteTaskResponse> => {
  const url = API_CONSTANTS.TASK.DELETE.replace("{taskId}", String(taskId));
  const res = await deleteRequest(url);
  return res as DeleteTaskResponse;
};

export const filterTasks = async (
  params: FilterTasksParams
): Promise<FilterTasksResponse> => {
  const query = new URLSearchParams();

  if (params.searchTerm) query.append("searchTerm", params.searchTerm);
  if (params.priorities) query.append("priorities", params.priorities);
  if (params.stageIds) query.append("stageIds", params.stageIds);
  if (params.assigneeIds) query.append("assigneeIds", params.assigneeIds);
  if (params.startDateFrom) query.append("startDateFrom", params.startDateFrom);
  if (params.startDateTo) query.append("startDateTo", params.startDateTo);
  if (params.endDateFrom) query.append("endDateFrom", params.endDateFrom);
  if (params.endDateTo) query.append("endDateTo", params.endDateTo);
  if (params.page !== undefined) query.append("page", String(params.page));
  if (params.limit !== undefined) query.append("limit", String(params.limit));
  if (params.sortDirection) query.append("sortDirection", params.sortDirection);

  const url = `${API_CONSTANTS.TASK.FILTER}?${query.toString()}`;
  const res = await getRequest(url);
  return res as FilterTasksResponse;
};

export const filterLeads = async (
  params: FilterLeadsParams
): Promise<FilterLeadsResponse> => {
  const query = new URLSearchParams();

  // Only append parameters that have values
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      query.append(key, value.toString());
    }
  });

  const url = `${API_CONSTANTS.LEAD.GET_ALL_WITH_FILTERS}?${query.toString()}`;
  console.log("Filter API URL:", url);
  const res = await getRequest(url);
  return res as FilterLeadsResponse;
};
export interface Department {
  id: number;
  name: string;
  description: string;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetDepartmentResponse {
  isSuccess: boolean;
  message: string;
  data: Department[];
}

export const getDepartments = async (): Promise<GetDepartmentResponse> => {
  const res = await getRequest(API_CONSTANTS.DEPARTMENT.GET_DEPARTMENTS);
  return res as GetDepartmentResponse;
};

export const getDepartmentById = async (id: number): Promise<Department> => {
  const res = await getRequest(API_CONSTANTS.DEPARTMENT.GET_DEPARTMENT(id));
  return (res as { data: Department }).data;
};

export interface CreateDepartmentPayload {
  name: string;
  description?: string;
}

export interface CreateDepartmentResponse {
  isSuccess: boolean;
  message: string;
  data: {
    id: number;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
  };
}

export const createDepartment = async (
  payload: CreateDepartmentPayload
): Promise<CreateDepartmentResponse> => {
  const res = await postRequest(
    API_CONSTANTS.DEPARTMENT.CREATE_DEPARTMENT,
    payload
  );
  return res as CreateDepartmentResponse;
};

// types.ts (optional but recommended)
export interface UpdateDepartmentPayload {
  name: string;
  description?: string;
}

export interface DepartmentResponse {
  isSuccess: boolean;
  message: string;
  data: {
    id: number;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
  };
}

export const updateDepartment = async (
  id: number,
  payload: UpdateDepartmentPayload
): Promise<DepartmentResponse> => {
  const res = await patchRequest(
    API_CONSTANTS.DEPARTMENT.UPDATE_DEPARTMENT(id),
    payload
  );
  return res as DepartmentResponse;
};

export const deleteDepartment = async (
  id: number
): Promise<DepartmentResponse> => {
  const res = await deleteRequest(
    API_CONSTANTS.DEPARTMENT.DELETE_DEPARTMENT(id)
  );
  return res as DepartmentResponse;
};

export interface ModuleAccess {
  moduleId: number;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
}

export interface CreateStaffUserPayload {
  firstName: string;
  lastName: string;
  emailAddress: string;
  contactNumber: string;
  userRole: string;
  dateOfBirth: string; // Format: YYYY-MM-DD
  dateOfJoin: string; // Format: YYYY-MM-DD
  departmentId: number;
  isActive: boolean;
  moduleAccess: ModuleAccess[];
}

export interface CreateStaffUserResponse {
  isSuccess: boolean;
  message: string;
  data: {
    id: number;
    firstName: string;
    lastName: string;
    emailAddress: string;
    contactNumber: string;
    userRole: string;
    dateOfBirth: string;
    dateOfJoin: string;
    departmentId: number;
    isActive: boolean;
    moduleAccess: ModuleAccess[];
    createdAt: string;
    updatedAt: string;
  };
}

export const createStaffUser = async (
  payload: CreateStaffUserPayload
): Promise<CreateStaffUserResponse> => {
  const res = await postRequest(API_CONSTANTS.STAFF.CREATE_USER, payload);
  return res as CreateStaffUserResponse;
};

export interface Module {
  id: number;
  name: string;
}

export interface ModuleDropdownResponse {
  isSuccess: boolean;
  message: string;
  data: Module[];
}

export const getModuleDropdown = async (): Promise<ModuleDropdownResponse> => {
  const res = await getRequest(API_CONSTANTS.MODULE.MODULE_DROPDOWN);
  return res as ModuleDropdownResponse;
};

export interface ModuleAccesses {
  id: number;
  moduleId: number;
  moduleName: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  userId: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  contactNumber: string;
  dateOfBirth: string;
  dateOfJoin: string;
  userRole: string;
  departmentId: number;
  departmentName: string;
  isActive: boolean;
  isPasswordUpdated: boolean;
  modules: ModuleAccesses[];
  createdAt: string;
  updatedAt: string;
}

export interface GetUsersResponse {
  isSuccess: boolean;
  message: string;
  data: User[];
}

export const getUsers = async (): Promise<GetUsersResponse> => {
  const res = await getRequest(API_CONSTANTS.STAFF.GET_USERS);
  return res as GetUsersResponse;
};

export type UpdateUserPayload = Partial<{
  firstName: string;
  lastName: string;
  emailAddress: string;
  contactNumber: string;
  userRole: string;
  dateOfBirth: string;
  dateOfJoin: string;
  departmentId: number;
  isActive: boolean;
}>;

export interface UserResponse {
  isSuccess: boolean;
  message: string;
  data: {
    userId: string;
    firstName: string;
    lastName: string;
    emailAddress: string;
    contactNumber: string;
    userRole: string;
    dateOfBirth: string;
    departmentId: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export const updateUser = async (
  userId: string,
  payload: UpdateUserPayload
): Promise<UserResponse> => {
  const res = await putRequest(
    API_CONSTANTS.STAFF.UPDATE_USER(userId),
    payload
  );
  return res as UserResponse;
};

export const toggleUserStatus = async (
  userId: string
): Promise<UserResponse> => {
  const res = await patchRequest(
    API_CONSTANTS.STAFF.TOGGLE_USER_STATUS(userId),
    {}
  );
  return res as UserResponse;
};

export const getTaskStagesDropdown =
  async (): Promise<TaskStagesDropdownResponse> => {
    const res = await getRequest(API_CONSTANTS.TASK.DROPDOWN);
    return res as TaskStagesDropdownResponse;
  };

export const createLead = async (
  leadData: CreateLeadRequest
): Promise<CreateLeadResponse> => {
  const res = await postRequest(API_CONSTANTS.LEAD.CREATE, leadData);
  return res as CreateLeadResponse;
};

interface GetLeadsParams {
  page: number;
  size: number;
}

export const getAllLeads = async (params: GetLeadsParams): Promise<PaginatedLeadsResponse> => {
  const queryParams = new URLSearchParams({
    page: params.page.toString(),
    size: params.size.toString()
  });
  
  const url = `${API_CONSTANTS.LEAD.GET_ALL}?${queryParams.toString()}`;
  const res = await getRequest(url);
  return res as PaginatedLeadsResponse;
};
export const updateLead = async (
  payload: UpdateLeadRequest
): Promise<UpdateLeadResponse> => {
  const res = await putRequest(API_CONSTANTS.LEAD.UPDATE, payload);
  return res as UpdateLeadResponse;
};

export const deleteLeadById = async (
  leadId: string
): Promise<DeleteLeadResponse> => {
  const url = `${API_CONSTANTS.LEAD.DELETE_BY_ID}?leadId=${leadId}`;
  const res = await deleteRequest(url);
  return res as DeleteLeadResponse;
};

export const importLead = async (
  file: File,
  leadStatus: string,
  leadAddedBy: string
): Promise<ImportLeadResponse> => {
  const formData = new FormData();
  formData.append("leadStatus", leadStatus);
  formData.append("leadAddedBy", leadAddedBy);
  formData.append("file", file);

  const res = await postRequest(API_CONSTANTS.LEAD.IMPORT_LEAD, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res as ImportLeadResponse;
};

export const addFollowUp = async (
  payload: AddFollowUpRequest
): Promise<AddFollowUpResponse> => {
  const res = await postRequest(API_CONSTANTS.LEAD.ADD_FOLLOWUP, payload);
  return res as AddFollowUpResponse;
};

export const leadTransfer = async (
  payload: LeadTransferRequest
): Promise<LeadTransferResponse> => {
  const res = await postRequest(API_CONSTANTS.LEAD.LEAD_TRANSFER, payload);
  return res as LeadTransferResponse;
};
export interface GrantModuleAccessPayload {
  moduleAccess: ModuleAccess[];
}

export interface GrantModuleAccessResponse {
  isSuccess: boolean;
  message: string;
  data: {
    userId: string;
    firstName: string;
    lastName: string;
    emailAddress: string;
    contactNumber: string;
    userRole: string;
    dateOfBirth: string;
    dateOfJoin: string;
    departmentId: number;
    isActive: boolean;
    modules: ModuleAccesses[];
    createdAt: string;
    updatedAt: string;
  };
}

export const grantModuleAccess = async (
  userId: string,
  payload: GrantModuleAccessPayload
): Promise<GrantModuleAccessResponse> => {
  const res = await postRequest(
    API_CONSTANTS.STAFF.GRANT_MODULE_ACCESS(userId),
    payload
  );
  return res as GrantModuleAccessResponse;
};

export interface UpdateModuleAccessPayload {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
}

export interface UpdateModuleAccessResponse {
  isSuccess: boolean;
  message: string;
  data: {
    id: number;
    moduleId: number;
    moduleName: string;
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canCreate: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export const updateModuleAccess = async (
  moduleAccessId: string,
  payload: UpdateModuleAccessPayload
): Promise<UpdateModuleAccessResponse> => {
  const res = await putRequest(
    API_CONSTANTS.STAFF.UPDATE_MODULES_ACCESS(moduleAccessId),
    payload
  );
  return res as UpdateModuleAccessResponse;
};

export interface RemoveModuleAccessResponse {
  isSuccess: boolean;
  message: string;
}

export const removeModuleAccess = async (
  moduleAccessId: string
): Promise<RemoveModuleAccessResponse> => {
  const res = await deleteRequest(
    API_CONSTANTS.STAFF.REMOVE_MODULE_ACCESS(moduleAccessId)
  );
  return res as RemoveModuleAccessResponse;
};

export interface AssignDropdown {
  id: string;
  label: string;
}

export interface GetAssignDropdownResponse {
  isSuccess: boolean;
  message: string;
  data: AssignDropdown[];
}

export const getAssignDropdown =
  async (): Promise<GetAssignDropdownResponse> => {
    const res = await getRequest(API_CONSTANTS.LEAD.ASSIGN_DROPDOWN);
    return res as GetAssignDropdownResponse;
  };

export const changePassword = async (
  userId: string,
  payload: ChangePasswordRequest
): Promise<ChangePasswordResponse> => {
  const endpoint = API_CONSTANTS.LEAD.CHANGE_PASSWORD.replace(
    ":userId",
    userId
  );
  const res = await postRequest(endpoint, payload);
  return res as ChangePasswordResponse;
};
export const updateUserProfile = async (
  userId: string,
  payload: UpdateUserRequest
): Promise<UpdateUserResponse> => {
  const endpoint = API_CONSTANTS.USER.UPDATE_USER.replace(":userId", userId);
  const res = await putRequest(endpoint, payload);
  return res as UpdateUserResponse;
};
interface UploadUrlRequest {
  fileName: string;
  fileType: string;
}

interface DocumentUrlData {
  docId: number;
  type: "UPLOAD" | "DOWNLOAD";
  fileName: string;
  fileType: string;
  url: string;
}

interface DocumentUrlResponse {
  isSuccess: boolean;
  message: string;
  data: DocumentUrlData;
}

interface DeleteDocumentResponse {
  isSuccess: boolean;
  message: string;
  data: null;
}

interface VerifyUploadResponse {
  isSuccess: boolean;
  message: string;
  data: any; // Add specific type based on your API response
}

// Document Service Functions
export const getDocumentUploadUrl = async (
  taskId: string,
  payload: UploadUrlRequest
): Promise<DocumentUrlResponse> => {
  const endpoint = API_CONSTANTS.TASK.DOCUMENT.UPLOAD_URL(taskId);
  const res = await postRequest(endpoint, payload);
  return res as DocumentUrlResponse;
};

export const verifyDocumentUpload = async (
  docId: string,
  payload?: any // Add specific payload type if needed
): Promise<VerifyUploadResponse> => {
  const endpoint = API_CONSTANTS.TASK.DOCUMENT.VERIFY_UPLOAD(docId);
  const res = await putRequest(endpoint, payload || {});
  return res as VerifyUploadResponse;
};

export const getDocumentDownloadUrl = async (
  docId: string
): Promise<DocumentUrlResponse> => {
  const endpoint = API_CONSTANTS.TASK.DOCUMENT.DOWNLOAD_URL(docId);
  const res = await getRequest(endpoint);
  return res as DocumentUrlResponse;
};

export const deleteDocument = async (
  docId: string
): Promise<DeleteDocumentResponse> => {
  const endpoint = API_CONSTANTS.TASK.DOCUMENT.DELETE(docId);
  const res = await deleteRequest(endpoint);
  return res as DeleteDocumentResponse;
};
// Add this interface and function to your existing data.service.ts file

// Add this interface to your existing types (preferably near other task-related types)
export interface CreateStageRequest {
  name: string;
  description: string;
  orderNumber: number;
}

export interface CreateStageResponse {
  isSuccess: boolean;
  message: string;
  data?: {
    id: number;
    name: string;
    description: string;
    orderNumber: number;
    createdAt: string;
    updatedAt: string;
  };
}

export const createTaskStage = async (
  stageData: CreateStageRequest
): Promise<CreateStageResponse> => {
  const res = await postRequest(API_CONSTANTS.TASK.ADD_STAGE, stageData);
  return res as CreateStageResponse;
};

export const createLeadStage = async (
  stageData: CreateLeadStageRequest
): Promise<CreateLeadStageResponse> => {
  const res = await postRequest(API_CONSTANTS.LEAD.CREATE_STAGE, stageData);
  return res as CreateLeadStageResponse;
};
export const fetchLeadStages = async (): Promise<FetchLeadStagesResponse> => {
  const res = await getRequest(API_CONSTANTS.LEAD.FETCH_STAGE);
  return res as FetchLeadStagesResponse;
};

export const updateLeadStage = async (
  stageData: UpdateLeadStageRequest
): Promise<UpdateLeadStageResponse> => {
  const res = await putRequest(API_CONSTANTS.LEAD.UPDATE_STAGE, stageData);
  return res as UpdateLeadStageResponse;
};

export interface DeleteLeadStageResponse {
  isSuccess: boolean;
  message: string;
  data: {
    statusCode: number;
    message: string;
  };
}

// Function to delete a lead stage by ID
export const deleteLeadStage = async (
  leadStageId: string
): Promise<DeleteLeadStageResponse> => {
  const url = `${API_CONSTANTS.LEAD.DELETE_STAGE}?leadStageId=${leadStageId}`;
  const res = await deleteRequest(url);
  return res as DeleteLeadStageResponse;
};
export interface ChangeLeadStatusRequest {
  leadId: string;
  leadStatus: string;
  message?: string;
}

export interface ChangeLeadStatusResponse {
  isSuccess: boolean;
  message: string;
  data?: {
    leadId: string;
    leadStatus: string;
    updatedAt: string;
  };
}

export const changeLeadStatus = async (
  payload: ChangeLeadStatusRequest
): Promise<ChangeLeadStatusResponse> => {
  const endpoint = API_CONSTANTS.LEAD.CHANGE_STATUS;
  const res = await postRequest(endpoint, payload);
  return res as ChangeLeadStatusResponse;
};

export interface RoleScope {
  role: string;
  scope: string;
}

export interface GetRoleScopeResponse {
  isSuccess: boolean;
  message: string;
  data: RoleScope[];
}

export const getRoleScopeDropdown = async (): Promise<GetRoleScopeResponse> => {
  const endpoint = API_CONSTANTS.STAFF.ROLE_SCOPE_DROPDOWN;
  const res = await getRequest(endpoint);
  return res as GetRoleScopeResponse;
};

// Generate OTP
export const generateOtp = async (
  payload: GenerateOtpRequest
): Promise<GenerateOtpResponse> => {
  const res = await postRequest(API_CONSTANTS.USER.GENERATE_OTP, payload);
  return res as GenerateOtpResponse;
};

// Verify OTP
export const verifyOtp = async (
  payload: VerifyOtpRequest
): Promise<VerifyOtpResponse> => {
  const res = await postRequest(API_CONSTANTS.USER.VERIFY_OTP, payload);
  return res as VerifyOtpResponse;
};

export const resetPassword = async (
  payload: ResetRequest
): Promise<ResetResponse> => {
  const res = await postRequest(API_CONSTANTS.USER.RESET, payload);
  return res as ResetResponse;
};

export const fetchLeadTrackById = async (
  leadId: string
): Promise<FetchLeadTrackResponse> => {
  const res = await getRequest(API_CONSTANTS.LEAD.TRACK_BY_LEAD_ID, {
    params: { leadId },
  });
  return res as FetchLeadTrackResponse;
};
// Update these interfaces to match the actual API response
export interface HistoryUpdateData {
  newValue: string;
  oldValue: string;
  fieldName: string;
}

export interface HistoryRecord {
  id: number;
  taskId: number;
  doneById: string;
  doneByName: string;
  eventType: string;
  note: string;
  updateData: HistoryUpdateData[] | null;
  createdAt: string;
}

export interface FilterHistoryParams {
  taskId: number;
  doneById?: string;
  eventTypes?: string;
  createdAfter?: string;
  createdBefore?: string;
  page?: number;
  limit?: number;
  sortDirection?: "asc" | "desc";
}

export interface FilterHistoryResponse {
  isSuccess: boolean;
  message: string;
  data: {
    totalPages: number;
    totalElements: number;
    pageSize: number;
    pageIndex: number;
    numberOfElementsInThePage: number;
    content: HistoryRecord[];
  };
}

// Update the filterHistory function to match the actual API response structure
export const filterHistory = async (
  params: FilterHistoryParams
): Promise<FilterHistoryResponse> => {
  const query = new URLSearchParams();

  // Always include taskId as it's required
  query.append("taskId", String(params.taskId));

  // Only append optional parameters if they have values
  if (params.doneById) query.append("doneById", params.doneById);
  if (params.eventTypes) query.append("eventTypes", params.eventTypes);
  if (params.createdAfter) query.append("createdAfter", params.createdAfter);
  if (params.createdBefore) query.append("createdBefore", params.createdBefore);
  if (params.page !== undefined) query.append("page", String(params.page));
  if (params.limit !== undefined) query.append("limit", String(params.limit));
  if (params.sortDirection !== undefined)
    query.append("sortDirection", String(params.sortDirection));

  const url = `${
    API_CONSTANTS.TASK.HISTORY.FILTER_HISTORY
  }?${query.toString()}`;
  const res = await getRequest(url);
  return res as FilterHistoryResponse;
};

// You might also want to update the events dropdown if needed
export interface HistoryEvent {
  id: number;
  name: string;
}

export interface HistoryEventsDropdownResponse {
  isSuccess: boolean;
  message: string;
  data: HistoryEvent[];
}

export const getHistoryEventsDropdown =
  async (): Promise<HistoryEventsDropdownResponse> => {
    const res = await getRequest(API_CONSTANTS.TASK.HISTORY.EVENTS_DROPDOWN);
    return res as HistoryEventsDropdownResponse;
  };
// Add these interfaces to your existing types
export interface ReorderStagesRequest {
  order: number[]; // Array of stage IDs in the desired order
}

export interface ReorderStagesResponse {
  isSuccess: boolean;
  message: string;
  data?: null; // Typically reorder operations don't return data
}

export interface UpdateStageRequest {
  name?: string;
  description?: string;
}

export interface UpdateStageResponse {
  isSuccess: boolean;
  message: string;
  data: {
    id: number;
    name: string;
    description: string;
    orderNumber: number;
    createdAt: string;
    updatedAt: string;
  };
}

export interface DeleteStageResponse {
  isSuccess: boolean;
  message: string;
  data?: null;
}

// Data service functions
export const reorderTaskStages = async (
  stageIds: number[] // Array of stage IDs in the desired order
): Promise<ReorderStagesResponse> => {
  try {
    // Send the request with the correct format
    const res = await putRequest(API_CONSTANTS.TASK.REORDER_STAGES, {
      order: stageIds,
    });
    return res as ReorderStagesResponse;
  } catch (error) {
    console.error("Error reordering stages:", error);
    return {
      isSuccess: false,
      message:
        error instanceof Error ? error.message : "Failed to reorder stages",
    };
  }
};
export const updateTaskStage = async (
  taskId: string,
  payload: UpdateStageRequest
): Promise<UpdateStageResponse> => {
  const res = await putRequest(
    API_CONSTANTS.TASK.UPDATE_STAGE(taskId),
    payload
  );
  return res as UpdateStageResponse;
};

export const deleteTaskStage = async (
  taskId: string
): Promise<DeleteStageResponse> => {
  const res = await deleteRequest(API_CONSTANTS.TASK.DELETE_STAGE(taskId));
  return res as DeleteStageResponse;
};

export interface LeadAnalytics {
  totalLeads: number;
  convertedLeads: number;
  convertedLeadPercentage: number;
  convertedLostLeads: number;
  toDaysNewLeads: number;
}

export interface LeadPerformer {
  userName: string;
  totalLeads: number;
  wonLeads: number;
  conversionWonLeadsPercentage: number;
  lostLeads: number;
  conversionLostLeadsPercentage: number;
}

export interface LeadOverviewResponse {
  isSuccess: boolean;
  message: string;
  data: {
    startDate: string;
    endDate: string;
    leadAnalytics: LeadAnalytics;
    topPerformerLeads: LeadPerformer[];
    avgPerformerLeads: LeadPerformer[];
    leastPerformerLeads: LeadPerformer[];
    leadStatusData: Record<string, number>;
    leadSourceData: Record<string, number>;
  };
}

// Fetch Leads Overview
export const fetchLeadsOverview = async (
  startDate: string,
  endDate: string
): Promise<LeadOverviewResponse> => {
  const endpoint = API_CONSTANTS.DASHBOARD.LEADS_OVERVIEW.replace(
    "{startDate}",
    startDate
  ).replace("{endDate}", endDate);

  const res = await getRequest(endpoint);
  return res as LeadOverviewResponse;
};





export type TaskFlowGraphAnalysis = Record<string, number>;


export interface TaskOverviewResponse {
  isSuccess: boolean;
  message: string;
  data: {
    startDate: string;
    endDate: string;
    taskAnalytics: TaskAnalytics;
    taskFlowGraphAnalysis: Record<string, number>;
    topPerformerTasks: TaskPerformer[];
    avgPerformerTasks: TaskPerformer[];
    leastPerformerTasks: TaskPerformer[];
    taskStatusGraphData: Record<string, number>;
    departmentAnalytics: DepartmentAnalytics[];
  };
}

export interface TaskAnalytics {
  totalTasks: number;
  inReviewTasks: number;
  ongoingTasks: number;
  completedTasks: number;
  completedPercentage: number;
}

export interface TaskPerformer {
  userName: string;
  totalTasks: number;
  ongoingTasks: number;
  completedTasks: number;
  completedPercentage: number;
}

export interface DepartmentAnalytics {
  departmentName: string;
  totalTasks: number;
  completedTasks: number;
  inReviewTasks: number;
  ongoingTasks: number;
  completedPercentage: number;
}


// Fetch Tasks Overview
export const fetchTasksOverview = async (
  startDate: string,
  endDate: string
): Promise<TaskOverviewResponse> => {
  const endpoint = API_CONSTANTS.DASHBOARD.TASKS_OVERVIEW.replace(
    "{startDate}",
    startDate
  ).replace("{endDate}", endDate);

  const res = await getRequest(endpoint);
  return res as TaskOverviewResponse;
};

export const decideTask = async (
  taskId: number | string,
  payload: TaskDecisionRequest
): Promise<TaskDecisionResponse> => {
  const res = await postRequest(API_CONSTANTS.TASK.DECISION(taskId), payload);
  return res as TaskDecisionResponse;
};

export const addTaskDiscussionComment = async (
  discussionId: number | string,
  payload: TaskDiscussionCommentRequest
): Promise<TaskDiscussionCommentResponse> => {
  const res = await postRequest(
    API_CONSTANTS.TASK.DISCUSSION_COMMENT(discussionId),
    payload
  );
  return res as TaskDiscussionCommentResponse;
};

export const getTaskDiscussionComments = async (
  taskId: number | string,
  searchTerm?: string,
  page?: number,
  limit?: number
): Promise<TaskDiscussionFilterResponse> => {
  const query = new URLSearchParams();
  query.append("taskId", String(taskId));
  if (searchTerm) query.append("searchTerm", searchTerm);
  if (page !== undefined) query.append("page", String(page));
  if (limit !== undefined) query.append("limit", String(limit));

  const res = await getRequest(
    `${API_CONSTANTS.TASK.DISCUSSION_FILTER}?${query.toString()}`
  );
  return res as TaskDiscussionFilterResponse;
};

export const generateBrandPalettes = async (
  logoColors: string[]
): Promise<GenerateBrandResponse> => {
  const query = new URLSearchParams();
  query.append("logoColors", logoColors.join(","));

  const res = await getRequest(
    `${API_CONSTANTS.BRAND.GENERATE}?${query.toString()}`
  );
  return res as GenerateBrandResponse;
};



export interface UploadFileResponse {
  isSuccess: boolean;
  message: string;
  data: {
    docId: number;
    type: string;
    fileName: string;
    fileType: string;
    url: string; // presigned S3 URL
  };
}

export interface UploadFilePayload {
  message: string;
  mentions: string[];
  fileName: string;
  fileType: string;
}

// Step 1: Get presigned URL from backend
export const uploadDiscussionFile = async (
  taskId: number | string,
  payload: UploadFilePayload,
): Promise<UploadFileResponse> => {
  try {
    const res = await postRequest(
      API_CONSTANTS.TASK.DISCUSSION_ADD_FILE(taskId),
      payload
    );
    return res as UploadFileResponse;
  } catch (error: any) {
    console.error("Failed to get presigned URL:", error.response || error.message);
    throw error;
  }
};

// Step 2: Upload actual file to S3
export const uploadFileToS3 = async (
  presignedUrl: string,
  file: File | Blob,
  fileType: string
): Promise<void> => {
  try {
    await fetch(presignedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": fileType,
      },
      body: file,
    });
  } catch (error: any) {
    console.error("Failed to upload file to S3:", error.message);
    throw error;
  }
};



export const addTaskDiscussionReaction = async (
  discussionId: number | string,
  payload: TaskDiscussionReactionRequest
): Promise<TaskDiscussionReactionResponse> => {
  const res = await postRequest(
    API_CONSTANTS.TASK.DISCUSSION_REACT(discussionId),
    payload
  );
  return res as TaskDiscussionReactionResponse;
};

export interface RemoveTaskDiscussionReactionResponse {
  isSuccess: boolean;
  message: string;
  data: null;
}

// API call
export const removeTaskDiscussionReaction = async (
  discussionId: number | string
): Promise<RemoveTaskDiscussionReactionResponse> => {
  const res = await deleteRequest(
    API_CONSTANTS.TASK.REMOVE_DISCUSSION_REACT(discussionId)
  );
  return res as RemoveTaskDiscussionReactionResponse;
};

export interface TaskDiscussionReplyRequest {
  message: string;
}

export interface TaskDiscussionReplyResponse {
  isSuccess: boolean;
  message: string;
  data: {
    id: number;
    parentId: number;
    author: {
      id: string;
      label: string;
    };
    message: string;
    createdAt: string;
    replyCount: number;
    isDeletable: boolean;
    mentions: any[];
    reactions: any[];
    files: any[];
  };
}

// API call
export const addTaskDiscussionReply = async (
  discussionId: number | string,
  payload: TaskDiscussionReplyRequest
): Promise<TaskDiscussionReplyResponse> => {
  const res = await postRequest(
    API_CONSTANTS.TASK.DISCUSSION_REPLY(discussionId),
    payload
  );
  return res as TaskDiscussionReplyResponse;
};


export interface VerifyDiscussionFileResponse {
  isSuccess: boolean;
  message: string;
  data: any; // backend returned null or no extra data
}

// API call
export const verifyDiscussionFile = async (
  fileId: number | string
): Promise<VerifyDiscussionFileResponse> => {
  const res = await postRequest(API_CONSTANTS.TASK.VERIFY_DISCUSSION_FILE(fileId));
  return res as VerifyDiscussionFileResponse;
};


export interface DeleteDiscussionResponse {
  isSuccess: boolean;
  message: string;
  data: null;
}

// API call
export const deleteDiscussion = async (
  discussionId: number | string
): Promise<DeleteDiscussionResponse> => {
  try {
    const res = await deleteRequest(
      API_CONSTANTS.TASK.DELETE_DISCUSSION(discussionId)
    );
    return res as DeleteDiscussionResponse;
  } catch (error: any) {
    console.error("Failed to delete discussion:", error.response || error.message);
    throw error;
  }
};


export interface GetDiscussionFileDownloadLinkResponse {
  isSuccess: boolean;
  message: string;
  data: {
    docId: number;
    type: string; // DOWNLOAD
    fileName: string;
    fileType: string;
    url: string; // presigned S3 download link
  };
}

// API call
export const getDiscussionFileDownloadLink = async (
  fileId: number | string
): Promise<GetDiscussionFileDownloadLinkResponse> => {
  try {
    const res = await getRequest(
      API_CONSTANTS.TASK.GET_DISCUSSION_FILE_DOWNLOAD_LINK(fileId)
    );
    return res as GetDiscussionFileDownloadLinkResponse;
  } catch (error: any) {
    console.error("Failed to get discussion file download link:", error.response || error.message);
    throw error;
  }
};

interface LogoutResponse {
  isSuccess: boolean;
  message: string;
  data: {
    statusCode: number;
    message: string;
  };
}

export const logoutUser = async (): Promise<LogoutResponse> => {
  const res = await postRequest(API_CONSTANTS.USER.LOGOUT);
  return res as LogoutResponse;
};

