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
  priority: TaskPriority;
  labels: string[];
  assignedTo: string;
  createdBy: string;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  taskStageId: number;
  taskStageName: string;
  assignee: Assignee;
  estimatedHours: number | null;
  graceHours: number;
  actualHours: number | null;
  actionType: TaskActionType;
  comment?: string;
  completedBy?: Assignee | null;
  completedAt?: string | null;
  documents?: TaskDocument[];
  acceptanceInfo?: { acceptanceCriteria: string };
  isEditable?: boolean;
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