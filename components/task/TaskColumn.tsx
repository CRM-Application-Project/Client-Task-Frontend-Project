"use client";
import { Task, TaskStatus } from "@/lib/task";
import { TaskCard } from "./TaskCard";
import { Badge } from "@/components/ui/badge";

interface TaskColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onEditTask?: (task: Task) => void;
}

const statusConfig = {
  BACKLOG: {
    title: "Backlog",
    color: "bg-status-backlog",
    textColor: "text-white"
  },
  TODO: {
    title: "To Do",
    color: "bg-status-todo",
    textColor: "text-white"
  },
  IN_PROGRESS: {
    title: "In Progress",
    color: "bg-status-progress",
    textColor: "text-white"
  },
  IN_REVIEW: {
    title: "In Review",
    color: "bg-status-review",
    textColor: "text-white"
  },
  DONE: {
    title: "Done",
    color: "bg-status-done",
    textColor: "text-white"
  }
};

export const TaskColumn = ({ status, tasks, onEditTask }: TaskColumnProps) => {
  const config = statusConfig[status];
  
  return (
    <div className="flex-1 min-w-[280px]">
      <div className="mb-4">
        <div className={`${config.color} ${config.textColor} px-4 py-3 rounded-lg flex items-center justify-between shadow-sm`}>
          <h2 className="font-semibold text-sm uppercase tracking-wide">
            {config.title}
          </h2>
          <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
            {tasks.length}
          </Badge>
        </div>
      </div>
      
      <div className="space-y-3 min-h-[500px]">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={onEditTask}
          />
        ))}
        
        {tasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No tasks</p>
          </div>
        )}
      </div>
    </div>
  );
};