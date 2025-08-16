"use client";
import { useState, useEffect } from "react";
import { TaskFilters } from "@/components/task/TaskFilters";
import { TaskColumn } from "@/components/task/TaskColumn";
import { AddTaskModal } from "@/components/task/AddTaskModal";
import { createTask, deleteTask, filterTasks, getTaskStagesDropdown, getUsers, updateTask } from "../services/data.service";

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

interface User {
  userId: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  contactNumber: string;
  dateOfBirth?: string;
  dateOfJoin?: string;
  departmentId?: number;
  departmentName?: string;
  isActive?: boolean;
  isPasswordUpdated?: boolean;
  modules?: any[];
  createdAt?: string;
  updatedAt?: string;
}

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
  taskStageId: number; // Changed from optional to required
  taskStageName: string; // Added missing property
  assignees: Assignee[]; // Added missing property
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
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [stages, setStages] = useState<TaskStage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Transform API response to flat array of tasks
 const transformTasks = (apiResponse: ApiTaskResponse): Task[] => {
  if (!apiResponse.isSuccess || !apiResponse.data) return [];
  
  return apiResponse.data.content.flatMap(stage => 
    stage.tasks.map(task => ({
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
          setTasks(transformTasks(tasksRes));
        } else {
          setTasks([]);
        }

        // Handle stages response
        if (stagesRes.isSuccess) setStages(stagesRes.data);
        
        // Handle users response
        if (usersRes.isSuccess) {
          setUsers(usersRes.data.map(user => ({
            ...user,
            contactNumber: user.contactNumber || ''
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
        setTasks(transformTasks(updatedTasksRes));
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
    
    // Convert date range to API format
    if (uiFilters.dateRange) {
      apiParams.startDateFrom = uiFilters.dateRange.from.toISOString().split('T')[0];
      apiParams.startDateTo = uiFilters.dateRange.to.toISOString().split('T')[0];
      apiParams.endDateFrom = uiFilters.dateRange.from.toISOString().split('T')[0];
      apiParams.endDateTo = uiFilters.dateRange.to.toISOString().split('T')[0];
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
          setTasks(transformTasks(updatedTasksRes));
        }
        handleCloseModal();
      }
    } catch (error) {
      console.error("Error saving task:", error);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
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
        setTasks(transformTasks(response));
      }
    });
  };

  const handleFilterChange = async (newFilters: typeof filters) => {
    setFilters(newFilters);
    try {
      const apiParams = convertFiltersToApiParams(newFilters, searchQuery);
      const filtered = await filterTasks(apiParams);
      if (filtered.isSuccess) {
        setTasks(transformTasks(filtered));
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
          setTasks(transformTasks(filtered));
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
      <div className="container mx-auto px-4 py-6">
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
      </div>
    </div>
  );
}