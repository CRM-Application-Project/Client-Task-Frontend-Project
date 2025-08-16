import { API_CONSTANTS } from "./api.route";
import {
  deleteRequest,
  getRequest,
  postRequest,
  putRequest,
  patchRequest,
} from "./httpServices";

export const registerUser = async (
  registerData: RegisterRequestData
): Promise<RegisterResponse> => {
  const res = await postRequest(API_CONSTANTS.USER.REGISTER, registerData);
  return res as RegisterResponse;
};

export const verifyUser = async (
  emailAddress: string,
  deviceType: string = "web"
): Promise<VerifyUserResponse> => {
  const url = API_CONSTANTS.USER.VERIFY.replace(
    "{emailAddress}",
    encodeURIComponent(emailAddress)
  ).replace("{deviceType}", deviceType);

  const res = await getRequest(url);
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

export const updateTask = async (
  taskId: number,
  updateData: UpdateTaskRequest
): Promise<UpdateTaskResponse> => {
  const url = API_CONSTANTS.TASK.UPDATE.replace("{taskId}", String(taskId));
  const res = await putRequest(url, updateData);
  return res as UpdateTaskResponse;
};

export const getTaskById = async (
  taskId: number
): Promise<GetTaskByIdResponse> => {
  const url = API_CONSTANTS.TASK.GET_BY_ID.replace("{taskId}", String(taskId));
  const res = await getRequest(url); // assuming you have a getRequest helper
  return res as GetTaskByIdResponse;
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

export interface Department {
  id: number;
  name: string;
  description: string;
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

export const createLead = async (
  leadData: CreateLeadRequest
): Promise<CreateLeadResponse> => {
  const res = await postRequest(API_CONSTANTS.LEAD.CREATE, leadData);
  return res as CreateLeadResponse;
};

export const getAllLeads = async (): Promise<GetAllLeadsResponse> => {
  const res = await getRequest(API_CONSTANTS.LEAD.GET_ALL);
  return res as GetAllLeadsResponse;
};

export const updateLead = async (payload: UpdateLeadRequest): Promise<UpdateLeadResponse> => {
  const res = await putRequest(API_CONSTANTS.LEAD.UPDATE, payload);
  return res as UpdateLeadResponse;
};

export const deleteLeadById = async (leadId: string): Promise<DeleteLeadResponse> => {
  const url = `${API_CONSTANTS.LEAD.DELETE_BY_ID}?leadId=${leadId}`;
  const res = await deleteRequest(url);
  return res as DeleteLeadResponse;
};

