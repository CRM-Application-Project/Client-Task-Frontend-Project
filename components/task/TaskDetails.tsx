"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  User,
  FileText,
  Edit,
  Clock,
  AlertCircle,
  CheckCircle,
  Download,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTaskById, getDocumentDownloadUrl } from "@/app/services/data.service";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { usePermissions } from "@/hooks/usePermissions";

interface TaskDetailsProps {
  taskId: number;
}

interface Document {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: string;
  taskId: number;
  createdAt: string;
  updatedAt: string;
  uploadedBy: string;
}

interface TaskDetailsResponse {
  id: number;
  subject: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  startDate: string;
  endDate: string | null;
  taskStageId: number;
  taskStageName: string;
  createdAt: string;
  updatedAt: string;
  progress?: number;
  assignee: {
    id: string;
    label: string;
    avatar?: string;
  };
  documents?: Document[];
}

interface DocumentUrlResponse {
  isSuccess: boolean;
  message: string;
  data: {
    docId: number;
    type: string;
    fileName: string;
    fileType: string;
    url: string;
  };
}

export function TaskDetails({ taskId }: TaskDetailsProps) {
  const [task, setTask] = useState<TaskDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const { permissions } = usePermissions("task");

  useEffect(() => {
    if (taskId) {
      fetchTaskDetails();
    }
  }, [taskId]);

  const fetchTaskDetails = async () => {
    setIsLoading(true);
    try {
      const response = await getTaskById(taskId);
      if (response.isSuccess) {
        setTask(response.data as TaskDetailsResponse);
      } else {
        console.error("Failed to fetch task details:", response.message);
      }
    } catch (error) {
      console.error("Error fetching task details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const priorityColors = {
    LOW: "bg-green-100 text-green-700",
    MEDIUM: "bg-blue-100 text-blue-700",
    HIGH: "bg-amber-100 text-amber-700",
    URGENT: "bg-red-100 text-red-700",
  } as const;

  const priorityIcons = {
    LOW: <CheckCircle className="h-4 w-4" />,
    MEDIUM: <Clock className="h-4 w-4" />,
    HIGH: <AlertCircle className="h-4 w-4" />,
    URGENT: <AlertCircle className="h-4 w-4" />,
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleDownload = async (doc: Document) => {
    try {
      const response: DocumentUrlResponse = await getDocumentDownloadUrl(
        doc.id.toString()
      );
      if (response.isSuccess && response.data.url) {
        const fileResponse = await fetch(response.data.url);
        if (!fileResponse.ok) throw new Error("Failed to fetch file");

        const blob = await fileResponse.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const downloadLink = document.createElement("a");
        downloadLink.href = blobUrl;
        downloadLink.download = doc.fileName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        window.URL.revokeObjectURL(blobUrl);
      } else {
        alert(`Failed to get download link: ${response.message}`);
      }
    } catch (error) {
      alert("Error downloading document. Please try again.");
    }
  };

  const isOverdue = task?.endDate && new Date(task.endDate) < new Date();

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-md mx-auto bg-white shadow-sm rounded-lg border p-6 text-center">
        <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600">Task not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Task Overview */}
      <div className="bg-white shadow-sm rounded-lg border p-4">
        <div className="flex justify-between items-start mb-3">
          <h1 className="text-base font-semibold text-gray-900">
            {task.subject}
          </h1>
          
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <Badge className={`${priorityColors[task.priority]} flex items-center gap-1`}>
            {priorityIcons[task.priority]} {task.priority}
          </Badge>
          <Badge variant="outline">{task.taskStageName}</Badge>
          {isOverdue && <Badge variant="destructive">Overdue</Badge>}
        </div>

        {task.progress !== undefined && (
  <div className="mb-3">
    <p className="text-xs text-gray-500 mb-1">Progress</p>
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full bg-blue-500 transition-all duration-300"
        style={{ width: `${task.progress}%` }}
      />
    </div>
    <p className="text-xs text-gray-500 mt-1">{task.progress}%</p>
  </div>
)}


        {task.description && (
          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
            {task.description}
          </p>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-white shadow-sm rounded-lg border p-4">
        <h3 className="font-medium text-gray-700 text-sm mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Timeline
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 border rounded-md">
            <Calendar className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-xs text-gray-500">Start Date</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date(task.startDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {task.endDate && (
            <div
              className={`flex items-center gap-3 p-3 border rounded-md ${
                isOverdue ? "border-red-200" : ""
              }`}
            >
              <Calendar
                className={`h-4 w-4 ${
                  isOverdue ? "text-red-500" : "text-gray-500"
                }`}
              />
              <div>
                <p className="text-xs text-gray-500">Due Date</p>
                <p
                  className={`text-sm font-medium ${
                    isOverdue ? "text-red-600" : "text-gray-900"
                  }`}
                >
                  {new Date(task.endDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                {isOverdue && (
                  <p className="text-xs text-red-500">Overdue</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assignee */}
      <div className="bg-white shadow-sm rounded-lg border p-4">
        <h3 className="font-medium text-gray-700 text-sm mb-3 flex items-center gap-2">
          <User className="h-4 w-4" /> Assigned To
        </h3>
        {task.assignee ? (
          <div className="flex items-center gap-3 p-3 border rounded-md">
            {task.assignee.avatar ? (
              <img
                src={task.assignee.avatar}
                alt={task.assignee.label}
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
            )}
            <span className="font-medium text-sm text-gray-900">
              {task.assignee.label}
            </span>
          </div>
        ) : (
          <p className="text-xs text-gray-500">No assignees</p>
        )}
      </div>

      {/* Attachments */}
      {task.documents && task.documents.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg border p-4">
          <h3 className="font-medium text-gray-700 text-sm mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Attachments
          </h3>
          <div className="space-y-2">
            {task.documents.map((document) => (
              <div
                key={document.id}
                className="flex items-center justify-between p-3 border rounded-md"
              >
                <div>
                  <p className="font-medium text-sm text-gray-900 truncate max-w-[150px]">
                    {document.fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {document.fileType} • {formatFileSize(document.fileSize)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(document)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meta Info */}
      <div className="bg-white shadow-sm rounded-lg border p-3 text-xs text-gray-500 flex justify-between">
        <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
        <span>Updated: {new Date(task.updatedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
