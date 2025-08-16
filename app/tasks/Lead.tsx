"use client";
import { useState } from "react";

import { Task, TaskStatus, TaskFilters as TaskFiltersType } from "../../lib/task";
import { TaskFilters } from "@/components/task/TaskFilters";
import { TaskColumn } from "@/components/task/TaskColumn";
import { AddTaskModal } from "@/components/task/AddTaskModal";

// Sample data
const sampleTasks: Task[] = [
  {
    id: "1",
    subject: "Design new user interface",
    description: "Create wireframes and mockups for the new dashboard interface",
    status: "BACKLOG",
    priority: "HIGH",
    labels: ["design", "ui"],
    assignedTo: "Jane Smith",
    createdBy: "John Doe",
    startDate: new Date("2025-08-15"),
    endDate: new Date("2025-08-20"),
    createdAt: new Date("2025-08-14"),
    updatedAt: new Date("2025-08-14")
  },
  {
    id: "2",
    subject: "Implement authentication system",
    description: "Set up user authentication with JWT tokens",
    status: "TODO",
    priority: "URGENT",
    labels: ["backend", "security"],
    assignedTo: "Mike Johnson",
    createdBy: "John Doe",
    startDate: new Date("2025-08-16"),
    endDate: new Date("2025-08-25"),
    createdAt: new Date("2025-08-14"),
    updatedAt: new Date("2025-08-14")
  },
  {
    id: "3",
    subject: "Fix responsive layout issues",
    description: "Address mobile layout problems on the product page",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    labels: ["frontend", "bug"],
    assignedTo: "Jane Smith",
    createdBy: "Mike Johnson",
    startDate: new Date("2025-08-14"),
    endDate: new Date("2025-08-18"),
    createdAt: new Date("2025-08-13"),
    updatedAt: new Date("2025-08-14")
  },
  {
    id: "4",
    subject: "Code review for payment module",
    description: "Review and test the new payment processing functionality",
    status: "IN_REVIEW",
    priority: "HIGH",
    labels: ["review", "payment"],
    assignedTo: "John Doe",
    createdBy: "Jane Smith",
    startDate: new Date("2025-08-12"),
    endDate: new Date("2025-08-15"),
    createdAt: new Date("2025-08-12"),
    updatedAt: new Date("2025-08-14")
  },
  {
    id: "5",
    subject: "Setup CI/CD pipeline",
    description: "Configure automated testing and deployment pipeline",
    status: "DONE",
    priority: "MEDIUM",
    labels: ["devops", "automation"],
    assignedTo: "Mike Johnson",
    createdBy: "John Doe",
    startDate: new Date("2025-08-10"),
    endDate: new Date("2025-08-13"),
    createdAt: new Date("2025-08-10"),
    updatedAt: new Date("2025-08-13")
  }
];

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>(sampleTasks);
  const [filters, setFilters] = useState<TaskFiltersType>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();

  const statuses: TaskStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

  // Filter tasks based on search and filters
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.labels.some(label => label.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesPriority = !filters.priority || task.priority === filters.priority;
    const matchesCreatedBy = !filters.createdBy || task.createdBy === filters.createdBy;
    const matchesAssignedTo = !filters.assignedTo || task.assignedTo === filters.assignedTo;
    
    return matchesSearch && matchesPriority && matchesCreatedBy && matchesAssignedTo;
  });

  const handleAddTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTask: Task = {
      ...taskData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    if (editingTask) {
      setTasks(tasks.map(task => 
        task.id === editingTask.id 
          ? { ...newTask, id: editingTask.id, createdAt: editingTask.createdAt }
          : task
      ));
      setEditingTask(undefined);
    } else {
      setTasks([...tasks, newTask]);
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

  return (
    <div className="min-h-screen ">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Task Management</h1>
          <p className="text-muted-foreground">{`Organize and track your team's work efficiently`}</p>
        </div>

        {/* Filters */}
        <TaskFilters
          filters={filters}
          onFiltersChange={setFilters}
          onAddTask={() => setIsAddModalOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearAllFilters={handleClearAllFilters}
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
        />
      </div>
    </div>
  );
};

export default Index;