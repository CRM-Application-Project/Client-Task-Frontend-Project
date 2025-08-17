"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { TaskFilters } from "@/components/task/TaskFilters";
import { TaskColumn } from "@/components/task/TaskColumn";
import { AddTaskModal } from "@/components/task/AddTaskModal";
import { createTask, deleteTask, filterTasks, getTaskStagesDropdown, getUsers, updateTask, User as ServiceUser } from "../services/data.service";

// ========== TYPE DEFINITIONS ==========
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

interface Assignee {
  id: string;
  label: string;
}

interface TaskStage {
  id: number;
  name: string;
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
  assignees: Assignee[];
}

interface Task {
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
  assignees: Assignee[];
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
  assignees: Assignee[];
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
  startTime: string;
  endtime: string;
  assignees: string[];
}

interface UpdateTaskRequest {
  subject: string;
  description: string;
  priority: TaskPriority;
  taskStageId: number;
  startTime: string;
  endtime: string;
  assignees: string[];
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

// ========== MAIN COMPONENT ==========
const statuses: TaskStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

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
  const [editingTask, setEditingTask] = useState<EditingTaskResponse | undefined>();
  const [stages, setStages] = useState<TaskStage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refs to track if we're already fetching to prevent duplicate calls
  const isInitialLoadingRef = useRef(false);
  const isFilteringRef = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Transform API response to flat array of tasks
  const transformTasks = useCallback((apiResponse: ApiTaskResponse | FilterTasksResponse): Task[] => {
    if (!apiResponse.isSuccess || !apiResponse.data) return [];
    
    if ('content' in apiResponse.data) {
      interface StageContent {
        stageId: number;
        stageName: string;
        stageOrder: number;
        tasks: TaskResponse[];
      }

      return apiResponse.data.content.flatMap((stage: StageContent) => 
        stage.tasks.map((task: TaskResponse): Task => ({
          id: task.id,
          subject: task.subject,
          description: task.description,
          status: task.taskStageName as TaskStatus,
          priority: task.priority,
          labels: [],
          assignedTo: task.assignees[0]?.label || "Unassigned",
          createdBy: task.assignees[0]?.label || "Unknown",
          startDate: new Date(task.startDate),
          endDate: task.endDate ? new Date(task.endDate) : null,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt),
          taskStageId: task.taskStageId,
          taskStageName: task.taskStageName,
          assignees: task.assignees
        }))
      );
    } else {
      return (apiResponse.data as TaskResponse[]).map(task => ({
        id: task.id,
        subject: task.subject,
        description: task.description,
        status: task.taskStageName as TaskStatus,
        priority: task.priority,
        labels: [],
        assignedTo: task.assignees[0]?.label || "Unassigned",
        createdBy: task.assignees[0]?.label || "Unknown",
        startDate: new Date(task.startDate),
        endDate: task.endDate ? new Date(task.endDate) : null,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
        taskStageId: task.taskStageId,
        taskStageName: task.taskStageName,
        assignees: task.assignees
      }));
    }
  }, []);

  // Convert filter object to API parameters
  const convertFiltersToApiParams = useCallback((uiFilters: typeof filters, searchQuery: string): FilterTasksParams => {
    const apiParams: FilterTasksParams = {};

    if (searchQuery.trim()) apiParams.searchTerm = searchQuery.trim();
    if (uiFilters.priority) apiParams.priorities = uiFilters.priority;
    if (uiFilters.stageIds) apiParams.stageIds = uiFilters.stageIds;
    if (uiFilters.assignedTo) apiParams.assigneeIds = uiFilters.assignedTo;
    
    if (uiFilters.dateRange) {
      const formatDateWithTime = (date: Date) => {
        return date.toISOString().split('T')[0] + 'T00:00:00';
      };

      apiParams.startDateFrom = formatDateWithTime(uiFilters.dateRange.from);
      apiParams.startDateTo = formatDateWithTime(uiFilters.dateRange.to);
      apiParams.endDateFrom = formatDateWithTime(uiFilters.dateRange.from);
      apiParams.endDateTo = formatDateWithTime(uiFilters.dateRange.to);
    }

    return apiParams;
  }, []);

  // Optimized task fetching function
  const fetchTasks = useCallback(async (filterParams?: FilterTasksParams, showLoading = false) => {
    // Prevent duplicate API calls
    if (isFilteringRef.current) return;
    
    isFilteringRef.current = true;
    if (showLoading) setIsRefreshing(true);

    try {
      const apiParams = filterParams || convertFiltersToApiParams(filters, searchQuery);
      const response = await filterTasks(apiParams);
      
      if (response.isSuccess) {
        const transformedTasks = transformTasks(response as ApiTaskResponse | FilterTasksResponse);
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
  }, [filters, searchQuery, convertFiltersToApiParams, transformTasks]);

  // Fetch initial data only once
  useEffect(() => {
    if (isInitialLoadingRef.current) return;
    
    const fetchInitialData = async () => {
      isInitialLoadingRef.current = true;
      
      try {
        // Fetch all data in parallel, but only once
        const [stagesRes, usersRes] = await Promise.all([
          getTaskStagesDropdown(),
          getUsers()
        ]);

        // Handle stages response
        if (stagesRes.isSuccess) {
          setStages(stagesRes.data);
        }
        
        // Handle users response
        if (usersRes.isSuccess) {
          setUsers(usersRes.data.map(user => ({
            ...user,
            contactNumber: user.contactNumber || '',
            userRole: user.userRole || 'User'
          })));
        }

        // Fetch initial tasks
        await fetchTasks({}, false);
        
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []); // Empty dependency array - only run once

  // Debounced search effect
  useEffect(() => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Don't trigger search during initial load
    if (isInitialLoadingRef.current) return;

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      const apiParams = convertFiltersToApiParams(filters, searchQuery);
      fetchTasks(apiParams, true);
    }, 300);

    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]); // Only depend on searchQuery

  // Handle filter changes
  const handleFilterChange = useCallback(async (newFilters: typeof filters) => {
    setFilters(newFilters);
    
    // Immediately fetch with new filters
    const apiParams = convertFiltersToApiParams(newFilters, searchQuery);
    await fetchTasks(apiParams, true);
  }, [searchQuery, convertFiltersToApiParams, fetchTasks]);

  const handleDeleteTask = useCallback(async (taskId: number) => {
    try {
      const response = await deleteTask(taskId);
      if (response.isSuccess) {
        // Simply refresh with current filters
        await fetchTasks(undefined, true);
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  }, [fetchTasks]);

  const handleAddTask = useCallback(async (taskData: CreateTaskRequest) => {
    try {
      let response;
      
      if (editingTask) {
        const updateData: UpdateTaskRequest = {
          subject: taskData.subject,
          description: taskData.description,
          priority: taskData.priority,
          taskStageId: taskData.taskStageId,
          startTime: taskData.startTime,
          endtime: taskData.endtime,
          assignees: taskData.assignees
        };
        response = await updateTask(editingTask.id, updateData);
      } else {
        response = await createTask(taskData);
      }

      if (response.isSuccess) {
        // Refresh tasks and close modal
        await fetchTasks(undefined, true);
        handleCloseModal();
      }
    } catch (error) {
      console.error("Error saving task:", error);
    }
  }, [editingTask, fetchTasks]);

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
      assignees: task.assignees
    };
    
    setEditingTask(editingTaskData);
    setIsAddModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsAddModalOpen(false);
    setEditingTask(undefined);
  }, []);

  const handleClearAllFilters = useCallback(async () => {
    setFilters({});
    setSearchQuery("");
    // Fetch all tasks without any filters
    await fetchTasks({}, true);
  }, [fetchTasks]);

  // Client-side filtering for immediate UI response
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = searchQuery === "" || 
                         task.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPriority = !filters.priority || task.priority === filters.priority;
    const matchesStage = !filters.stageIds || task.taskStageId?.toString() === filters.stageIds;
    const matchesAssignee = !filters.assignedTo || 
      task.assignedTo.toLowerCase().includes(filters.assignedTo.toLowerCase());
    
    const matchesDateRange = !filters.dateRange || (
      task.startDate >= filters.dateRange.from && 
      task.startDate <= filters.dateRange.to
    );
    
    return matchesSearch && matchesPriority && matchesStage && matchesAssignee && matchesDateRange;
  });

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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Task Management</h1>
          <p className="text-muted-foreground">{`Organize and track your team's work efficiently`}</p>
        </div>

        {/* Loading indicator for refreshing */}
        {isRefreshing && (
          <div className="mb-4 flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Updating tasks...</div>
          </div>
        )}

        {/* Filters */}
        <TaskFilters
          filters={filters}
          onFiltersChange={handleFilterChange}
          onAddTask={() => setIsAddModalOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearAllFilters={handleClearAllFilters}
          stages={stages}
          users={users}
        />

        {/* Task Board */}
        <div className="flex gap-6 overflow-x-auto pb-6">
          {statuses.map(status => (
            <TaskColumn
              key={status}
              status={status}
              tasks={filteredTasks.filter(task => task.status === status)}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
            />
          ))}
        </div>

        {/* Add Task Modal */}
        <AddTaskModal
          isOpen={isAddModalOpen}
          onClose={handleCloseModal}
          onSubmit={handleAddTask}
          editingTask={editingTask}
          users={users}
        />
      </>
    </div>
  );
}