export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'NOT_STARTED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskActionType = 'NONE' | 'START' | 'STOP';

export interface TaskDocument {
  docId: number;
  fileName: string;
  fileType: string;
  uploadedAt?: Date;
}

export interface Assignee {
  id: string;
  label: string;
}

export interface Task {
  id: number;
  subject: string;
  description: string;
  status: TaskStatus;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  labels: string[];
  assignedTo: string;
  createdBy: string;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  taskStageId: number;
  taskStageName: string;
  assignee: {
    id: string;
    label: string;
  };
  approver: { // Changed from reviewer to approver
    id: string;
    label: string;
  };
  estimatedHours: number | null;
  graceHours: number;
  actualHours: number | null;
  actionType: TaskActionType;
  comment?: string;
  completedBy?: {
    id: string;
    label: string;
  } | null;
  completedAt?: string | null;
  documents?: TaskDocument[];
  acceptanceInfo: { // Made required to match EditingTaskResponse
    acceptanceCriteria: string;
  };
  isEditable?: boolean;
  isRecurring?: boolean; // Added to match EditingTaskResponse
  recurrenceRule?: string; // Added to match EditingTaskResponse
}

export interface TaskFilters {
  priority?: TaskPriority;
  labels?: string[];
  createdBy?: string;
  assignedTo?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
}