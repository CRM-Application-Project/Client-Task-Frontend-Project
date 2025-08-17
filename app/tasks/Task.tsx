"use client";
import { useState, useEffect } from "react";
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

// Use the imported User type from data.service
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

// Updated interface to match actual API response
interface EditingTaskResponse {
  id: number;
  subject: string;
  description: string;
  priority: TaskPriority;
  startDate: string; // Keep as string for modal compatibility
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

// Updated to match actual API response structure
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

// Alternative interface for different API response structure
interface FilterTasksResponse {
  isSuccess: boolean;
  message: string;
  data: TaskResponse[] | { content: any[] } | any; // Allow all possible response structures
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

  // Transform API response to flat array of tasks - handles both response structures
  const transformTasks = (apiResponse: ApiTaskResponse | FilterTasksResponse): Task[] => {
    if (!apiResponse.isSuccess || !apiResponse.data) return [];
    
    if ('content' in apiResponse.data) {
      // Define interfaces for API content structure
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
      // Handle simple array structure (FilterTasksResponse)
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
  };

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksRes, stagesRes, usersRes] = await Promise.all([
          filterTasks({}),
          getTaskStagesDropdown(),
          getUsers()
        ]);

        if (tasksRes.isSuccess) {
          setTasks(transformTasks(tasksRes as unknown as ApiTaskResponse | FilterTasksResponse));
        } else {
          setTasks([]);
        }

        // Handle stages response
        if (stagesRes.isSuccess) setStages(stagesRes.data);
        
        // Handle users response
        if (usersRes.isSuccess) {
          setUsers(usersRes.data.map(user => ({
            ...user,
            contactNumber: user.contactNumber || '',
            userRole: user.userRole || 'User' // Provide default userRole
          })));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDeleteTask = async (taskId: number) => {
    try {
      const response = await deleteTask(taskId);
      if (response.isSuccess) {
        // Refresh tasks with current filters
        const currentApiParams = convertFiltersToApiParams(filters, searchQuery);
        const updatedTasksRes = await filterTasks(currentApiParams);
        if (updatedTasksRes.isSuccess) {
          setTasks(transformTasks(updatedTasksRes as unknown as ApiTaskResponse | FilterTasksResponse));
        }
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  // Convert filter object to API parameters
  const convertFiltersToApiParams = (uiFilters: typeof filters, searchQuery: string): FilterTasksParams => {
    const apiParams: FilterTasksParams = {};

    if (searchQuery) apiParams.searchTerm = searchQuery;
    if (uiFilters.priority) apiParams.priorities = uiFilters.priority;
    if (uiFilters.stageIds) apiParams.stageIds = uiFilters.stageIds;
    if (uiFilters.assignedTo) apiParams.assigneeIds = uiFilters.assignedTo;
    
    // Convert date range to API format with time component
    if (uiFilters.dateRange) {
      const formatDateWithTime = (date: Date) => {
        // Ensure we include time component (00:00:00 by default)
        return date.toISOString().split('T')[0] + 'T00:00:00';
      };

      apiParams.startDateFrom = formatDateWithTime(uiFilters.dateRange.from);
      apiParams.startDateTo = formatDateWithTime(uiFilters.dateRange.to);
      apiParams.endDateFrom = formatDateWithTime(uiFilters.dateRange.from);
      apiParams.endDateTo = formatDateWithTime(uiFilters.dateRange.to);
    }

    return apiParams;
  };

  // Filter tasks based on search and filters (client-side filtering as backup)
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = searchQuery === "" || 
                         task.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPriority = !filters.priority || task.priority === filters.priority;
    const matchesStage = !filters.stageIds || task.taskStageId?.toString() === filters.stageIds;
    const matchesAssignee = !filters.assignedTo || 
      task.assignedTo.toLowerCase().includes(filters.assignedTo.toLowerCase());
    
    // Date range filtering (for start date)
    const matchesDateRange = !filters.dateRange || (
      task.startDate >= filters.dateRange.from && 
      task.startDate <= filters.dateRange.to
    );
    
    return matchesSearch && matchesPriority && matchesStage && matchesAssignee && matchesDateRange;
  });

  const handleAddTask = async (taskData: CreateTaskRequest) => {
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
        // Refresh tasks with current filters
        const currentApiParams = convertFiltersToApiParams(filters, searchQuery);
        const updatedTasksRes = await filterTasks(currentApiParams);
        if (updatedTasksRes.isSuccess) {
          setTasks(transformTasks(updatedTasksRes as unknown as ApiTaskResponse | FilterTasksResponse));
        }
        handleCloseModal();
      }
    } catch (error) {
      console.error("Error saving task:", error);
    }
  };

  const handleEditTask = (task: Task) => {
    // Convert Task to EditingTaskResponse format
    const editingTaskData: EditingTaskResponse = {
      id: task.id,
      subject: task.subject,
      description: task.description,
      priority: task.priority,
      startDate: task.startDate.toISOString(), // Convert Date to string
      endDate: task.endDate ? task.endDate.toISOString() : null,
      taskStageId: task.taskStageId,
      taskStageName: task.taskStageName,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      assignees: task.assignees
    };
    
    setEditingTask(editingTaskData);
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingTask(undefined);
  };

  const handleClearAllFilters = () => {
    setFilters({});
    setSearchQuery("");
    // Fetch all tasks without filters
    filterTasks({}).then(response => {
      if (response.isSuccess) {
        setTasks(transformTasks(response as ApiTaskResponse | FilterTasksResponse));
      }
    });
  };

  const handleFilterChange = async (newFilters: typeof filters) => {
    setFilters(newFilters);
    try {
      const apiParams = convertFiltersToApiParams(newFilters, searchQuery);
      const filtered = await filterTasks(apiParams);
      if (filtered.isSuccess) {
        setTasks(transformTasks(filtered as ApiTaskResponse | FilterTasksResponse));
      }
    } catch (error) {
      console.error("Error filtering tasks:", error);
    }
  };

  // Handle search changes
  useEffect(() => {
    const handleSearch = async () => {
      try {
        const apiParams = convertFiltersToApiParams(filters, searchQuery);
        const filtered = await filterTasks(apiParams);
        if (filtered.isSuccess) {
          setTasks(transformTasks(filtered as ApiTaskResponse | FilterTasksResponse));
        }
      } catch (error) {
        console.error("Error searching tasks:", error);
      }
    };

    const debounceTimer = setTimeout(handleSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, filters]);

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