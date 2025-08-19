"use client";

import { useEffect, useState } from "react";
import { Calendar, User, Tag, FileText, Edit, X, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTaskById } from "@/app/services/data.service";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number;
  onEdit: () => void;
}

interface TaskDetails {
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
  assignees: Array<{
    id: string;
    label: string;
    avatar?: string;
  }>;
  documents?: Array<{
    docId: number;
    fileName: string;
    fileType: string;
    uploadedAt: string;
    fileSize?: string;
  }>;
}

export const TaskDetailsModal = ({ isOpen, onClose, taskId, onEdit }: TaskDetailsModalProps) => {
  const [task, setTask] = useState<TaskDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskDetails();
    } else {
      setTask(null);
    }
  }, [isOpen, taskId]);

  const fetchTaskDetails = async () => {
    setIsLoading(true);
    try {
      const response = await getTaskById(taskId);
      if (response.isSuccess) {
        setTask(response.data);
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
    LOW: "bg-green-100 text-green-800 border-green-200",
    MEDIUM: "bg-blue-100 text-blue-800 border-blue-200",
    HIGH: "bg-amber-100 text-amber-800 border-amber-200",
    URGENT: "bg-red-100 text-red-800 border-red-200"
  } as const;

  const priorityIcons = {
    LOW: <CheckCircle className="h-3.5 w-3.5" />,
    MEDIUM: <Clock className="h-3.5 w-3.5" />,
    HIGH: <AlertCircle className="h-3.5 w-3.5" />,
    URGENT: <AlertCircle className="h-3.5 w-3.5" />
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isOverdue = task?.endDate && new Date(task.endDate) < new Date();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-lg text-sm">
        {isLoading ? (
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-7 w-14" />
                <Skeleton className="h-7 w-7" />
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ) : task ? (
          <>
            {/* Header with colored accent based on priority */}
            <div className={`px-4 py-3 ${
              task.priority === "URGENT" ? "bg-red-50" : 
              task.priority === "HIGH" ? "bg-amber-50" : 
              task.priority === "MEDIUM" ? "bg-blue-50" : "bg-green-50"
            }`}>
              <DialogHeader className="flex flex-row justify-between items-start">
                <div className="flex-1">
                  <DialogTitle className="text-lg font-semibold text-gray-900 flex items-center gap-1.5">
                    {task.subject}
                    {isOverdue && (
                      <Badge variant="destructive" className="animate-pulse text-xs py-0">
                        Overdue
                      </Badge>
                    )}
                  </DialogTitle>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <Badge className={`${priorityColors[task.priority]} border flex items-center gap-1 text-xs py-0`}>
                      {priorityIcons[task.priority]}
                      {task.priority}
                    </Badge>
                    <Badge variant="outline" className="bg-white text-xs py-0">
                      {task.taskStageName}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" onClick={onEdit} className="gap-1 h-7 mr-10  px-2 text-xs">
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>
              </DialogHeader>
            </div>

            <div className="p-4 space-y-4">
              {/* Progress bar (if available) */}
              {task.progress !== undefined && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">Progress</span>
                    <span className="text-gray-500">{task.progress}%</span>
                  </div>
                  <Progress value={task.progress} className="h-1.5" />
                </div>
              )}

              {/* Description */}
              {task.description && (
                <div className="bg-gray-50 rounded-md p-3">
                  <h3 className="font-medium text-gray-700 mb-2 flex items-center gap-1.5 text-sm">
                    <FileText className="h-3.5 w-3.5" />
                    Description
                  </h3>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{task.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dates */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-700 text-sm">Timeline</h3>
                  
                  <div className="flex items-center gap-2 p-2 bg-white rounded-md border">
                    <div className={`p-1.5 rounded-full ${
                      task.priority === "URGENT" ? "bg-red-100 text-red-600" : 
                      task.priority === "HIGH" ? "bg-amber-100 text-amber-600" : 
                      task.priority === "MEDIUM" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
                    }`}>
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Start Date</p>
                      <p className="text-xs font-medium text-gray-900">
                        {new Date(task.startDate).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  {task.endDate && (
                    <div className={`flex items-center gap-2 p-2 bg-white rounded-md border ${isOverdue ? 'border-red-200' : ''}`}>
                      <div className={`p-1.5 rounded-full ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Due Date</p>
                        <p className={`text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                          {new Date(task.endDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                          {isOverdue && (
                            <span className="ml-1 text-xs font-normal">(Overdue)</span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Assignees */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-700 text-sm">Assigned To</h3>
                  {task.assignees && task.assignees.length > 0 ? (
                    <div className="space-y-1.5">
                      {task.assignees.map((assignee) => (
                        <div key={assignee.id} className="flex items-center gap-2 p-2 bg-white rounded-md border">
                          {assignee.avatar ? (
                            <img 
                              src={assignee.avatar} 
                              alt={assignee.label}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                          )}
                          <span className="font-medium text-sm">{assignee.label}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-3 text-gray-500 text-xs border rounded-md bg-gray-50">
                      <User className="h-6 w-6 mx-auto mb-1 opacity-50" />
                      <p>No assignees</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents */}
              {task.documents && task.documents.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-700 text-sm">Documents</h3>
                  <div className="space-y-1.5">
                    {task.documents.map((document) => (
                      <div key={document.docId} className="flex items-center gap-2 p-2 bg-white rounded-md border hover:bg-gray-50 transition-colors">
                        <div className="p-1.5 bg-gray-100 rounded-md">
                          <FileText className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{document.fileName}</p>
                          <div className="flex text-xs text-gray-500 mt-0.5">
                            <span className="mr-2 capitalize">{document.fileType}</span>
                            {document.fileSize && <span className="mr-2">{document.fileSize}</span>}
                            <span>Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs">
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-4 text-center">
            <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1.5">Task not found</h3>
            <p className="text-gray-500 text-xs">The requested task could not be loaded.</p>
            <Button variant="outline" className="mt-3 h-7 text-xs" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};