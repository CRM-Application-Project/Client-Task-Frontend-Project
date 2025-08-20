"use client";
import { Calendar, User, Tag, Trash2, Upload, Download, FileText, X, Edit } from "lucide-react";
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
import { TaskDetailsModal } from "./TaskDetailsModal";
import { usePermissions } from "@/hooks/usePermissions";

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
  onTaskClick?: () => void; // Add this
}

export const TaskCard = ({ task, onEdit, onDelete, onDocumentUpdate }: TaskCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [documents, setDocuments] = useState<TaskDocument[]>(task.documents || []);
  const [showDetailsModal, setShowDetailsModal] = useState(false); // Add this state
  const [downloadingDocId, setDownloadingDocId] = useState<number | null>(null);
  
  const { permissions, loading: permissionsLoading } = usePermissions('task');
  const fileInputRef = useRef<HTMLInputElement>(null);

  
  // Count the number of action icons that will appear on hover
 
  const priorityColors: Record<TaskPriority, string> = {
    LOW: "bg-muted text-muted-foreground",
    MEDIUM: "bg-status-todo/20 text-status-todo",
    HIGH: "bg-status-progress/20 text-status-progress",
    URGENT: "bg-destructive/20 text-destructive"
  } as const;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (permissions.canDelete) {
      setShowDeleteDialog(true);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (permissions.canEdit && onEdit) {
      onEdit(task);
    }
  };

  const handleDocumentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDocumentDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!onDelete || !permissions.canDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(task.id);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleCardClick = () => {
    if (permissions.canView) {
      setShowDetailsModal(true);
    }
  };

  const handleEditFromDetails = () => {
    setShowDetailsModal(false);
    if (permissions.canEdit && onEdit) {
      onEdit(task);
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
    console.log('Download clicked for:', document.fileName);
    setDownloadingDocId(document.docId);
    
    try {
      const downloadResponse = await getDocumentDownloadUrl(document.docId.toString());
      
      if (!downloadResponse.isSuccess) {
        throw new Error(downloadResponse.message);
      }

      console.log('Downloading file from S3 URL:', downloadResponse.data.url);
      
      try {
        // Fetch the file from S3 as a blob
        const fileResponse = await fetch(downloadResponse.data.url, {
          method: 'GET',
          headers: {
            'Accept': '*/*',
          },
        });
        
        if (!fileResponse.ok) {
          throw new Error(`Failed to fetch file: ${fileResponse.status} ${fileResponse.statusText}`);
        }
        
        // Convert response to blob
        const blob = await fileResponse.blob();
        
        // Create a local URL for the blob
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Create and trigger download
        const downloadLink = window.document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.download = document.fileName;
        downloadLink.style.display = 'none';
        
        // Add to DOM, click, and remove
        window.document.body.appendChild(downloadLink);
        downloadLink.click();
        window.document.body.removeChild(downloadLink);
        
        // Clean up the blob URL
        window.URL.revokeObjectURL(blobUrl);
        
        console.log('File downloaded successfully:', document.fileName);
        
      } catch (fetchError) {
        console.error('Download failed:', fetchError);
        throw new Error(`Failed to download ${document.fileName}. Please try again.`);
      }

    } catch (error) {
      console.error('Download failed:', error);
      alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleDeleteDocument = async (document: TaskDocument) => {
    if (!permissions.canEdit) {
      alert("You don't have permission to delete documents.");
      return;
    }

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

  // Don't render if user can't view tasks
  if (permissionsLoading || !permissions.canView) {
    return null;
  }

  // Calculate which action buttons to show
  const showEditButton = permissions.canEdit && onEdit;
  const showDeleteButton = permissions.canDelete && onDelete;
  const showDocumentButton = permissions.canEdit; // Anyone who can view can see documents
  const showActionsBar = showEditButton || showDeleteButton || showDocumentButton;
 const actionIconCount = [
    showEditButton, 
    showDocumentButton, 
    showDeleteButton
  ].filter(Boolean).length;
  
  // Calculate the translate distance based on number of icons
  // Each icon is approximately 32px (24px icon + 8px padding)
  // We add a little extra for spacing between icons
  const translateDistance = actionIconCount > 0 
    ? `${(actionIconCount * 20) + ((actionIconCount - 1) * 6)}px` 
    : "0px";
  return (
    <>
     <Card 
        className={`p-4 transition-all duration-200 hover:shadow-md hover:scale-[1.02] bg-gradient-to-br from-card to-card/80 border border-border/50 relative group ${
          permissions.canView ? 'cursor-pointer' : 'cursor-default'
        }`}
        onClick={handleCardClick} 
      >
        {/* Action buttons - only shows on hover and if user has permissions */}
     {showActionsBar && (
          <div className="absolute top-3 right-2 flex gap-1 opacity-0 group-hover:opacity-100 z-10">
            {showEditButton && (
              <button 
                onClick={handleEditClick}
                className="p-1 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                aria-label="Edit task"
                title="Edit task"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            
            {showDocumentButton && (
              <button 
                onClick={handleDocumentClick}
                className="p-1 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                aria-label="Manage documents"
                title="Manage documents"
              >
                <FileText className="h-4 w-4" />
              </button>
            )}
            
            {showDeleteButton && (
              <button 
                onClick={handleDeleteClick}
                className="p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Delete task"
                title="Delete task"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-foreground line-clamp-2 flex-1">
              {task.subject}
            </h3>
            <Badge 
              variant="outline" 
              className={`${priorityColors[task.priority]} whitespace-nowrap transition-transform duration-200 ${
                showActionsBar ? 'group-hover:-translate-x-[var(--translate-distance)]' : ''
              }`}
              style={{ '--translate-distance': translateDistance } as React.CSSProperties}
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
              {`Manage documents for "${task.subject}"`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Upload section - only show if user can edit */}
            {permissions.canEdit && (
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
            )}

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
                        disabled={downloadingDocId === document.docId}
                        className="h-8 w-8 p-0"
                        title="Download document"
                      >
                        {downloadingDocId === document.docId ? (
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                      </Button>
                      {permissions.canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDocument(document)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          title="Delete document"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
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

      {/* Task Details Modal */}
      {showDetailsModal && permissions.canView && (
        <TaskDetailsModal
  isOpen={showDetailsModal}
  onClose={() => setShowDetailsModal(false)}
  taskId={task.id}
  onEdit={permissions.canEdit ? handleEditFromDetails : () => {}}
/>
      )}

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
              disabled={isDeleting || !permissions.canDelete}
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