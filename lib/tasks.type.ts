interface CreateTaskRequest {
  subject: string;
  description: string; // HTML preferred
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  taskStageId: number;
  startDate: string; // ISO date string
  endDate: string; // ISO date string or empty
  assignees: string[];
  acceptanceCriteria?: string;
}

interface CreateTaskResponse {
  isSuccess: boolean;
  message: string;
  data: {
    id: number;
    subject: string;
    description: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    startDate: string;
    endDate: string | null;
    taskStageId: number;
    taskStageName: string;
    createdAt: string;
    updatedAt: string;
    assignees: {
      id: string;
      label: string;
    }[];
  };
}



interface UpdateTaskRequest {
  assignees: string[];
}

interface UpdateTaskResponse {
  isSuccess: boolean;
  message: string;
  data: {
    id: number;
    subject: string;
    description: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    startDate: string;
    endDate: string | null;
    taskStageId: number;
    taskStageName: string;
    createdAt: string;
    updatedAt: string;
    assignees: {
      id: string;
      label: string;
    }[];
  };
}

type GetTaskByIdResponse = CreateTaskResponse; 

interface DeleteTaskResponse {
  isSuccess: boolean;
  message: string;
  data: null;
}


interface FilterTasksParams {
  searchTerm?: string;
 
  priorities?: string; 
  stageIds?: string; 
  assigneeIds?: string; 
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  page?: number;
  limit?: number;
  sortDirection?: string; 
}

interface FilterTasksResponse {
  isSuccess: boolean;
  message: string;
  data: CreateTaskResponse[];
}


