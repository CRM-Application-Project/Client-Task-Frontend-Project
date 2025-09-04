"use client";
import {
  Calendar,
  User,
  Tag,
  Trash2,
  Upload,
  Download,
  FileText,
  X,
  Edit,
  GripVertical,
  Play,
  Square,
} from "lucide-react";
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
  deleteDocument,
} from "@/app/services/data.service";
import { usePermissions } from "@/hooks/usePermissions";
import {
  TaskStatus,
  TaskPriority,
  TaskActionType,
  Task,
  TaskDocument,
} from "@/lib/task";

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: number) => void;
  onDocumentUpdate?: (taskId: number, documents: TaskDocument[]) => void;
  onTaskClick?: (taskId: number) => void;
  onDragStart?: () => void;
  draggable?: boolean;
  isDragging?: boolean;
  onActionClick?: (taskId: number, actionType: TaskActionType) => void;
}

export const TaskCard = ({
  task,
  onEdit,
  onDelete,
  onDocumentUpdate,
  onTaskClick,
  onDragStart,
  draggable = true,
  isDragging = false,
  onActionClick,
}: TaskCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [documents, setDocuments] = useState<TaskDocument[]>(
    task.documents || []
  );
  const [downloadingDocId, setDownloadingDocId] = useState<number | null>(null);

  const { permissions, loading: permissionsLoading } = usePermissions("task");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const priorityColors: Record<TaskPriority, string> = {
    LOW: "bg-muted text-muted-foreground",
    MEDIUM: "bg-status-todo/20 text-status-todo",
    HIGH: "bg-status-progress/20 text-status-progress",
    URGENT: "bg-destructive/20 text-destructive",
  } as const;

  // Helper function to strip HTML tags and get plain text
  const stripHtml = (html: string): string => {
    if (typeof window === "undefined") return html;

    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  // Helper function to truncate text
  const truncateText = (text: string, maxLength: number): string => {
    const plainText = stripHtml(text);
    if (plainText.length <= maxLength) return plainText;
    return plainText.substring(0, maxLength).trim() + "...";
  };

  // Helper function to safely render HTML description with truncation
  const renderDescription = () => {
    if (!task.description) return null;

    const plainText = stripHtml(task.description);
    const shouldTruncate = plainText.length > 80;

    return (
      <div className="min-w-0">
        <div
          className="text-sm text-muted-foreground leading-relaxed break-words"
          title={shouldTruncate ? plainText : undefined}
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            wordBreak: "break-word",
            lineHeight: "1.4",
            maxHeight: "2.8em", // 2 lines * 1.4 line-height
          }}
          dangerouslySetInnerHTML={{
            __html: shouldTruncate
              ? truncateText(task.description, 80)
              : task.description,
          }}
        />
      </div>
    );
  };

  // Handle action button click
  const handleActionClick = (
    e: React.MouseEvent,
    actionType: TaskActionType
  ) => {
    e.stopPropagation();
    if (onActionClick) {
      onActionClick(task.id, actionType);
    }
  };

  // Improved drag event handlers
  const handleDragStart = (e: React.DragEvent) => {
    if (!draggable || !task.isEditable) {
      e.preventDefault();
      return;
    }

    onDragStart?.();

    const dragData = {
      taskId: task.id,
      sourceStageId: task.taskStageId,
      task: task,
    };

    e.dataTransfer.setData("application/json", JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setDragImage(e.currentTarget as HTMLElement, 10, 10);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Clean up any drag state if needed
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (permissions.canDelete) {
      setShowDeleteDialog(true);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (permissions.canEdit && onEdit && task.isEditable) {
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
    if (isDragging) return;

    if (permissions.canView) {
      if (onTaskClick) {
        onTaskClick(task.id);
      }
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress("Getting upload URL...");

    try {
      const uploadUrlResponse = await getDocumentUploadUrl(task.id.toString(), {
        fileName: file.name,
        fileType: file.type,
      });

      if (!uploadUrlResponse.isSuccess) {
        throw new Error(uploadUrlResponse.message);
      }

      const { docId, url: uploadUrl } = uploadUrlResponse.data;
      setUploadProgress("Uploading file...");

      try {
        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
          mode: "cors",
        });

        if (!uploadResponse.ok) {
          throw new Error(
            `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`
          );
        }

        setUploadProgress("Verifying upload...");

        const verifyResponse = await verifyDocumentUpload(docId.toString());

        if (!verifyResponse.isSuccess) {
          throw new Error(verifyResponse.message);
        }

        const newDocument: TaskDocument = {
          docId,
          fileName: file.name,
          fileType: file.type,
          uploadedAt: new Date(),
        };

        const updatedDocuments = [...documents, newDocument];
        setDocuments(updatedDocuments);
        onDocumentUpdate?.(task.id, updatedDocuments);

        setUploadProgress("Upload completed!");
        setTimeout(() => setUploadProgress(""), 2000);
      } catch (uploadError) {
        if (
          uploadError instanceof TypeError &&
          uploadError.message.includes("CORS")
        ) {
          throw new Error(
            "CORS error: S3 bucket needs proper CORS configuration for browser uploads"
          );
        }
        throw uploadError;
      }
    } catch (error) {
      console.error("Upload failed:", error);
      let errorMessage = "Unknown error";

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setUploadProgress(`Upload failed: ${errorMessage}`);
      setTimeout(() => setUploadProgress(""), 5000);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDownloadDocument = async (document: TaskDocument) => {
    console.log("Download clicked for:", document.fileName);
    setDownloadingDocId(document.docId);

    try {
      const downloadResponse = await getDocumentDownloadUrl(
        document.docId.toString()
      );

      if (!downloadResponse.isSuccess) {
        throw new Error(downloadResponse.message);
      }

      console.log("Downloading file from S3 URL:", downloadResponse.data.url);

      try {
        const fileResponse = await fetch(downloadResponse.data.url, {
          method: "GET",
          headers: {
            Accept: "*/*",
          },
        });

        if (!fileResponse.ok) {
          throw new Error(
            `Failed to fetch file: ${fileResponse.status} ${fileResponse.statusText}`
          );
        }

        const blob = await fileResponse.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const downloadLink = window.document.createElement("a");
        downloadLink.href = blobUrl;
        downloadLink.download = document.fileName;
        downloadLink.style.display = "none";

        window.document.body.appendChild(downloadLink);
        downloadLink.click();
        window.document.body.removeChild(downloadLink);

        window.URL.revokeObjectURL(blobUrl);

        console.log("File downloaded successfully:", document.fileName);
      } catch (fetchError) {
        console.error("Download failed:", fetchError);
        throw new Error(
          `Failed to download ${document.fileName}. Please try again.`
        );
      }
    } catch (error) {
      console.error("Download failed:", error);
      alert(
        `Download failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
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

      const updatedDocuments = documents.filter(
        (doc) => doc.docId !== document.docId
      );
      setDocuments(updatedDocuments);
      onDocumentUpdate?.(task.id, updatedDocuments);
    } catch (error) {
      console.error("Delete failed:", error);
      alert(
        `Delete failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  if (permissionsLoading || !permissions.canView) {
    return null;
  }

  const showEditButton = permissions.canEdit && onEdit;
  const showDeleteButton = permissions.canDelete && onDelete;
  const showDocumentButton = permissions.canEdit;
  const showActionsBar =
    showEditButton || showDeleteButton || showDocumentButton;
  const showActionButton = task.actionType !== "NONE" && onActionClick;

  return (
    <>
      <Card
        className={`p-4 transition-all duration-200 hover:shadow-md bg-gradient-to-br from-card to-card/80 border border-border/50 relative group min-h-[180px] ${
          permissions.canView ? "cursor-pointer" : "cursor-default"
        } ${draggable ? "cursor-grab active:cursor-grabbing" : ""} ${
          isDragging ? "opacity-50 scale-95" : "hover:scale-[1.02]"
        }`}
        onClick={handleCardClick}
        draggable={draggable}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-3">
          {/* Title and Priority Row */}
          <div className="flex items-start text-[14px] justify-between gap-3">
            {/* Subject with truncation and tooltip */}
            <div className="flex-1 min-w-0">
              <h3
                className="font-medium text-foreground leading-tight break-words"
                title={task.subject.length > 45 ? task.subject : undefined}
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  wordBreak: "break-word",
                  lineHeight: "1.3",
                }}
              >
                {task.subject}
              </h3>
            </div>

            {/* Priority Badge - No longer moves */}
            <Badge
              variant="outline"
              className={`${
                priorityColors[task.priority]
              } whitespace-nowrap flex-shrink-0`}
            >
              {task.priority}
            </Badge>
          </div>

          {/* Description with HTML content */}
          {task.description && renderDescription()}

          {/* Hours details */}
          {(task.estimatedHours !== null ||
            task.graceHours > 0 ||
            task.actualHours !== null) && (
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {task.estimatedHours !== null && (
                <span>Estimated: {task.estimatedHours}h</span>
              )}
              {task.actualHours !== null && (
                <span>Actual: {task.actualHours.toFixed(1)}h</span>
              )}
              {task.graceHours > 0 && <span>Grace: {task.graceHours}h</span>}
              {task.actualHours !== null &&
                task.estimatedHours !== null &&
                task.actualHours > task.estimatedHours && (
                  <span className="text-amber-600">
                    Escalated:{" "}
                    {(task.actualHours - task.estimatedHours).toFixed(1)}h
                  </span>
                )}
            </div>
          )}

          {/* Labels */}
          {task.labels.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap min-w-0">
              <Tag className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <div className="flex flex-wrap gap-1 min-w-0">
                {task.labels.map((label: string) => (
                  <Badge
                    key={label}
                    variant="secondary"
                    className="text-xs max-w-full"
                    title={label.length > 15 ? label : undefined}
                  >
                    <span className="truncate max-w-[80px]">{label}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Document count */}
          {documents.length > 0 && (
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground">
                {documents.length} document{documents.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Footer with assignee, dates, and action buttons */}
          <div className="flex flex-col gap-2 text-xs text-muted-foreground min-w-0">
            {/* Dates row */}
            <div className="flex items-center justify-between gap-2 min-w-0">
              {/* Start Date */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Calendar className="h-3 w-3" />
                <span className="whitespace-nowrap">
                  {new Date(task.startDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>

              {/* End Date if exists */}
              {task.endDate && (
                <div className="flex items-center gap-1 flex-shrink-0 mr-[55px]">
                  <span className="whitespace-nowrap">→</span>
                  <Calendar className="h-3 w-3" />
                  <span className="whitespace-nowrap">
                    {new Date(task.endDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Assignee and action buttons row */}
            <div className="flex items-center justify-between gap-2 min-w-0">
              {/* Assignee */}
              {task.assignedTo && (
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <User className="h-3 w-3 flex-shrink-0" />
                  <span
                    className="truncate max-w-[120px]"
                    title={
                      task.assignedTo.length > 15 ? task.assignedTo : undefined
                    }
                  >
                    {task.assignedTo}
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-1 flex-shrink-0">
                {/* Action button (Start/Stop) */}
                {showActionButton && (
                  <button
                    onClick={(e) => handleActionClick(e, task.actionType)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                      task.actionType === "START"
                        ? "bg-green-100 hover:bg-green-200 text-green-600"
                        : "bg-red-100 hover:bg-red-200 text-red-600"
                    }`}
                    aria-label={
                      task.actionType === "START" ? "Start task" : "Stop task"
                    }
                    title={
                      task.actionType === "START" ? "Start task" : "Stop task"
                    }
                  >
                    {task.actionType === "START" ? (
                      <Play className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                )}

                {showEditButton && task.isEditable && (
                  <button
                    onClick={handleEditClick}
                    className="w-8 h-8 rounded-full bg-muted/80 hover:bg-primary/20 
               text-muted-foreground hover:text-primary 
               transition-all duration-200 flex items-center justify-center"
                    aria-label="Edit task"
                    title="Edit task"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                )}

                {showDocumentButton && (
                  <button
                    onClick={handleDocumentClick}
                    className="w-8 h-8 rounded-full bg-muted/80 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all duration-200 flex items-center justify-center"
                    aria-label="Manage documents"
                    title="Manage documents"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                )}

                {showDeleteButton && (
                  <button
                    onClick={handleDeleteClick}
                    className="w-8 h-8 rounded-full bg-muted/80 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all duration-200 flex items-center justify-center"
                    aria-label="Delete task"
                    title="Delete task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Document management dialog with fixed overflow */}
      <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
        <DialogContent className="max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col bg-white">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="break-words">Task Documents</DialogTitle>
            <DialogDescription className="break-words">
              {`Manage documents for ${task.subject}`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col space-y-4 min-h-0">
            {permissions.canEdit && (
              <div className="flex-shrink-0 space-y-2">
                <div className="flex gap-2">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="flex-1 min-w-0"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-shrink-0"
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                {uploadProgress && (
                  <p className="text-sm text-muted-foreground break-words overflow-hidden">
                    {uploadProgress}
                  </p>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="space-y-2 pr-2">
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No documents uploaded yet
                  </p>
                ) : (
                  documents.map((document) => (
                    <div
                      key={document.docId}
                      className="flex items-center justify-between p-3 border rounded-md gap-3 min-w-0"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p
                            className="text-sm font-medium break-all leading-tight mb-1"
                            title={document.fileName}
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              wordBreak: "break-all",
                              lineHeight: "1.2",
                            }}
                          >
                            {document.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {document.fileType}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
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
          </div>

          <DialogFooter className="flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setShowDocumentDialog(false)}
            >
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
              {`This action cannot be undone. This will permanently delete the task ${task.subject}.`}
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
