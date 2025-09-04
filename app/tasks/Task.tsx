"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  Assignee,
} from "@/lib/task";

// ========== TYPE DEFINITIONS ==========

interface TaskStage {
  id: number;
  name: string;
  isDeletable: boolean;
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
  isEditable: boolean;
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
  graceHours?: number;
  estimatedHours?: number;
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

// Pagination state interface
interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
}

// ========== PAGINATION COMPONENT ==========
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

const Pagination = ({
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  isLoading = false,
}: PaginationProps) => {
  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalElements);

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
      <div className="flex items-center text-sm text-gray-700">
        <span>
          Showing {startItem} to {endItem} of {totalElements} results
        </span>
      </div>
      
      <div className="flex items-center space-x-2">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>

        {/* Page Numbers */}
        <div className="flex space-x-1">
          {getVisiblePages().map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === 'number' ? onPageChange(page) : undefined}
              disabled={isLoading || typeof page === 'string'}
              className={`relative inline-flex items-center px-3 py-2 text-sm font-medium border rounded-md ${
                page === currentPage
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : typeof page === 'string'
                  ? 'bg-white text-gray-500 border-gray-300 cursor-default'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {page}
            </button>
          ))}
        </div>

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
          className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// ========== INFINITE SCROLL HOOK ==========
const useInfiniteScroll = (callback: () => void, hasMore: boolean, isLoading: boolean) => {
  const observer = useRef<IntersectionObserver>();
  
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        callback();
      }
    }, {
      rootMargin: '100px', // Load when element is 100px away from viewport
    });
    
    if (node) observer.current.observe(node);
  }, [callback, hasMore, isLoading]);
  
  return lastElementRef;
};

// ========== MODAL COMPONENTS (keeping existing ones) ==========
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
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-gray-200">
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

        <div className="p-6">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {`Are you sure you want to delete ${stageName}?`}
              </h3>
              <p className="text-sm text-gray-500">
                This action cannot be undone. The stage will be removed
                permanently.
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
  onSave: (stageData: { name: string; description: string }) => void;
}

const EditStageModal = ({
  stage,
  isOpen,
  onClose,
  onSave,
}: EditStageModalProps) => {
  const [name, setName] = useState(stage.name);
  const [description, setDescription] = useState(stage.description || "");

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
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-gray-200">
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

        <div className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
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
            <h2 className="text-lg font-semibold text-gray-900">Stop Task</h2>
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
  // ========== STATE MANAGEMENT ==========
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasksForInfiniteScroll, setAllTasksForInfiniteScroll] = useState<Task[]>([]);
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
  const [editingTask, setEditingTask] = useState<EditingTaskResponse | undefined>();
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
  const [preSelectedStageId, setPreSelectedStageId] = useState<number | null>(null);
  const [isStopTaskModalOpen, setIsStopTaskModalOpen] = useState(false);
  const [stopTaskComment, setStopTaskComment] = useState("");
  const [taskToStop, setTaskToStop] = useState<number | null>(null);
  const [isStoppingTask, setIsStoppingTask] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleteTaskModalOpen, setIsDeleteTaskModalOpen] = useState(false);

  // ========== PAGINATION STATE ==========
  const [paginationState, setPaginationState] = useState<PaginationState>({
    currentPage: 1,
    totalPages: 1,
    totalElements: 0,
    pageSize: 5,
  });

  // ========== INFINITE SCROLL STATE ==========
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreTasks, setHasMoreTasks] = useState(true);
  const [kanbanPage, setKanbanPage] = useState(1);

  const router = useRouter();
  const kanbanScrollRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  // ========== HELPER FUNCTIONS ==========
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
 // Replace the transformTasks function with this:
const transformTasks = useCallback(
  (apiResponse: ApiTaskResponse | FilterTasksResponse): Task[] => {
    if (!apiResponse.isSuccess || !apiResponse.data) return [];

    // Handle ApiTaskResponse (structured response with stages)
    if ('totalPages' in apiResponse.data) {
      const apiData = apiResponse.data as ApiTaskResponse['data'];
      return apiData.content.flatMap((stage) =>
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
            isEditable: task.isEditable ?? true,
          })
        )
      );
    } 
    // Handle FilterTasksResponse (flat array response)
    else if (Array.isArray(apiResponse.data)) {
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
        isEditable: task.isEditable ?? true,
      }));
    }
    
    return [];
  },
  []
);

  // Convert filter object to API parameters
  const convertFiltersToApiParams = useCallback(
    (uiFilters: typeof filters, searchQuery: string, page: number = 1, limit: number = 20): FilterTasksParams => {
      const apiParams: FilterTasksParams = {
        page: page - 1, // API expects 0-based indexing
        limit,
      };

      if (searchQuery.trim()) apiParams.searchTerm = searchQuery.trim();
      if (uiFilters.priority) apiParams.priorities = uiFilters.priority;
      if (uiFilters.stageIds) apiParams.stageIds = uiFilters.stageIds;
      if (uiFilters.assignedTo) apiParams.assigneeIds = uiFilters.assignedTo;

      if (uiFilters.dateRange) {
        const formatDateWithTime = (date: Date) => {
          return date.toISOString().split("T")[0] + "T00:00:00";
        };

        const isPlaceholderFromDate = (date: Date) =>
          date.getTime() <= new Date("1970-01-02").getTime();

        const isPlaceholderToDate = (date: Date) =>
          date.getTime() >= new Date("2099-12-30").getTime();

        const hasRealFromDate =
          uiFilters.dateRange.from &&
          !isPlaceholderFromDate(uiFilters.dateRange.from);
        const hasRealToDate =
          uiFilters.dateRange.to &&
          !isPlaceholderToDate(uiFilters.dateRange.to);

        if (hasRealFromDate) {
          apiParams.startDateFrom = formatDateWithTime(
            uiFilters.dateRange.from
          );
        }

        if (hasRealToDate) {
          apiParams.startDateTo = formatDateWithTime(uiFilters.dateRange.to);
        }
      }

      return apiParams;
    },
    []
  );

  // ========== FETCH FUNCTIONS ==========

// In fetchTasksGrid and fetchTasksKanban functions, add type checking:
  const fetchTasksGrid = useCallback(
    async (page: number = 1, showLoading = false) => {
      if (isFilteringRef.current) return;

      isFilteringRef.current = true;
      if (showLoading) setIsRefreshing(true);

      try {
        const apiParams = convertFiltersToApiParams(filters, searchQuery, page, paginationState.pageSize);
        const response = await filterTasks(apiParams);

        if (response.isSuccess && response.data && 'totalPages' in response.data) {
          const apiResponse = response as unknown as ApiTaskResponse;
          const transformedTasks = transformTasks(apiResponse);
          
          setTasks(transformedTasks);
          setPaginationState({
            currentPage: apiResponse.data.pageIndex + 1,
            totalPages: apiResponse.data.totalPages,
            totalElements: apiResponse.data.totalElements,
            pageSize: apiResponse.data.pageSize,
          });
        } else {
          toast({
            title: "Error",
            description: response.message || "Failed to fetch tasks",
            variant: "destructive",
          });
          setTasks([]);
        }
      } catch (error) {
        console.error("Error fetching tasks:", error);
        toast({
          title: "Error",
          description: "Failed to fetch tasks. Please try again.",
          variant: "destructive",
        });
        setTasks([]);
      } finally {
        isFilteringRef.current = false;
        if (showLoading) setIsRefreshing(false);
      }
    },
    [filters, searchQuery, paginationState.pageSize, convertFiltersToApiParams, transformTasks, toast]
  );

  const fetchTasksKanban = useCallback(
    async (page: number = 1, append: boolean = false, showLoading = false) => {
      if (isFilteringRef.current) return;

      isFilteringRef.current = true;
      if (showLoading) setIsRefreshing(true);
      if (!append && page > 1) setIsLoadingMore(true);

      try {
        const apiParams = convertFiltersToApiParams(filters, searchQuery, page, paginationState.pageSize);
        const response = await filterTasks(apiParams);

        if (response.isSuccess && response.data) {
          let transformedTasks: Task[] = [];
          
          if ('totalPages' in response.data) {
            const apiResponse = response as unknown as ApiTaskResponse;
            transformedTasks = transformTasks(apiResponse);
            
            setHasMoreTasks(page < apiResponse.data.totalPages);
            setKanbanPage(page);
          } else if (Array.isArray(response.data)) {
            transformedTasks = transformTasks(response as FilterTasksResponse);
            setHasMoreTasks(transformedTasks.length === 20);
            setKanbanPage(page);
          }
          
          if (append && page > 1) {
            setAllTasksForInfiniteScroll(prev => {
              const existingIds = new Set(prev.map(task => task.id));
              const newTasks = transformedTasks.filter(task => !existingIds.has(task.id));
              return [...prev, ...newTasks];
            });
          } else {
            setAllTasksForInfiniteScroll(transformedTasks);
          }
        } else {
          toast({
            title: "Error",
            description: response.message || "Failed to fetch tasks",
            variant: "destructive",
          });
          if (!append) {
            setAllTasksForInfiniteScroll([]);
          }
        }
      } catch (error) {
        console.error("Error fetching tasks:", error);
        toast({
          title: "Error",
          description: "Failed to fetch tasks. Please try again.",
          variant: "destructive",
        });
        if (!append) {
          setAllTasksForInfiniteScroll([]);
        }
      } finally {
        isFilteringRef.current = false;
        setIsLoadingMore(false);
        if (showLoading) setIsRefreshing(false);
      }
    },
    [filters, searchQuery, convertFiltersToApiParams, transformTasks, toast]
  );

  // Load more tasks for infinite scroll
  const loadMoreTasks = useCallback(() => {
    if (!hasMoreTasks || isLoadingMore || isFilteringRef.current) return;
    
    const nextPage = kanbanPage + 1;
    fetchTasksKanban(nextPage, true, false);
  }, [hasMoreTasks, isLoadingMore, kanbanPage, fetchTasksKanban]);

  // Infinite scroll hook implementation
  const lastTaskElementRef = useInfiniteScroll(loadMoreTasks, hasMoreTasks, isLoadingMore);

  // ========== FETCH STAGES AND USERS ==========
  const fetchStages = useCallback(async () => {
    try {
      const stagesRes = await getTaskStagesDropdown();
      if (stagesRes.isSuccess) {
        setStages(stagesRes.data);
      } else {
        toast({
          title: "Error",
          description: stagesRes.message || "Failed to fetch stages",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error fetching stages:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch stages. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchUsers = useCallback(async () => {
    try {
      const usersRes = await getUsers();
      if (usersRes.isSuccess) {
        setUsers(
          usersRes.data.map((user) => ({
            ...user,
            contactNumber: user.contactNumber || "",
            userRole: user.userRole || "User",
          }))
        );
      } else {
        toast({
          title: "Error",
          description: usersRes.message || "Failed to fetch users",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch users. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // ========== INITIAL DATA FETCH ==========
  useEffect(() => {
    if (isInitialLoadingRef.current) return;

    const fetchInitialData = async () => {
      isInitialLoadingRef.current = true;
      setIsLoading(true);

      try {
        await Promise.all([
          fetchStages(),
          fetchUsers(),
        ]);

        // Initial fetch based on view mode
        if (viewMode === "grid") {
          await fetchTasksGrid(1, false);
        } else {
          await fetchTasksKanban(1, false, false);
        }


      } catch (error: any) {
        console.error("Error loading initial data:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to load initial data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [viewMode, fetchStages, fetchUsers, fetchTasksGrid, fetchTasksKanban, toast]); // Add viewMode as dependency

  // ========== SEARCH DEBOUNCING ==========
 useEffect(() => {
  if (searchTimeoutRef.current) {
    clearTimeout(searchTimeoutRef.current);
  }

  if (isInitialLoadingRef.current) return;

  searchTimeoutRef.current = setTimeout(() => {
    if (viewMode === "grid") {
      fetchTasksGrid(1, true);
    } else {
      setKanbanPage(1);
      setHasMoreTasks(true);
      fetchTasksKanban(1, false, true);
    }
  }, 300);

  return () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };
}, [searchQuery, viewMode, fetchTasksGrid, fetchTasksKanban]);

  // ========== PAGINATION HANDLERS ==========
  const handlePageChange = useCallback(
    (page: number) => {
      if (page < 1 || page > paginationState.totalPages || isRefreshing) return;
      fetchTasksGrid(page, true);
    },
    [paginationState.totalPages, isRefreshing, fetchTasksGrid]
  );

  // ========== FILTER HANDLERS ==========
  const handleFilterChange = useCallback(
    async (newFilters: typeof filters) => {
      setFilters(newFilters);
      
      if (viewMode === "grid") {
        setPaginationState(prev => ({ ...prev, currentPage: 1 }));
        await fetchTasksGrid(1, true);
      } else {
        setKanbanPage(1);
        setHasMoreTasks(true);
        await fetchTasksKanban(1, false, true);
      }
    },
    [viewMode, fetchTasksGrid, fetchTasksKanban]
  );

  const handleApplyFilters = useCallback(async () => {
    if (viewMode === "grid") {
      await fetchTasksGrid(paginationState.currentPage, true);
    } else {
      setKanbanPage(1);
      setHasMoreTasks(true);
      await fetchTasksKanban(1, false, true);
    }
  }, [viewMode, paginationState.currentPage, fetchTasksGrid, fetchTasksKanban]);

  // ========== VIEW MODE CHANGE HANDLER ==========
  const handleViewModeChange = useCallback(
    (newViewMode: "kanban" | "grid") => {
      if (newViewMode === viewMode) return;
      
      setViewMode(newViewMode);
      
      // Reset pagination/infinite scroll state
      if (newViewMode === "grid") {
        setPaginationState(prev => ({ ...prev, currentPage: 1 }));
      } else {
        setKanbanPage(1);
        setHasMoreTasks(true);
      }
      
      // Fetch data for new view mode
      if (newViewMode === "grid") {
        fetchTasksGrid(1, true);
      } else {
        fetchTasksKanban(1, false, true);
      }
    },
    [viewMode, fetchTasksGrid, fetchTasksKanban]
  );
const handleCloseModal = useCallback(() => {
  setIsAddModalOpen(false);
  setEditingTask(undefined);
  setPreSelectedStageId(null);
}, []);
  // ========== TASK OPERATIONS ==========
 const handleAddTask = useCallback(
    async (
      taskData: CreateTaskRequest | Partial<UpdateTaskRequest>,
      isEdit: boolean
    ) => {
      try {
        let response;

        if (isEdit && editingTask) {
          response = await updateTask(
            editingTask.id,
            taskData as Partial<UpdateTaskRequest>
          );
        } else {
          response = await createTask(taskData as CreateTaskRequest);
        }

        if (response.isSuccess) {
          // Refresh based on current view mode
          if (viewMode === "grid") {
            await fetchTasksGrid(paginationState.currentPage, true);
          } else {
            setKanbanPage(1);
            setHasMoreTasks(true);
            await fetchTasksKanban(1, false, true);
          }
          handleCloseModal();
          
          toast({
            title: isEdit ? "Task Updated" : "Task Created",
            description: `Task has been ${isEdit ? "updated" : "created"} successfully.`,
            variant: "default",
          });
        } else {
          toast({
            title: "Error",
            description: response.message || `Failed to ${isEdit ? "update" : "create"} task`,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error saving task:", error);
        toast({
          title: "Error",
          description: `Failed to ${isEdit ? "update" : "create"} task. Please try again.`,
          variant: "destructive",
        });
      }
    },
    [editingTask, viewMode, paginationState.currentPage, fetchTasksGrid, fetchTasksKanban, handleCloseModal, toast]
  );

   const handleCreateStage = useCallback(
    async (stageData: CreateStageRequest) => {
      try {
        const response = await createTaskStage(stageData);
        if (response.isSuccess) {
          await fetchStages();
          setIsCreateStageModalOpen(false);
          toast({
            title: "Stage Created",
            description: "Stage has been created successfully.",
            variant: "default",
          });
        } else {
          toast({
            title: "Error",
            description: response.message || "Failed to create stage",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error creating stage:", error);
        toast({
          title: "Error",
          description: "Failed to create stage. Please try again.",
          variant: "destructive",
        });
      }
    },
    [fetchStages, toast]
  );

  const handleEditStage = useCallback((stage: TaskStageEdit) => {
    setEditingStage(stage);
    setIsEditStageModalOpen(true);
  }, []);

  const handleSaveStage = useCallback(
    async (stageData: { name: string; description: string }) => {
      if (!editingStage) return;

      setIsUpdatingStage(true);

      try {
        const updateData: UpdateStageRequest = {};

        if (stageData.name !== editingStage.name) {
          updateData.name = stageData.name;
        }

        if (stageData.description !== (editingStage.description || "")) {
          updateData.description = stageData.description;
        }

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

            await fetchStages();
            
            // Refresh based on current view mode
            if (viewMode === "grid") {
              await fetchTasksGrid(paginationState.currentPage, false);
            } else {
              setKanbanPage(1);
              setHasMoreTasks(true);
              await fetchTasksKanban(1, false, false);
            }
          } else {
            throw new Error(response.message || "Failed to update stage");
          }
        } else {
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
    [editingStage, fetchStages, viewMode, paginationState.currentPage, fetchTasksGrid, fetchTasksKanban, toast]
  );

  const handleDeleteTask = useCallback(
    async (taskId: number) => {
      try {
        const response = await deleteTask(taskId);
        if (response.isSuccess) {
          // Refresh based on current view mode
          if (viewMode === "grid") {
            await fetchTasksGrid(paginationState.currentPage, true);
          } else {
            setKanbanPage(1);
            setHasMoreTasks(true);
            await fetchTasksKanban(1, false, true);
          }
          
          setIsDeleteTaskModalOpen(false);
          setTaskToDelete(null);
          toast({
            title: "Task Deleted",
            description: "Task has been deleted successfully.",
            variant: "default",
          });
        } else {
          toast({
            title: "Error",
            description: response.message || "Failed to delete task",
            variant: "destructive",
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
    [viewMode, paginationState.currentPage, fetchTasksGrid, fetchTasksKanban, toast]
  );

  const confirmDeleteTask = useCallback(() => {
    if (taskToDelete) {
      handleDeleteTask(taskToDelete.id);
    }
  }, [taskToDelete, handleDeleteTask]);

  const openDeleteConfirmation = useCallback((task: Task) => {
    setTaskToDelete(task);
    setIsDeleteTaskModalOpen(true);
  }, []);

   const handleDeleteStage = useCallback(
    async (stage: TaskStage) => {
      const currentTasks = viewMode === "grid" ? tasks : allTasksForInfiniteScroll;
      const stageTasks = currentTasks.filter((task) => task.taskStageId === stage.id);
      
      if (stageTasks.length > 0) {
        toast({
          title: "Cannot Delete Stage",
          description: "Please move or delete all tasks in this stage before deleting it.",
          variant: "destructive",
        });
        return;
      }

      setStageToDelete(stage);
      setIsDeleteModalOpen(true);
    },
    [tasks, allTasksForInfiniteScroll, viewMode, toast]
  );


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

        await fetchStages();
        
        // Refresh based on current view mode
        if (viewMode === "grid") {
          await fetchTasksGrid(paginationState.currentPage, false);
        } else {
          setKanbanPage(1);
          setHasMoreTasks(true);
          await fetchTasksKanban(1, false, false);
        }

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
  }, [stageToDelete, fetchStages, viewMode, paginationState.currentPage, fetchTasksGrid, fetchTasksKanban, toast]);

  const cancelDeleteStage = useCallback(() => {
    setIsDeleteModalOpen(false);
    setStageToDelete(null);
  }, []);

  // ========== TASK ACTION HANDLERS ==========
  const handleStopTaskConfirm = useCallback(
    async (comment: string) => {
      if (!taskToStop) return;

      setIsStoppingTask(true);

      try {
        await stopTask(taskToStop.toString(), { comment });

        toast({
          title: "Task Stopped",
          description: `Task #${taskToStop} has been stopped successfully.`,
          variant: "default",
        });

        // Refresh based on current view mode
        if (viewMode === "grid") {
          await fetchTasksGrid(paginationState.currentPage, true);
        } else {
          setKanbanPage(1);
          setHasMoreTasks(true);
          await fetchTasksKanban(1, false, true);
        }

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
    },
    [taskToStop, viewMode, paginationState.currentPage, fetchTasksGrid, fetchTasksKanban, toast]
  );

  const handleStopTaskCancel = useCallback(() => {
    setIsStopTaskModalOpen(false);
    setTaskToStop(null);
    setStopTaskComment("");
  }, []);

  const handleActionClick = useCallback(
    async (taskId: number, actionType: TaskActionType) => {
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

          // Refresh based on current view mode
          if (viewMode === "grid") {
            await fetchTasksGrid(paginationState.currentPage, true);
          } else {
            setKanbanPage(1);
            setHasMoreTasks(true);
            await fetchTasksKanban(1, false, true);
          }
        } catch (error) {
          console.error("Error starting task:", error);
          toast({
            title: "Error",
            description: "Failed to start task. Please try again.",
            variant: "destructive",
          });
        }
      } else if (actionType === "STOP") {
        setTaskToStop(taskId);
        setStopTaskComment("");
        setIsStopTaskModalOpen(true);
      }
    },
    [viewMode, paginationState.currentPage, fetchTasksGrid, fetchTasksKanban, toast]
  );

  // ========== EDIT TASK HANDLERS ==========
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
      estimatedHours: task.estimatedHours ?? undefined,
    };

    setEditingTask(editingTaskData);
    setPreSelectedStageId(null);
    setIsAddModalOpen(true);
  }, []);

  const handleAddTaskForStage = useCallback((stageId: number) => {
    setPreSelectedStageId(stageId);
    setEditingTask(undefined);
    setIsAddModalOpen(true);
  }, []);

 

  const handleCloseTaskDetails = useCallback(() => {
    setIsDetailsModalOpen(false);
    setSelectedTaskId(null);
  }, []);

  const handleEditTaskFromDetails = useCallback(() => {
    if (selectedTaskId) {
      const currentTasks = viewMode === "grid" ? tasks : allTasksForInfiniteScroll;
      const taskToEdit = currentTasks.find((task) => task.id === selectedTaskId);
      if (taskToEdit) {
        handleEditTask(taskToEdit);
        setIsDetailsModalOpen(false);
        setSelectedTaskId(null);
      }
    }
  }, [selectedTaskId, tasks, allTasksForInfiniteScroll, viewMode, handleEditTask]);

  const handleClearAllFilters = useCallback(async () => {
    setFilters({});
    setSearchQuery("");
    
    if (viewMode === "grid") {
      setPaginationState(prev => ({ ...prev, currentPage: 1 }));
      await fetchTasksGrid(1, true);
    } else {
      setKanbanPage(1);
      setHasMoreTasks(true);
      await fetchTasksKanban(1, false, true);
    }
  }, [viewMode, fetchTasksGrid, fetchTasksKanban]);

  // Client-side filtering for immediate UI response
  const filteredTasks = useMemo(() => {
    const currentTasks = viewMode === "grid" ? tasks : allTasksForInfiniteScroll;
    
    return currentTasks.filter((task) => {
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

      const matchesDateRange = (() => {
        if (!filters.dateRange) return true;

        const { from, to } = filters.dateRange;
        const taskStartDate = task.startDate;
        const taskEndDate = task.endDate;

        const isPlaceholderFromDate = (date: Date) =>
          date.getTime() <= new Date("1970-01-02").getTime();

        const isPlaceholderToDate = (date: Date) =>
          date.getTime() >= new Date("2099-12-30").getTime();

        const hasRealFromDate = from && !isPlaceholderFromDate(from);
        const hasRealToDate = to && !isPlaceholderToDate(to);

        if (hasRealFromDate && hasRealToDate) {
          const taskStartsInRange = taskStartDate >= from && taskStartDate <= to;
          const taskEndsInRange =
            taskEndDate && taskEndDate >= from && taskEndDate <= to;
          const taskSpansRange =
            taskStartDate <= from && taskEndDate && taskEndDate >= to;

          return taskStartsInRange || taskEndsInRange || taskSpansRange;
        } else if (hasRealFromDate) {
          return taskStartDate >= from || (taskEndDate && taskEndDate >= from);
        } else if (hasRealToDate) {
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
  }, [tasks, allTasksForInfiniteScroll, viewMode, searchQuery, filters]);

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

  // ========== LOADING STATE ==========
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading tasks...</div>
      </div>
    );
  }

  // ========== RENDER ==========
  return (
    <div className="min-h-screen">
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
        onViewModeChange={handleViewModeChange}
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
                className="kanban-board-container flex gap-4 overflow-x-auto pb-6 px-1"
                style={{
                  scrollBehavior: "smooth",
                  scrollbarWidth: "thin",
                  scrollbarColor: "#cbd5e1 #f1f5f9",
                  WebkitOverflowScrolling: "touch",
                }}
              >
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

                {stages.map((stage, index) => {
                  const stageTasks = filteredTasks.filter(
                    (task) => task.taskStageId === stage.id
                  );
                  
                  return (
                    <TaskColumn
                      key={stage.id}
                      stage={stage}
                      tasks={stageTasks}
                      onEditTask={handleEditTask}
                      onDeleteTask={handleDeleteTask}
                      onTaskClick={handleTaskClick}
                      onAddTaskForStage={handleAddTaskForStage}
                      stageIndex={index}
                      onTaskUpdate={() => {
                        setKanbanPage(1);
                        setHasMoreTasks(true);
                        fetchTasksKanban(1, false, true);
                      }}
                      onStageUpdate={() => {
                        fetchStages();
                        setKanbanPage(1);
                        setHasMoreTasks(true);
                        fetchTasksKanban(1, false, true);
                      }}
                      allStages={stages}
                      onStageReorder={(reorderedStages) => {
                        setStages(reorderedStages);
                      }}
                      onEditStage={handleEditStage}
                      onDeleteStage={handleDeleteStage}
                      onActionClick={handleActionClick}
                    />
                  );
                })}
              </div>

              {/* Infinite Scroll Loading Indicator */}
              {isLoadingMore && (
                <div className="flex justify-center py-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                    Loading more tasks...
                  </div>
                </div>
              )}

              {/* Infinite Scroll Trigger Element */}
              {hasMoreTasks && !isLoadingMore && (
                <div 
                  ref={lastTaskElementRef}
                  className="h-4 flex justify-center items-center"
                >
                  <div className="text-xs text-gray-400">Scroll for more tasks</div>
                </div>
              )}
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
                              <div
                                className="text-sm text-gray-500 max-w-xs truncate"
                                dangerouslySetInnerHTML={{ __html: task.description }}
                              />
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
                              onClick={() => handleTaskClick(task.id)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View
                            </button>
                            {task.isEditable && (
                              <button
                                onClick={() => handleEditTask(task)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                Edit
                              </button>
                            )}
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

              {/* Pagination Component for Grid View */}
              {filteredTasks.length > 0 && (
                <Pagination
                  currentPage={paginationState.currentPage}
                  totalPages={paginationState.totalPages}
                  totalElements={paginationState.totalElements}
                  pageSize={paginationState.pageSize}
                  onPageChange={handlePageChange}
                  isLoading={isRefreshing}
                />
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
        //@ts-ignore
        editingTask={editingTask}
        preSelectedStageId={preSelectedStageId}
        users={users}
      />

      {/* Create Stage Modal */}
      <CreateStageModal
        isOpen={isCreateStageModalOpen}
        onClose={() => setIsCreateStageModalOpen(false)}
        onSubmit={handleCreateStage}
        existingStagesCount={stages.length}
      />

      {/* Edit Stage Modal */}
      <EditStageModal
        stage={editingStage || { id: 0, name: "", description: "" }}
        isOpen={isEditStageModalOpen}
        onClose={() => {
          setIsEditStageModalOpen(false);
          setEditingStage(null);
        }}
        onSave={handleSaveStage}
      />

      {/* Delete Stage Modal */}
      <DeleteStageModal
        isOpen={isDeleteModalOpen}
        onClose={cancelDeleteStage}
        onConfirm={confirmDeleteStage}
        stageName={stageToDelete?.name || ""}
        isLoading={isUpdatingStage}
      />

      {/* Delete Task Modal */}
      <DeleteTaskModal
        isOpen={isDeleteTaskModalOpen}
        onClose={() => {
          setIsDeleteTaskModalOpen(false);
          setTaskToDelete(null);
        }}
        onConfirm={confirmDeleteTask}
        taskName={taskToDelete?.subject || ""}
        isLoading={isUpdatingStage}
      />

      {/* Stop Task Modal */}
      <StopTaskModal
        isOpen={isStopTaskModalOpen}
        onClose={handleStopTaskCancel}
        onConfirm={handleStopTaskConfirm}
        taskId={taskToStop}
        isLoading={isStoppingTask}
      />
    </div>
  );
}