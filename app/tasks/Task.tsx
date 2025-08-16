"use client";
import { useState, useEffect } from "react";
import { TaskFilters } from "@/components/task/TaskFilters";
import { TaskColumn } from "@/components/task/TaskColumn";
import { AddTaskModal } from "@/components/task/AddTaskModal";
import { createTask, filterTasks, getTaskStagesDropdown, getUsers, updateTask } from "../services/data.service";

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
  id: string;
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
  const [filters, setFilters] = useState<FilterTasksParams>({});
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
        id: task.id.toString(),
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
        updatedAt: new Date(task.updatedAt)
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
            contactNumber: user.contactNumber || '' // Ensure contactNumber is always a string
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

  // Filter tasks based on search and filters
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPriority = !filters.priorities || filters.priorities.split(',').includes(task.priority);
    const matchesStage = !filters.stageIds || filters.stageIds.split(',').includes(task.id);
    const matchesAssignee = !filters.assigneeIds || 
      task.assignedTo.toLowerCase().includes(filters.assigneeIds.toLowerCase());
    
    return matchesSearch && matchesPriority && matchesStage && matchesAssignee;
  });

  const handleAddTask = async (taskData: CreateTaskRequest) => {
    try {
      let response;
      
      if (editingTask) {
        const updateData: UpdateTaskRequest = {
          assignees: taskData.assignees
        };
        response = await updateTask(parseInt(editingTask.id), updateData);
      } else {
        response = await createTask(taskData);
      }

      if (response.isSuccess) {
        const updatedTasksRes = await filterTasks({});
        if (updatedTasksRes) {
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
  };

  const handleFilterChange = async (newFilters: FilterTasksParams) => {
    setFilters(newFilters);
    try {
      const filtered = await filterTasks(newFilters);
      if (filtered.isSuccess) {
        setTasks(transformTasks(filtered));
      }
    } catch (error) {
      console.error("Error filtering tasks:", error);
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
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Task Management</h1>
          <p className="text-muted-foreground">Organize and track your team's work efficiently</p>
        </div>

        {/* Filters */}
        <TaskFilters
          filters={{
            priority: filters.priorities,
            labels: undefined,
            createdBy: undefined,
            assignedTo: filters.assigneeIds,
            dateRange: undefined
          }}
          onFiltersChange={(newFilters) => {
            handleFilterChange({
              priorities: newFilters.priority,
              assigneeIds: newFilters.assignedTo
            });
          }}
          onAddTask={() => setIsAddModalOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearAllFilters={handleClearAllFilters}
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