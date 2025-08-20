"use client";

import { useEffect, useState } from "react";
import { Calendar, User, Tag, FileText, Edit, X, Clock, AlertCircle, CheckCircle, Download, MoreVertical } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTaskById } from "@/app/services/data.service";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePermissions } from "@/hooks/usePermissions";

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
   const { permissions, loading: permissionsLoading } = usePermissions('task');
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

  const isOverdue = task?.endDate && new Date(task.endDate) < new Date();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-lg">
        {isLoading ? (
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-start">
              <Skeleton className="h-7 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-9 rounded-md" />
                <Skeleton className="h-9 w-9 rounded-md" />
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
        ) : task ? (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <DialogTitle className="text-xl font-semibold text-gray-900 mb-2">
                    {task.subject}
                  </DialogTitle>
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
                    onClick={onEdit} 
                    className="gap-1.5 h-9 px-3"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Share</DropdownMenuItem>
                      <DropdownMenuItem>Archive</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                  <Progress value={task.progress} className="h-2" />
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
                  {task.assignees && task.assignees.length > 0 ? (
                    <div className="space-y-2">
                      {task.assignees.map((assignee) => (
                        <div key={assignee.id} className="flex items-center gap-3 p-3 bg-white rounded-md border">
                          {assignee.avatar ? (
                            <img 
                              src={assignee.avatar} 
                              alt={assignee.label}
                              className="h-9 w-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-4.5 w-4.5 text-blue-600" />
                            </div>
                          )}
                          <span className="font-medium text-sm text-gray-900">{assignee.label}</span>
                        </div>
                      ))}
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
                      <div key={document.docId} className="flex items-center justify-between p-3 bg-white rounded-md border hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-md">
                            <FileText className="h-4 w-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-gray-900 truncate max-w-xs">{document.fileName}</p>
                            <div className="flex text-xs text-gray-500 mt-0.5 gap-2">
                              <span className="capitalize">{document.fileType}</span>
                              {document.fileSize && <span>{document.fileSize}</span>}
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
          </>
        ) : (
          <div className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1.5">Task not found</h3>
            <p className="text-gray-500 text-sm">The requested task could not be loaded.</p>
            <Button variant="outline" className="mt-4 h-9 text-sm" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};