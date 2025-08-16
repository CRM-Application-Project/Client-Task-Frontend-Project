export interface TaskStage {
  id: number;
  name: string;
}

export interface TaskStagesDropdownResponse {
  isSuccess: boolean;
  message: string;
  data: TaskStage[];
}