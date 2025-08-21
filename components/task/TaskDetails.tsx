"use client";

import { useEffect, useState } from "react";
import { Calendar, User, Tag, FileText, Edit, X, Clock, AlertCircle, CheckCircle, Download, MoreVertical } from "lucide-react";
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
  const { permissions, loading: permissionsLoading } = usePermissions('task');

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
        console.log('Full task response:', response.data);
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
    URGENT: "bg-red-100 text-red-700"
  } as const;

  const priorityIcons = {
    LOW: <CheckCircle className="h-4 w-4" />,
    MEDIUM: <Clock className="h-4 w-4" />,
    HIGH: <AlertCircle className="h-4 w-4" />,
    URGENT: <AlertCircle className="h-4 w-4" />
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = async (doc: Document) => {
    console.log('Download clicked for:', doc.fileName);
    console.log('Using document ID:', doc.id);
    
    if (!doc.id) {
      console.error('Document ID is missing:', doc);
      alert('Cannot download: Document ID is missing');
      return;
    }
    
    try {
      const response: DocumentUrlResponse = await getDocumentDownloadUrl(doc.id.toString());
      
      console.log('API response:', response);
      
      if (response.isSuccess && response.data.url) {
        console.log('Downloading file from S3 URL:', response.data.url);
        
        try {
          const downloadButton = document.activeElement as HTMLElement;
          if (downloadButton) {
            downloadButton.style.opacity = '0.5';
            downloadButton.style.pointerEvents = 'none';
          }
          
          const fileResponse = await fetch(response.data.url, {
            method: 'GET',
            headers: {
              'Accept': '*/*',
            },
          });
          
          if (!fileResponse.ok) {
            throw new Error(`Failed to fetch file: ${fileResponse.status} ${fileResponse.statusText}`);
          }
          
          const blob = await fileResponse.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          
          const downloadLink = document.createElement('a');
          downloadLink.href = blobUrl;
          downloadLink.download = doc.fileName;
          downloadLink.style.display = 'none';
          
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          
          window.URL.revokeObjectURL(blobUrl);
          
          console.log('File downloaded successfully:', doc.fileName);
          
          if (downloadButton) {
            downloadButton.style.opacity = '1';
            downloadButton.style.pointerEvents = 'auto';
          }
          
        } catch (fetchError) {
          console.error('Download failed:', fetchError);
          alert(`Failed to download ${doc.fileName}. Please try again.`);
          
          const downloadButton = document.activeElement as HTMLElement;
          if (downloadButton) {
            downloadButton.style.opacity = '1';
            downloadButton.style.pointerEvents = 'auto';
          }
        }
        
      } else {
        console.error("Failed to get download URL:", response.message);
        alert(`Failed to get download link: ${response.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error downloading document:", error);
      alert('Error downloading document. Please try again.');
    }
  };

  const isOverdue = task?.endDate && new Date(task.endDate) < new Date();

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-lg border overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-start">
            <Skeleton className="h-7 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-16 rounded-md" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20 rounded-md" />
            <Skeleton className="h-20 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-lg border overflow-hidden">
        <div className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 mb-1.5">Task not found</h3>
          <p className="text-gray-500 text-sm">The requested task could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-lg border overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              {task.subject}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge 
                className={`${priorityColors[task.priority]} flex items-center gap-1 py-1 px-2.5 rounded-md`}
              >
                {priorityIcons[task.priority]}
                {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
              </Badge>
              <Badge variant="outline" className="bg-gray-100 text-gray-700 py-1 px-2.5 rounded-md">
                {task.taskStageName}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive" className="py-1 px-2.5 rounded-md">
                  Overdue
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            {permissions.canEdit && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditing(!isEditing)} 
                className="gap-1.5 h-9 px-3"
              >
                <Edit className="h-4 w-4" />
                {isEditing ? "Cancel" : "Edit"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Progress bar */}
        {task.progress !== undefined && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">Progress</span>
              <span className="text-gray-500">{task.progress}% complete</span>
            </div>
            <Progress value={task.progress} className="w-full" />
          </div>
        )}

        {/* Description */}
        {task.description && (
          <div className="space-y-2">
            <h3 className="font-medium text-gray-700 text-sm flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              Description
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-3 rounded-md">
              {task.description}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Timeline */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-700 text-sm">Timeline</h3>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-white rounded-md border">
                <div className={`p-2 rounded-full ${task.priority === "URGENT" ? "bg-red-100 text-red-600" : 
                  task.priority === "HIGH" ? "bg-amber-100 text-amber-600" : 
                  task.priority === "MEDIUM" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"}`}
                >
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Start Date</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(task.startDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              
              {task.endDate && (
                <div className={`flex items-center gap-3 p-3 bg-white rounded-md border ${isOverdue ? 'border-red-200' : ''}`}>
                  <div className={`p-2 rounded-full ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Due Date</p>
                    <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                      {new Date(task.endDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                    {isOverdue && (
                      <p className="text-xs text-red-500 mt-0.5">This task is overdue</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Assignees */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-700 text-sm">Assigned To</h3>
            {task.assignee ? (
              <div className="flex items-center gap-3 p-3 bg-white rounded-md border">
                {task.assignee.avatar ? (
                  <img
                    src={task.assignee.avatar}
                    alt={task.assignee.label}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-4.5 w-4.5 text-blue-600" />
                  </div>
                )}
                <span className="font-medium text-sm text-gray-900">
                  {task.assignee.label}
                </span>
              </div>
            ) : (
              <div className="text-center py-5 text-gray-500 text-sm border rounded-md bg-gray-50">
                <User className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p>No assignees</p>
              </div>
            )}
          </div>
        </div>

        {/* Documents */}
        {task.documents && task.documents.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-700 text-sm">Attachments</h3>
            <div className="space-y-2">
              {task.documents.map((document) => (
                <div 
                  key={document.id} 
                  className="flex items-center justify-between p-3 bg-white rounded-md border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-md">
                      <FileText className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900 truncate max-w-xs">{document.fileName}</p>
                      <div className="flex text-xs text-gray-500 mt-0.5 gap-2">
                        <span className="capitalize">{document.fileType}</span>
                        {document.fileSize && <span>{formatFileSize(document.fileSize)}</span>}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDownload(document);
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meta information */}
        <div className="pt-4 border-t text-xs text-gray-500 flex justify-between">
          <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
          <span>Last updated: {new Date(task.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}