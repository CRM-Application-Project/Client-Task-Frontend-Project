export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: string;
  subject: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  labels: string[];
  assignedTo?: string;
  createdBy: string;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
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