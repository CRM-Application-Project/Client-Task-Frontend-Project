"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { TaskFilters } from "@/components/task/TaskFilters";
import { TaskColumn } from "@/components/task/TaskColumn";
import { AddTaskModal } from "@/components/task/AddTaskModal";

import {
  createTask,
  deleteTask,
  filterTasks,
  getTaskStagesDropdown,
  getUsers,
  updateTask,
  createTaskStage,
  User as ServiceUser,
  updateTaskStage,
  deleteTaskStage,
  UpdateStageRequest,
  startTask,
  stopTask,
} from "../services/data.service";
import { CreateStageModal } from "@/components/task/CreateStageModal";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { 
  TaskPriority, 
  TaskStatus, 
  TaskActionType, 
  Task, 
  Assignee 
} from "@/lib/task";

// ========== TYPE DEFINITIONS ==========

interface TaskStage {
  id: number;
  name: string;
}
interface TaskStageEdit {
  id: number;
  name: string;
  description?: string;
  orderNumber?: number;
}

type User = ServiceUser;

interface TaskResponse {
  id: number;
  subject: string;
  description: string;
  priority: TaskPriority;
  startDate: string;
  endDate: string | null;
  taskStageId: number;
  taskStageName: string;
  createdAt: string;
  updatedAt: string;
  assignee: Assignee;
  estimatedHours: number | null;
  graceHours: number;
  actualHours: number | null;
  actionType: TaskActionType;
  status: TaskStatus;
  comment: string;
  createdBy: Assignee;
  completedBy: Assignee | null;
  completedAt: string | null;
  documents: any[];
  acceptanceInfo: {
    acceptanceCriteria: string;
  };
}

interface EditingTaskResponse {
  id: number;
  subject: string;
  description: string;
  priority: TaskPriority;
  startDate: string;
  endDate: string | null;
  taskStageId: number;
  taskStageName: string;
  createdAt: string;
  updatedAt: string;
  assignee: Assignee;
    graceHours?: number; // Add this
  estimatedHours?: number; // Add this

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

interface CreateTaskRequest {
  subject: string;
  description: string;
  priority: TaskPriority;
  taskStageId: number;
  startDate: string;
  endDate: string;
  assignee: string;
}

interface UpdateTaskRequest {
  subject: string;
  description: string;
  priority: TaskPriority;
  taskStageId: number;
  startDate: string;
  endDate?: string | null;
  assignee: string;
  comment?: string;
}

interface ApiTaskResponse {
  isSuccess: boolean;
  message: string;
  data: {
    totalPages: number;
    totalElements: number;
    pageSize: number;
    pageIndex: number;
    numberOfElementsInThePage: number;
    content: {
      stageId: number;
      stageName: string;
      stageOrder: number;
      tasks: TaskResponse[];
    }[];
  };
}

interface FilterTasksResponse {
  isSuccess: boolean;
  message: string;
  data: TaskResponse[] | { content: any[] } | any;
}

interface CreateStageRequest {
  name: string;
  description: string;
  orderNumber: number;
}
interface DeleteStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  stageName: string;
  isLoading?: boolean;
}

const DeleteStageModal = ({
  isOpen,
  onClose,
  onConfirm,
  stageName,
  isLoading = false,
}: DeleteStageModalProps) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      {/* Modal Container */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-gray-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Delete Stage
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              type="button"
              disabled={isLoading}
            >
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {`Are you sure you want to delete ${stageName}?`}
              </h3>
              <p className="text-sm text-gray-500">
                This action cannot be undone.The stage will be removed permanently.
              </p>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors font-medium disabled:opacity-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2.5 bg-brand-primary text-text-white rounded-lg hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={isLoading}
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              Delete Stage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
interface EditStageModalProps {
  stage: TaskStageEdit;
  isOpen: boolean;
  onClose: () => void;
  onSave: (stageData: { name: string; description: string }) => void; // Remove orderNumber
}

const EditStageModal = ({
  stage,
  isOpen,
  onClose,
  onSave,
}: EditStageModalProps) => {
  const [name, setName] = useState(stage.name);
  const [description, setDescription] = useState(stage.description || "");

  // Reset form when stage changes
  useEffect(() => {
    setName(stage.name);
    setDescription(stage.description || "");
  }, [stage]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave({
        name: name.trim(),
        description: description.trim(),
      });
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      {/* Modal Container */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-gray-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Edit Stage</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              type="button"
            >
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              {/* Stage Name Field */}
              <div>
                <label
                  htmlFor="stageName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Stage Name
                </label>
                <input
                  id="stageName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors text-gray-900 placeholder-gray-400"
                  placeholder="Enter stage name"
                  required
                />
              </div>

              {/* Description Field */}
              <div>
                <label
                  htmlFor="stageDescription"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Description
                </label>
                <textarea
                  id="stageDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors text-gray-900 placeholder-gray-400 resize-none"
                  placeholder="Enter stage description (optional)"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 bg-brand-primary text-text-white rounded-lg hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors font-medium shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
// ========== MAIN COMPONENT ==========
const statuses: TaskStatus[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
];
interface DeleteTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  taskName: string;
  isLoading?: boolean;
}

const DeleteTaskModal = ({
  isOpen,
  onClose,
  onConfirm,
  taskName,
  isLoading = false,
}: DeleteTaskModalProps) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Delete Task</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              type="button"
              disabled={isLoading}
            >
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {`Are you sure you want to delete "${taskName}"?`}
              </h3>
              <p className="text-sm text-gray-500">
                This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors font-medium disabled:opacity-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2.5 bg-brand-primary text-text-white rounded-lg hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={isLoading}
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              Delete Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Stop Task Comment Modal Component
interface StopTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (comment: string) => void;
  taskId: number | null;
  isLoading?: boolean;
}

const StopTaskModal = ({
  isOpen,
  onClose,
  onConfirm,
  taskId,
  isLoading = false,
}: StopTaskModalProps) => {
  const [comment, setComment] = useState("");

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim()) {
      onConfirm(comment.trim());
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setComment("");
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Stop Task
            </h2>
            <button
              onClick={handleClose}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              type="button"
              disabled={isLoading}
            >
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Stop Task #{taskId}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Please provide a comment about stopping this task.
                </p>
              </div>
              
              <div>
                <label
                  htmlFor="stopComment"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Comment <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="stopComment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors text-gray-900 placeholder-gray-400 resize-none"
                  placeholder="Enter reason for stopping this task..."
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors font-medium disabled:opacity-50"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 bg-brand-primary text-text-white rounded-lg hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={isLoading || !comment.trim()}
              >
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                Stop Task
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<{
    priority?: string;
    labels?: string[];
    createdBy?: string;
    assignedTo?: string;
    dateRange?: { from: Date; to: Date };
    stageIds?: string;
  }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<
    EditingTaskResponse | undefined
  >();
  const [stages, setStages] = useState<TaskStage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "grid">("kanban");
  const [isCreateStageModalOpen, setIsCreateStageModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<TaskStageEdit | null>(null);
  const [isEditStageModalOpen, setIsEditStageModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [stageToDelete, setStageToDelete] = useState<TaskStage | null>(null);
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  // New state for pre-selected stage
  const [preSelectedStageId, setPreSelectedStageId] = useState<number | null>(
    null
  );
  // State for stop task comment modal
  const [isStopTaskModalOpen, setIsStopTaskModalOpen] = useState(false);
  const [stopTaskComment, setStopTaskComment] = useState("");
  const [taskToStop, setTaskToStop] = useState<number | null>(null);
  const [isStoppingTask, setIsStoppingTask] = useState(false);

  const router = useRouter();
  const kanbanScrollRef = useRef<HTMLDivElement>(null);

  const handleTaskClick = useCallback(
    (taskId: number) => {
      setSelectedTaskId(taskId);
      router.push(`/tasks/${taskId}`);
      setIsDetailsModalOpen(true);
    },
    [router]
  );

  // Refs to track if we're already fetching to prevent duplicate calls
  const isInitialLoadingRef = useRef(false);
  const isFilteringRef = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Transform API response to flat array of tasks
  const transformTasks = useCallback(
    (apiResponse: ApiTaskResponse | FilterTasksResponse): Task[] => {
      if (!apiResponse.isSuccess || !apiResponse.data) return [];

      if ("content" in apiResponse.data) {
        interface StageContent {
          stageId: number;
          stageName: string;
          stageOrder: number;
          tasks: TaskResponse[];
        }

        return apiResponse.data.content.flatMap((stage: StageContent) =>
          stage.tasks.map(
            (task: TaskResponse): Task => ({
              id: task.id,
              subject: task.subject,
              description: task.description,
              status: task.taskStageName as TaskStatus,
              priority: task.priority,
              labels: [],
              assignedTo: task.assignee?.label || "Unassigned",
              createdBy: task.createdBy?.label || "Unknown",
              startDate: new Date(task.startDate),
              endDate: task.endDate ? new Date(task.endDate) : null,
              createdAt: new Date(task.createdAt),
              updatedAt: new Date(task.updatedAt),
              taskStageId: task.taskStageId,
              taskStageName: task.taskStageName,
              assignee: task.assignee,
              estimatedHours: task.estimatedHours,
              graceHours: task.graceHours || 0,
              actualHours: task.actualHours,
              actionType: task.actionType,
              comment: task.comment || "",
              completedBy: task.completedBy,
              completedAt: task.completedAt,
              documents: task.documents || [],
              acceptanceInfo: task.acceptanceInfo,
            })
          )
        );
      } else {
        return (apiResponse.data as TaskResponse[]).map((task) => ({
          id: task.id,
          subject: task.subject,
          description: task.description,
          status: task.taskStageName as TaskStatus,
          priority: task.priority,
          labels: [],
          assignedTo: task.assignee?.label || "Unassigned",
          createdBy: task.createdBy?.label || "Unknown",
          startDate: new Date(task.startDate),
          endDate: task.endDate ? new Date(task.endDate) : null,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt),
          taskStageId: task.taskStageId,
          taskStageName: task.taskStageName,
          assignee: task.assignee,
          estimatedHours: task.estimatedHours,
          graceHours: task.graceHours || 0,
          actualHours: task.actualHours,
          actionType: task.actionType,
          comment: task.comment || "",
          completedBy: task.completedBy,
          completedAt: task.completedAt,
          documents: task.documents || [],
          acceptanceInfo: task.acceptanceInfo,
        }));
      }
    },
    []
  );

  // Convert filter object to API parameters
 const convertFiltersToApiParams = useCallback(
  (uiFilters: typeof filters, searchQuery: string): FilterTasksParams => {
    const apiParams: FilterTasksParams = {};

    if (searchQuery.trim()) apiParams.searchTerm = searchQuery.trim();
    if (uiFilters.priority) apiParams.priorities = uiFilters.priority;
    if (uiFilters.stageIds) apiParams.stageIds = uiFilters.stageIds;
    if (uiFilters.assignedTo) apiParams.assigneeIds = uiFilters.assignedTo;

    if (uiFilters.dateRange) {
      const formatDateWithTime = (date: Date) => {
        return date.toISOString().split("T")[0] + "T00:00:00";
      };

      // Helper functions to check if dates are placeholder dates
      const isPlaceholderFromDate = (date: Date) => 
        date.getTime() <= new Date('1970-01-02').getTime();
      
      const isPlaceholderToDate = (date: Date) => 
        date.getTime() >= new Date('2099-12-30').getTime();

      // Handle partial date ranges
      const hasRealFromDate = uiFilters.dateRange.from && !isPlaceholderFromDate(uiFilters.dateRange.from);
      const hasRealToDate = uiFilters.dateRange.to && !isPlaceholderToDate(uiFilters.dateRange.to);

      if (hasRealFromDate) {
        apiParams.startDateFrom = formatDateWithTime(uiFilters.dateRange.from);
        // Also set endDateFrom if we want tasks that end after the from date
        
      }
      
      if (hasRealToDate) {
      
        apiParams.startDateTo = formatDateWithTime(uiFilters.dateRange.to);
      }
    }

    return apiParams;
  },
  []
);

  // Optimized task fetching function
  const fetchTasks = useCallback(
    async (filterParams?: FilterTasksParams, showLoading = false) => {
      if (isFilteringRef.current) return;

      isFilteringRef.current = true;
      if (showLoading) setIsRefreshing(true);

      try {
        const apiParams =
          filterParams || convertFiltersToApiParams(filters, searchQuery);
        const response = await filterTasks(apiParams);

        if (response.isSuccess) {
          const transformedTasks = transformTasks(
            response as ApiTaskResponse | FilterTasksResponse
          );
          setTasks(transformedTasks);
        } else {
          console.error("Failed to fetch tasks:", response.message);
          setTasks([]);
        }
      } catch (error) {
        console.error("Error fetching tasks:", error);
        setTasks([]);
      } finally {
        isFilteringRef.current = false;
        if (showLoading) setIsRefreshing(false);
      }
    },
    [filters, searchQuery, convertFiltersToApiParams, transformTasks]
  );

  // Fetch stages function
  const fetchStages = useCallback(async () => {
    try {
      const stagesRes = await getTaskStagesDropdown();
      if (stagesRes.isSuccess) {
        setStages(stagesRes.data);
        console.log("Fetched stages:", stagesRes.data);
      }
    } catch (error) {
      console.error("Error fetching stages:", error);
    }
  }, []);

  // Fetch initial data only once
  useEffect(() => {
    if (isInitialLoadingRef.current) return;

    const fetchInitialData = async () => {
      isInitialLoadingRef.current = true;

      try {
        const [stagesRes, usersRes] = await Promise.all([
          getTaskStagesDropdown(),
          getUsers(),
        ]);

        if (stagesRes.isSuccess) {
          setStages(stagesRes.data);
          console.log("Fetched stages:", stagesRes.data);
        }

        if (usersRes.isSuccess) {
          setUsers(
            usersRes.data.map((user) => ({
              ...user,
              contactNumber: user.contactNumber || "",
              userRole: user.userRole || "User",
            }))
          );
        }

        await fetchTasks({}, false);
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (isInitialLoadingRef.current) return;

    searchTimeoutRef.current = setTimeout(() => {
      const apiParams = convertFiltersToApiParams(filters, searchQuery);
      fetchTasks(apiParams, true);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleApplyFilters = useCallback(async () => {
    const apiParams = convertFiltersToApiParams(filters, searchQuery);
    await fetchTasks(apiParams, true);
  }, [filters, searchQuery, convertFiltersToApiParams, fetchTasks]);

  const handleFilterChange = useCallback(
    async (newFilters: typeof filters) => {
      setFilters(newFilters);
      const apiParams = convertFiltersToApiParams(newFilters, searchQuery);
      await fetchTasks(apiParams, true);
    },
    [searchQuery, convertFiltersToApiParams, fetchTasks]
  );

  const handleAddTask = useCallback(
    async (
      taskData: CreateTaskRequest | Partial<UpdateTaskRequest>,
      isEdit: boolean
    ) => {
      try {
        let response;

        if (isEdit && editingTask) {
          // For updates, taskData is Partial<UpdateTaskRequest> with only changed fields
          console.log("Updating task with only changed fields:", taskData);
          response = await updateTask(
            editingTask.id,
            taskData as Partial<UpdateTaskRequest>
          );
        } else {
          // For new tasks, taskData is complete CreateTaskRequest
          response = await createTask(taskData as CreateTaskRequest);
        }

        if (response.isSuccess) {
          await fetchTasks(undefined, true);
          handleCloseModal();
        }
      } catch (error) {
        console.error("Error saving task:", error);
      }
    },
    [editingTask, fetchTasks]
  );
  const { toast } = useToast();
  const handleCreateStage = useCallback(
    async (stageData: CreateStageRequest) => {
      try {
        const response = await createTaskStage(stageData);
        if (response.isSuccess) {
          await fetchStages();
          setIsCreateStageModalOpen(false);
        } else {
          console.error("Failed to create stage:", response.message);
        }
      } catch (error) {
        console.error("Error creating stage:", error);
      }
    },
    [fetchStages]
  );
  const handleEditStage = useCallback((stage: TaskStageEdit) => {
    setEditingStage(stage);
    setIsEditStageModalOpen(true);
  }, []);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleteTaskModalOpen, setIsDeleteTaskModalOpen] = useState(false);
  const handleSaveStage = useCallback(
    async (stageData: { name: string; description: string }) => {
      if (!editingStage) return;

      setIsUpdatingStage(true);

      try {
        // Create payload with only changed fields (excluding orderNumber)
        const updateData: UpdateStageRequest = {};

        if (stageData.name !== editingStage.name) {
          updateData.name = stageData.name;
        }

        if (stageData.description !== (editingStage.description || "")) {
          updateData.description = stageData.description;
        }

        // Completely remove orderNumber from payload

        // Only send request if there are changes
        if (Object.keys(updateData).length > 0) {
          const response = await updateTaskStage(
            editingStage.id.toString(),
            updateData
          );

          if (response.isSuccess) {
            toast({
              title: "Stage Updated",
              description: `Stage "${stageData.name}" has been updated successfully.`,
              variant: "default",
            });

            // Refresh stages and tasks
            await fetchStages();
            await fetchTasks(undefined, false);
          } else {
            throw new Error(response.message || "Failed to update stage");
          }
        } else {
          // No changes were made
          toast({
            title: "No Changes",
            description: "No changes were made to the stage.",
            variant: "default",
          });
        }
      } catch (error) {
        console.error("Error updating stage:", error);
        toast({
          title: "Error",
          description: "Failed to update stage. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsUpdatingStage(false);
        setIsEditStageModalOpen(false);
        setEditingStage(null);
      }
    },
    [editingStage, fetchStages, fetchTasks, toast]
  );
  const handleDeleteTask = useCallback(
    async (taskId: number) => {
      try {
        const response = await deleteTask(taskId);
        if (response.isSuccess) {
          await fetchTasks(undefined, true);
          setIsDeleteTaskModalOpen(false);
          setTaskToDelete(null);
          toast({
            title: "Task Deleted",
            description: "Task has been deleted successfully.",
            variant: "default",
          });
        }
      } catch (error) {
        console.error("Error deleting task:", error);
        toast({
          title: "Error",
          description: "Failed to delete task. Please try again.",
          variant: "destructive",
        });
      }
    },
    [fetchTasks, toast]
  );
  const confirmDeleteTask = useCallback(() => {
    if (taskToDelete) {
      handleDeleteTask(taskToDelete.id);
    }
  }, [taskToDelete, handleDeleteTask]);

  // Add this function to open delete confirmation
  const openDeleteConfirmation = useCallback((task: Task) => {
    setTaskToDelete(task);
    setIsDeleteTaskModalOpen(true);
  }, []);
  const handleDeleteStage = useCallback(
    async (stage: TaskStage) => {
      // Check if stage has tasks
      const stageTasks = tasks.filter((task) => task.taskStageId === stage.id);
      if (stageTasks.length > 0) {
        toast({
          title: "Cannot Delete Stage",
          description:
            "Please move or delete all tasks in this stage before deleting it.",
          variant: "destructive",
        });
        return;
      }

      // Set the stage to delete and open confirmation modal
      setStageToDelete(stage);
      setIsDeleteModalOpen(true);
    },
    [tasks, toast]
  );

  // Add a new function to handle the actual deletion
  const confirmDeleteStage = useCallback(async () => {
    if (!stageToDelete) return;

    setIsUpdatingStage(true);

    try {
      const response = await deleteTaskStage(stageToDelete.id.toString());

      if (response.isSuccess) {
        toast({
          title: "Stage Deleted",
          description: `Stage "${stageToDelete.name}" has been deleted successfully.`,
          variant: "default",
        });

        // Refresh stages and tasks
        await fetchStages();
        await fetchTasks(undefined, false);

        // Close the modal
        setIsDeleteModalOpen(false);
        setStageToDelete(null);
      } else {
        throw new Error(response.message || "Failed to delete stage");
      }
    } catch (error) {
      console.error("Error deleting stage:", error);
      toast({
        title: "Error",
        description: "Failed to delete stage. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStage(false);
    }
  }, [stageToDelete, fetchStages, fetchTasks, toast]);

  // Add a function to cancel deletion
  const cancelDeleteStage = useCallback(() => {
    setIsDeleteModalOpen(false);
    setStageToDelete(null);
  }, []);

  // Stop task modal handlers
  const handleStopTaskConfirm = useCallback(async (comment: string) => {
    if (!taskToStop) return;

    setIsStoppingTask(true);

    try {
      await stopTask(taskToStop.toString(), { comment });
      
      toast({
        title: "Task Stopped",
        description: `Task #${taskToStop} has been stopped successfully.`,
        variant: "default",
      });
      
      // Refresh tasks after stopping
      await fetchTasks(undefined, true);
      
      // Close modal and reset state
      setIsStopTaskModalOpen(false);
      setTaskToStop(null);
      setStopTaskComment("");
    } catch (error) {
      console.error("Error stopping task:", error);
      toast({
        title: "Error",
        description: "Failed to stop task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsStoppingTask(false);
    }
  }, [taskToStop, toast, fetchTasks]);

  const handleStopTaskCancel = useCallback(() => {
    setIsStopTaskModalOpen(false);
    setTaskToStop(null);
    setStopTaskComment("");
  }, []);
  const handleEditTask = useCallback((task: Task) => {
    const editingTaskData: EditingTaskResponse = {
      id: task.id,
      subject: task.subject,
      description: task.description,
      priority: task.priority,
      startDate: task.startDate.toISOString(),
      endDate: task.endDate ? task.endDate.toISOString() : null,
      taskStageId: task.taskStageId,
      taskStageName: task.taskStageName,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      assignee: task.assignee,
      graceHours: task.graceHours,
      estimatedHours: task.estimatedHours ?? undefined, // Convert null to undefined
    };

    setEditingTask(editingTaskData);
    setPreSelectedStageId(null); // Clear pre-selected stage when editing
    setIsAddModalOpen(true);
  }, []);

  // New function to handle add task for specific stage
  const handleAddTaskForStage = useCallback((stageId: number) => {
    setPreSelectedStageId(stageId);
    setEditingTask(undefined); // Clear editing task
    setIsAddModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsAddModalOpen(false);
    setEditingTask(undefined);
    setPreSelectedStageId(null); // Clear pre-selected stage
  }, []);

  const handleActionClick = useCallback(async (taskId: number, actionType: TaskActionType) => {
    if (actionType === "START") {
      try {
        toast({
          title: "Starting Task",
          description: `Starting task #${taskId}...`,
          variant: "default",
        });
        
        await startTask(taskId.toString());
        
        toast({
          title: "Task Started",
          description: `Task #${taskId} has been started successfully.`,
          variant: "default",
        });
        
        // Refresh tasks after action
        await fetchTasks(undefined, true);
      } catch (error) {
        console.error("Error starting task:", error);
        toast({
          title: "Error",
          description: "Failed to start task. Please try again.",
          variant: "destructive",
        });
      }
    } else if (actionType === "STOP") {
      // Show comment modal for stop action
      setTaskToStop(taskId);
      setStopTaskComment("");
      setIsStopTaskModalOpen(true);
    }
  }, [toast, fetchTasks]);

  const handleCloseTaskDetails = useCallback(() => {
    setIsDetailsModalOpen(false);
    setSelectedTaskId(null);
  }, []);

  const handleEditTaskFromDetails = useCallback(() => {
    if (selectedTaskId) {
      const taskToEdit = tasks.find((task) => task.id === selectedTaskId);
      if (taskToEdit) {
        handleEditTask(taskToEdit);
        setIsDetailsModalOpen(false);
        setSelectedTaskId(null);
      }
    }
  }, [selectedTaskId, tasks, handleEditTask]);

  const handleClearAllFilters = useCallback(async () => {
    setFilters({});
    setSearchQuery("");
    await fetchTasks({}, true);
  }, [fetchTasks]);

  // Client-side filtering for immediate UI response
const filteredTasks = tasks.filter((task) => {
  const matchesSearch =
    searchQuery === "" ||
    task.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchQuery.toLowerCase());

  const matchesPriority =
    !filters.priority || task.priority === filters.priority;
  const matchesStage =
    !filters.stageIds || task.taskStageId?.toString() === filters.stageIds;
  const matchesAssignee =
    !filters.assignedTo || task.assignee?.id === filters.assignedTo;

  // Enhanced date range matching
  const matchesDateRange = (() => {
    if (!filters.dateRange) return true;
    
    const { from, to } = filters.dateRange;
    const taskStartDate = task.startDate;
    const taskEndDate = task.endDate;
    
    // Helper functions to check if dates are placeholder dates
    const isPlaceholderFromDate = (date: Date) => 
      date.getTime() <= new Date('1970-01-02').getTime();
    
    const isPlaceholderToDate = (date: Date) => 
      date.getTime() >= new Date('2099-12-30').getTime();
    
    // Check if we have real dates (not placeholders)
    const hasRealFromDate = from && !isPlaceholderFromDate(from);
    const hasRealToDate = to && !isPlaceholderToDate(to);
    
    if (hasRealFromDate && hasRealToDate) {
      // Both dates specified - show tasks that overlap with the date range
      // A task overlaps if:
      // 1. Task starts within the range, OR
      // 2. Task ends within the range, OR  
      // 3. Task spans the entire range (starts before and ends after)
      const taskStartsInRange = taskStartDate >= from && taskStartDate <= to;
      const taskEndsInRange = taskEndDate && taskEndDate >= from && taskEndDate <= to;
      const taskSpansRange = taskStartDate <= from && taskEndDate && taskEndDate >= to;
      
      return taskStartsInRange || taskEndsInRange || taskSpansRange;
    } else if (hasRealFromDate) {
      // Only from date specified - show tasks that start on or after this date
      // OR tasks that are still ongoing (end date is after the from date)
      return taskStartDate >= from || (taskEndDate && taskEndDate >= from);
    } else if (hasRealToDate) {
      // Only to date specified - show tasks that start on or before this date
      return taskStartDate <= to;
    }
    
    return true;
  })();

  return (
    matchesSearch &&
    matchesPriority &&
    matchesStage &&
    matchesAssignee &&
    matchesDateRange
  );
});

  // Smooth scroll navigation functions
  const scrollLeft = () => {
    if (kanbanScrollRef.current) {
      kanbanScrollRef.current.scrollBy({
        left: -300,
        behavior: "smooth",
      });
    }
  };

  const scrollRight = () => {
    if (kanbanScrollRef.current) {
      kanbanScrollRef.current.scrollBy({
        left: 300,
        behavior: "smooth",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <>
        {/* Loading indicator for refreshing */}
        {isRefreshing && (
          <div className="mb-4 flex items-center justify-center">
            <div className="text-sm text-muted-foreground">
              Updating tasks...
            </div>
          </div>
        )}

        {/* Filters */}
        <TaskFilters
          filters={filters}
          onFiltersChange={handleFilterChange}
          onAddTask={() => setIsAddModalOpen(true)}
          onAddStage={() => setIsCreateStageModalOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearAllFilters={handleClearAllFilters}
          onApplyFilters={handleApplyFilters}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          stages={stages}
          users={users}
        />

        {/* No Stages Message with Create Stage Button */}
        {stages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg border border-gray-200 mb-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Stages Found
              </h3>
              <p className="text-gray-500 mb-4">
                You need to create at least one stage to start managing tasks.
              </p>
              <button
                onClick={() => setIsCreateStageModalOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-brand-primary text-text-white text-sm font-medium rounded-md hover:bg-brand-primary/90 focus:outline-none"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Create Stage
              </button>
            </div>
          </div>
        )}

        {/* Task Board - Only show if stages exist */}
        {stages.length > 0 && (
          <>
            {viewMode === "kanban" && (
              <div className="relative">
                {/* Scroll Navigation Buttons - Only show if there are more than 3 stages */}
                {stages.length > 3 && (
                  <>
                    {/* Left scroll button */}
                    <button
                      onClick={scrollLeft}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 border border-gray-200 transition-all duration-200 hover:scale-110"
                      style={{ marginLeft: "-12px" }}
                    >
                      <svg
                        className="w-5 h-5 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>

                    {/* Right scroll button */}
                    <button
                      onClick={scrollRight}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 border border-gray-200 transition-all duration-200 hover:scale-110"
                      style={{ marginRight: "-12px" }}
                    >
                      <svg
                        className="w-5 h-5 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </>
                )}

                {/* Kanban Board Container with Enhanced Smooth Scrolling */}
                <div
                  ref={kanbanScrollRef}
                  className="kanban-board-container flex gap-4 overflow-x-auto pb-6 px-1" // Added class name here
                  style={{
                    scrollBehavior: "smooth",
                    scrollbarWidth: "thin",
                    scrollbarColor: "#cbd5e1 #f1f5f9",
                    WebkitOverflowScrolling: "touch",
                  }}
                >
                  {/* Custom scrollbar styles */}
                  <style jsx>{`
                    .kanban-board-container::-webkit-scrollbar {
                      height: 8px;
                    }
                    .kanban-board-container::-webkit-scrollbar-track {
                      background: #f1f5f9;
                      border-radius: 4px;
                    }
                    .kanban-board-container::-webkit-scrollbar-thumb {
                      background: #cbd5e1;
                      border-radius: 4px;
                      transition: background 0.2s ease;
                    }
                    .kanban-board-container::-webkit-scrollbar-thumb:hover {
                      background: #94a3b8;
                    }
                  `}</style>

                  {stages.map((stage, index) => (
                    <TaskColumn
                      key={stage.id}
                      stage={stage}
                      tasks={filteredTasks.filter(
                        (task) => task.taskStageId === stage.id
                      )}
                      onEditTask={handleEditTask}
                      onDeleteTask={handleDeleteTask}
                      onTaskClick={handleTaskClick}
                      onAddTaskForStage={handleAddTaskForStage}
                      stageIndex={index}
                      onTaskUpdate={() => fetchTasks(undefined, true)}
                      onStageUpdate={() => {
                        fetchStages();
                        fetchTasks(undefined, true);
                      }}
                      allStages={stages}
                      onStageReorder={(reorderedStages) => {
                        setStages(reorderedStages);
                      }}
                      onEditStage={handleEditStage}
                      onDeleteStage={handleDeleteStage}
                      onActionClick={handleActionClick}
                    />
                  ))}
                </div>
              </div>
            )}

            {viewMode === "grid" && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Task
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stage
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Assigned To
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Start Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          End Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTasks.map((task) => (
                        <tr key={task.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {task.subject?.charAt(0)?.toUpperCase()}
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {task.subject}
                                </div>
                                <div className="text-sm text-gray-500 max-w-xs truncate">
                                  {task.description}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              {task.taskStageName}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                task.priority === "LOW"
                                  ? "bg-gray-100 text-gray-800"
                                  : task.priority === "MEDIUM"
                                  ? "bg-blue-100 text-blue-800"
                                  : task.priority === "HIGH"
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {task.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {task.assignedTo}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {task.startDate.toLocaleDateString("en-US", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {task.endDate
                              ? task.endDate.toLocaleDateString("en-US", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "No due date"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  handleTaskClick(task.id);
                                }}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleEditTask(task)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => openDeleteConfirmation(task)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredTasks.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">
                      No tasks found matching your filters.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Add Task Modal */}
        <AddTaskModal
          isOpen={isAddModalOpen}
          onClose={handleCloseModal}
          onSubmit={handleAddTask}
          editingTask={editingTask}
          preSelectedStageId={preSelectedStageId} // THIS LINE WAS MISSING!
          users={users}
        />

        {/* Create Stage Modal */}
        <CreateStageModal
          isOpen={isCreateStageModalOpen}
          onClose={() => setIsCreateStageModalOpen(false)}
          onSubmit={handleCreateStage}
          existingStagesCount={stages.length}
        />
        <EditStageModal
          stage={editingStage || { id: 0, name: "", description: "" }} // Remove orderNumber
          isOpen={isEditStageModalOpen}
          onClose={() => {
            setIsEditStageModalOpen(false);
            setEditingStage(null);
          }}
          onSave={handleSaveStage}
        />
        <DeleteStageModal
          isOpen={isDeleteModalOpen}
          onClose={cancelDeleteStage}
          onConfirm={confirmDeleteStage}
          stageName={stageToDelete?.name || ""}
          isLoading={isUpdatingStage}
        />
        <DeleteTaskModal
          isOpen={isDeleteTaskModalOpen}
          onClose={() => {
            setIsDeleteTaskModalOpen(false);
            setTaskToDelete(null);
          }}
          onConfirm={confirmDeleteTask}
          taskName={taskToDelete?.subject || ""}
          isLoading={isUpdatingStage} // You might want to create a separate loading state for task deletion
        />
        <StopTaskModal
          isOpen={isStopTaskModalOpen}
          onClose={handleStopTaskCancel}
          onConfirm={handleStopTaskConfirm}
          taskId={taskToStop}
          isLoading={isStoppingTask}
        />
      </>
    </div>
  );
}
