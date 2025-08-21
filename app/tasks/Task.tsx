"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { TaskFilters } from "@/components/task/TaskFilters";
import { TaskColumn } from "@/components/task/TaskColumn";
import { AddTaskModal } from "@/components/task/AddTaskModal";
 // Import the new modal
import {
  createTask,
  deleteTask,
  filterTasks,
  getTaskStagesDropdown,
  getUsers,
  updateTask,
  createTaskStage, // Import the new service function
  User as ServiceUser,
} from "../services/data.service";
import { CreateStageModal } from "@/components/task/CreateStageModal";
import { TaskDetailsModal } from "@/components/task/TaskDetailsModal";

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
  assignee: Assignee;
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
  assignee: Assignee;
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
  startTime: string;
  endTime: string;
  assignee: string;
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

// ========== MAIN COMPONENT ==========
const statuses: TaskStatus[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
];

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
  const [viewMode, setViewMode] = useState<'kanban' | 'grid'>('kanban');
  
  // New state for Create Stage Modal
  const [isCreateStageModalOpen, setIsCreateStageModalOpen] = useState(false);
  
  const handleTaskClick = useCallback((taskId: number) => {
    setSelectedTaskId(taskId);
    setIsDetailsModalOpen(true);
  }, []);

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
              createdBy: task.assignee?.label || "Unknown",
              startDate: new Date(task.startDate),
              endDate: task.endDate ? new Date(task.endDate) : null,
              createdAt: new Date(task.createdAt),
              updatedAt: new Date(task.updatedAt),
              taskStageId: task.taskStageId,
              taskStageName: task.taskStageName,
              assignee: task.assignee,
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
          createdBy: task.assignee?.label || "Unknown",
          startDate: new Date(task.startDate),
          endDate: task.endDate ? new Date(task.endDate) : null,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt),
          taskStageId: task.taskStageId,
          taskStageName: task.taskStageName,
          assignee: task.assignee,
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

        apiParams.startDateFrom = formatDateWithTime(uiFilters.dateRange.from);
        apiParams.startDateTo = formatDateWithTime(uiFilters.dateRange.to);
        apiParams.endDateFrom = formatDateWithTime(uiFilters.dateRange.from);
        apiParams.endDateTo = formatDateWithTime(uiFilters.dateRange.to);
      }

      return apiParams;
    },
    []
  );

  // Optimized task fetching function
  const fetchTasks = useCallback(
    async (filterParams?: FilterTasksParams, showLoading = false) => {
      // Prevent duplicate API calls
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
        // Fetch all data in parallel, but only once
        const [stagesRes, usersRes] = await Promise.all([
          getTaskStagesDropdown(),
          getUsers(),
        ]);

        // Handle stages response
        if (stagesRes.isSuccess) {
          setStages(stagesRes.data);
          console.log("Fetched stages:", stagesRes.data);
        }

        // Handle users response
        if (usersRes.isSuccess) {
          setUsers(
            usersRes.data.map((user) => ({
              ...user,
              contactNumber: user.contactNumber || "",
              userRole: user.userRole || "User",
            }))
          );
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

  // Update your existing handleFilterChange function to handle the apply filters:
  const handleApplyFilters = useCallback(async () => {
    const apiParams = convertFiltersToApiParams(filters, searchQuery);
    await fetchTasks(apiParams, true);
  }, [filters, searchQuery, convertFiltersToApiParams, fetchTasks]);

  // Handle filter changes
  const handleFilterChange = useCallback(
    async (newFilters: typeof filters) => {
      setFilters(newFilters);

      // Immediately fetch with new filters
      const apiParams = convertFiltersToApiParams(newFilters, searchQuery);
      await fetchTasks(apiParams, true);
    },
    [searchQuery, convertFiltersToApiParams, fetchTasks]
  );

  const handleDeleteTask = useCallback(
    async (taskId: number) => {
      try {
        const response = await deleteTask(taskId);
        if (response.isSuccess) {
          // Simply refresh with current filters
          await fetchTasks(undefined, true);
        }
      } catch (error) {
        console.error("Error deleting task:", error);
      }
    },
    [fetchTasks]
  );

  const handleAddTask = useCallback(async (taskData: CreateTaskRequest) => {
    try {
      let response;
      
      if (editingTask) {
        const updateData: UpdateTaskRequest = {
          subject: taskData.subject,
          description: taskData.description,
          priority: taskData.priority,
          taskStageId: taskData.taskStageId,
          startTime: taskData.startDate,
          endTime: taskData.endDate,
          assignee: taskData.assignee
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
    },
    [ fetchTasks]
  );

  // New function to handle stage creation
  const handleCreateStage = useCallback(async (stageData: CreateStageRequest) => {
    try {
      const response = await createTaskStage(stageData);
      if (response.isSuccess) {
        // Refresh stages after successful creation
        await fetchStages();
        setIsCreateStageModalOpen(false);
      } else {
        console.error("Failed to create stage:", response.message);
        // You might want to show an error message to the user here
      }
    } catch (error) {
      console.error("Error creating stage:", error);
    }
  }, [fetchStages]);

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
    };

    setEditingTask(editingTaskData);
    setIsAddModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsAddModalOpen(false);
    setEditingTask(undefined);
  }, []);
 const handleCloseTaskDetails = useCallback(() => {
    setIsDetailsModalOpen(false);
    setSelectedTaskId(null);
  }, []);

  // Add handler for editing task from details modal
  const handleEditTaskFromDetails = useCallback(() => {
    if (selectedTaskId) {
      const taskToEdit = tasks.find(task => task.id === selectedTaskId);
      if (taskToEdit) {
        handleEditTask(taskToEdit);
        setIsDetailsModalOpen(false);
        setSelectedTaskId(null);
      }
    }
  }, [selectedTaskId, tasks]);
  const handleClearAllFilters = useCallback(async () => {
    setFilters({});
    setSearchQuery("");
    // Fetch all tasks without any filters
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
      !filters.assignedTo ||
      task.assignedTo.toLowerCase().includes(filters.assignedTo.toLowerCase());

    const matchesDateRange =
      !filters.dateRange ||
      (task.startDate >= filters.dateRange.from &&
        task.startDate <= filters.dateRange.to);

    return (
      matchesSearch &&
      matchesPriority &&
      matchesStage &&
      matchesAssignee &&
      matchesDateRange
    );
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Stages Found</h3>
              <p className="text-gray-500 mb-4">
                You need to create at least one stage to start managing tasks.
              </p>
              <button
                onClick={() => setIsCreateStageModalOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-[#636363] text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none "
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Stage
              </button>
            </div>
          </div>
        )}

        {/* Task Board - Only show if stages exist */}
       {stages.length > 0 && (
  <>
    {viewMode === 'kanban' && (
      <div className="flex gap-3 overflow-x-auto pb-6">
        {stages.map((stage, index) => (
          <TaskColumn
            key={stage.id}
            stage={stage}
            tasks={filteredTasks.filter(task => task.taskStageId === stage.id)}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onTaskClick={handleTaskClick}
            stageIndex={index}
            onTaskUpdate={() => fetchTasks(undefined, true)} // Add this line
          />
        ))}
                
                {/* Add Stage Button in Kanban View */}
              
      </div>
    )}
            {viewMode === 'grid' && (
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
                            {task.startDate.toLocaleDateString('en-US', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric' 
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {task.endDate ? task.endDate.toLocaleDateString('en-US', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric' 
                            }) : 'No due date'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditTask(task)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
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

            {/* Add Stage Button in Grid View */}
            {viewMode === 'grid' && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => setIsCreateStageModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Stage
                </button>
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
          users={users}
        />

        {/* Create Stage Modal */}
        <CreateStageModal
          isOpen={isCreateStageModalOpen}
          onClose={() => setIsCreateStageModalOpen(false)}
          onSubmit={handleCreateStage}
          existingStagesCount={stages.length}
        />
          {selectedTaskId && (
          <TaskDetailsModal
            isOpen={isDetailsModalOpen}
            onClose={handleCloseTaskDetails}
            taskId={selectedTaskId}
            onEdit={handleEditTaskFromDetails}
          />
        )}
      </>
    </div>
  );
}