import { API_CONSTANTS } from "./api.route";
import { deleteRequest, getRequest, postRequest, putRequest } from "./httpServices";

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
  const url = API_CONSTANTS.USER.VERIFY
    .replace("{emailAddress}", encodeURIComponent(emailAddress))
    .replace("{deviceType}", deviceType);

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



