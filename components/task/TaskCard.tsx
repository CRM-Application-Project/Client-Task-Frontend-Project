"use client";
import { Calendar, User, Tag, Trash2, Upload, Download, FileText, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useRef } from "react";
import { 
  getDocumentUploadUrl, 
  verifyDocumentUpload, 
  getDocumentDownloadUrl, 
  deleteDocument 
} from "@/app/services/data.service"; // Adjust path as needed

// Define the Task type to match the one from Task.tsx
type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface TaskDocument {
  docId: number;
  fileName: string;
  fileType: string;
  uploadedAt?: Date;
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
  assignees: Array<{
    id: string;
    label: string;
  }>;
  documents?: TaskDocument[]; // Add documents array
}

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: number) => void;
  onDocumentUpdate?: (taskId: number, documents: TaskDocument[]) => void;
}

export const TaskCard = ({ task, onEdit, onDelete, onDocumentUpdate }: TaskCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [documents, setDocuments] = useState<TaskDocument[]>(task.documents || []);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const priorityColors: Record<TaskPriority, string> = {
    LOW: "bg-muted text-muted-foreground",
    MEDIUM: "bg-status-todo/20 text-status-todo",
    HIGH: "bg-status-progress/20 text-status-progress",
    URGENT: "bg-destructive/20 text-destructive"
  } as const;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const handleDocumentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDocumentDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(task.id);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

 const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  setIsUploading(true);
  setUploadProgress("Getting upload URL...");

  try {
    // Step 1: Get upload URL
    const uploadUrlResponse = await getDocumentUploadUrl(task.id.toString(), {
      fileName: file.name,
      fileType: file.type
    });

    if (!uploadUrlResponse.isSuccess) {
      throw new Error(uploadUrlResponse.message);
    }

    const { docId, url: uploadUrl } = uploadUrlResponse.data;
    setUploadProgress("Uploading file...");

    // Step 2: Upload file to S3 with CORS handling
    try {
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
        mode: 'cors', // Explicitly set CORS mode
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      setUploadProgress("Verifying upload...");

      // Step 3: Verify upload
      const verifyResponse = await verifyDocumentUpload(docId.toString());
      
      if (!verifyResponse.isSuccess) {
        throw new Error(verifyResponse.message);
      }

      // Step 4: Update local documents list
      const newDocument: TaskDocument = {
        docId,
        fileName: file.name,
        fileType: file.type,
        uploadedAt: new Date()
      };

      const updatedDocuments = [...documents, newDocument];
      setDocuments(updatedDocuments);
      onDocumentUpdate?.(task.id, updatedDocuments);

      setUploadProgress("Upload completed!");
      setTimeout(() => setUploadProgress(""), 2000);

    } catch (uploadError) {
      // Handle CORS or network errors specifically
      if (uploadError instanceof TypeError && uploadError.message.includes('CORS')) {
        throw new Error('CORS error: S3 bucket needs proper CORS configuration for browser uploads');
      }
      throw uploadError;
    }

  } catch (error) {
    console.error('Upload failed:', error);
    let errorMessage = 'Unknown error';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    setUploadProgress(`Upload failed: ${errorMessage}`);
    setTimeout(() => setUploadProgress(""), 5000);
  } finally {
    setIsUploading(false);
    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }
};

  const handleDownloadDocument = async (document: TaskDocument) => {
    try {
      const downloadResponse = await getDocumentDownloadUrl(document.docId.toString());
      
      if (!downloadResponse.isSuccess) {
        throw new Error(downloadResponse.message);
      }

      // Open download URL in new tab
      window.open(downloadResponse.data.url, '_blank');
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteDocument = async (document: TaskDocument) => {
    if (!confirm(`Are you sure you want to delete "${document.fileName}"?`)) {
      return;
    }

    try {
      const deleteResponse = await deleteDocument(document.docId.toString());
      
      if (!deleteResponse.isSuccess) {
        throw new Error(deleteResponse.message);
      }

      // Remove from local documents list
      const updatedDocuments = documents.filter(doc => doc.docId !== document.docId);
      setDocuments(updatedDocuments);
      onDocumentUpdate?.(task.id, updatedDocuments);

    } catch (error) {
      console.error('Delete failed:', error);
      alert(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <>
      <Card 
        className="p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] bg-gradient-to-br from-card to-card/80 border border-border/50 relative group"
        onClick={() => onEdit?.(task)}
      >
        {/* Action buttons - only shows on hover */}
        <div className="absolute top-3 right-2 flex gap-1 opacity-0 group-hover:opacity-100 z-10">
          <button 
            onClick={handleDocumentClick}
            className="p-1 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            aria-label="Manage documents"
          >
            <FileText className="h-4 w-4" />
          </button>
          <button 
            onClick={handleDeleteClick}
            className="p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-foreground line-clamp-2 flex-1">
              {task.subject}
            </h3>
            <Badge 
              variant="outline" 
              className={`${priorityColors[task.priority]} whitespace-nowrap transition-transform duration-200 group-hover:-translate-x-12`}
            >
              {task.priority}
            </Badge>
          </div>

          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}

          {task.labels.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <Tag className="h-3 w-3 text-muted-foreground" />
              {task.labels.map((label: string) => (
                <Badge key={label} variant="secondary" className="text-xs">
                  {label}
                </Badge>
              ))}
            </div>
          )}

          {/* Document count indicator */}
          {documents.length > 0 && (
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {documents.length} document{documents.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {task.assignedTo && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{task.assignedTo}</span>
              </div>
            )}

            {task.endDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{new Date(task.endDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Document management dialog */}
      <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Task Documents</DialogTitle>
            <DialogDescription>
             {` Manage documents for "{task.subject}"`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Upload section */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              {uploadProgress && (
                <p className="text-sm text-muted-foreground">{uploadProgress}</p>
              )}
            </div>

            {/* Documents list */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No documents uploaded yet
                </p>
              ) : (
                documents.map((document) => (
                  <div
                    key={document.docId}
                    className="flex items-center justify-between p-2 border rounded-md"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {document.fileName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {document.fileType}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadDocument(document)}
                        className="h-8 w-8 p-0"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDocument(document)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDocumentDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {`This action cannot be undone. This will permanently delete the task "${task.subject}".`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};