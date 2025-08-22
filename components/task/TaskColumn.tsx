"use client";
import { TaskStatus } from "@/lib/task";
import { TaskCard } from "./TaskCard";
import { Badge } from "@/components/ui/badge";
import { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  updateTask,
  reorderTaskStages,
  updateTaskStage,
  deleteTaskStage,
} from "@/app/services/data.service";
import { usePermissions } from "@/hooks/usePermissions";
import { createPortal } from "react-dom";

// Define the Task type to match the one from Task.tsx
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

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
  assignee: {
    id: string;
    label: string;
  };
}

interface TaskStage {
  id: number;
  name: string;
  description?: string;
  orderNumber?: number;
}

interface TaskColumnProps {
  stage: TaskStage;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: number) => void;
  onTaskClick: (taskId: number) => void;
  onAddTaskForStage: (stageId: number) => void;
  stageIndex: number;
  onTaskUpdate: () => void;
  onStageUpdate: () => void;
  onEditStage?: (stage: TaskStage) => void;
  onDeleteStage?: (stage: TaskStage) => void;
  allStages: TaskStage[];
  onStageReorder: (reorderedStages: TaskStage[]) => void;
}

// Enhanced EditStageModal component with orderNumber field and gray styling
interface EditStageModalProps {
  stage: TaskStage;
  isOpen: boolean;
  onClose: () => void;
  onSave: (stageData: {
    name: string;
    description: string;
    orderNumber: number;
  }) => void;
}

const EditStageModal = ({
  stage,
  isOpen,
  onClose,
  onSave,
}: EditStageModalProps) => {
  const [name, setName] = useState(stage.name);
  const [description, setDescription] = useState(stage.description || "");
  const [orderNumber, setOrderNumber] = useState(stage.orderNumber || 1);

  // Reset form when stage changes
  useEffect(() => {
    setName(stage.name);
    setDescription(stage.description || "");
    setOrderNumber(stage.orderNumber || 1);
  }, [stage]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && orderNumber > 0) {
      onSave({
        name: name.trim(),
        description: description.trim(),
        orderNumber: orderNumber,
      });
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      {/* Modal Container */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-gray-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Edit Stage</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              type="button"
            >
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              {/* Stage Name Field */}
              <div>
                <label
                  htmlFor="stageName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Stage Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="stageName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors text-gray-900 placeholder-gray-400"
                  placeholder="Enter stage name"
                  required
                />
              </div>

              {/* Order Number Field */}
              <div>
                <label
                  htmlFor="orderNumber"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Order Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="orderNumber"
                  type="number"
                  min="1"
                  value={orderNumber}
                  onChange={(e) =>
                    setOrderNumber(parseInt(e.target.value) || 1)
                  }
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors text-gray-900"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Determines the display order of this stage
                </p>
              </div>

              {/* Description Field */}
              <div>
                <label
                  htmlFor="stageDescription"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Description
                </label>
                <textarea
                  id="stageDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors text-gray-900 placeholder-gray-400 resize-none"
                  placeholder="Enter stage description (optional)"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#636363] text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600 transition-colors font-medium shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Dynamic color assignment based on stage position in the array
const getStageColors = (stageIndex: number, stageName: string) => {
  const stageColorsByPosition = [
    { color: "bg-slate-600", textColor: "text-white" },
    { color: "bg-blue-600", textColor: "text-white" },
    { color: "bg-amber-600", textColor: "text-white" },
    { color: "bg-purple-600", textColor: "text-white" },
    { color: "bg-green-600", textColor: "text-white" },
    { color: "bg-indigo-600", textColor: "text-white" },
    { color: "bg-pink-600", textColor: "text-white" },
    { color: "bg-red-600", textColor: "text-white" },
    { color: "bg-teal-600", textColor: "text-white" },
    { color: "bg-orange-600", textColor: "text-white" },
  ];

  const colorIndex = stageIndex % stageColorsByPosition.length;
  return stageColorsByPosition[colorIndex];
};

export const TaskColumn = ({
  stage,
  tasks,
  onEditTask,
  onDeleteTask,
  onTaskClick,
  stageIndex,
  onTaskUpdate,
  onEditStage,
  onDeleteStage,
  onAddTaskForStage,
  onStageUpdate,
  allStages = [],
  onStageReorder,
}: TaskColumnProps) => {
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);

  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [pendingMove, setPendingMove] = useState<{
    taskId: number;
    task: Task;
  } | null>(null);
  const [pendingTargetStageId, setPendingTargetStageId] = useState<
    number | null
  >(null);

  // Stage management states
  const [isStageMenuOpen, setIsStageMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isColumnDragging, setIsColumnDragging] = useState(false);
  const [isColumnDraggedOver, setIsColumnDraggedOver] = useState(false);

  const { toast } = useToast();
  const stageColors = getStageColors(stageIndex, stage.name);
  const dragCounterRef = useRef(0);
  const { permissions: stagePermissions, loading: stagePermissionsLoading } =
    usePermissions("task_stage");
  const { permissions: taskPermissions, loading: taskPermissionsLoading } =
    usePermissions("task");
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const kanbanBoardRef = useRef<HTMLDivElement>(null);

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, []);

  // Function to handle auto-scrolling during drag operations
  const handleAutoScroll = useCallback((e: React.DragEvent) => {
    // Find the kanban board container
    const kanbanBoard = document.querySelector(".kanban-board-container");
    if (!kanbanBoard) return;

    const boardRect = kanbanBoard.getBoundingClientRect();
    const scrollThreshold = 100; // Distance from edge to trigger scrolling
    const scrollSpeed = 20; // Pixels to scroll per interval

    // Clear any existing scroll interval
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }

    // Check if we're near the edges and need to scroll
    const isNearLeftEdge = e.clientX < boardRect.left + scrollThreshold;
    const isNearRightEdge = e.clientX > boardRect.right - scrollThreshold;

    if (isNearLeftEdge || isNearRightEdge) {
      scrollIntervalRef.current = setInterval(() => {
        const scrollAmount = isNearLeftEdge ? -scrollSpeed : scrollSpeed;
        kanbanBoard.scrollLeft += scrollAmount;
      }, 16); // ~60fps
    }
  }, []);

  const handleDragStart = () => {
    setIsDraggedOver(false);
    dragCounterRef.current = 0;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const dragData = e.dataTransfer.types.includes("application/json");
    if (dragData) {
      setIsDraggedOver(true);
    }

    // Handle auto-scrolling during drag
    handleAutoScroll(e);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;

    try {
      const dragDataString = e.dataTransfer.getData("application/json");
      if (dragDataString) {
        const dragData = JSON.parse(dragDataString);
        if (dragData.sourceStageId !== stage.id) {
          setIsDraggedOver(true);
        }
      }
    } catch (error) {
      setIsDraggedOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;

    if (dragCounterRef.current <= 0) {
      setIsDraggedOver(false);
      dragCounterRef.current = 0;
    }

    // Stop auto-scrolling when leaving the area
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggedOver(false);
    setIsColumnDraggedOver(false);
    dragCounterRef.current = 0;

    // stop auto-scroll if any
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }

    try {
      const dragDataString = e.dataTransfer.getData("application/json");
      if (!dragDataString) return;

      const dragData = JSON.parse(dragDataString);

      // Stage reordering — unchanged
      if (dragData.type === "stage") {
        const { stageId, sourceIndex } = dragData;
        const targetIndex = stageIndex;
        if (sourceIndex !== targetIndex && onStageReorder) {
          const reorderedStages = [...allStages];
          const [movedStage] = reorderedStages.splice(sourceIndex, 1);
          reorderedStages.splice(targetIndex, 0, movedStage);

          const stageIdsInOrder = reorderedStages.map((s) => s.id);
          setIsUpdating(true);
          try {
            const response = await reorderTaskStages(stageIdsInOrder);
            if (response.isSuccess) {
              onStageReorder(reorderedStages);
              toast({
                title: "Stages Reordered",
                description: "Stage order has been updated successfully.",
                variant: "default",
              });
            } else {
              throw new Error(response.message || "Failed to reorder stages");
            }
          } catch (err) {
            console.error("Error reordering stages:", err);
            toast({
              title: "Error",
              description: "Failed to reorder stages. Please try again.",
              variant: "destructive",
            });
          } finally {
            setIsUpdating(false);
          }
        }
        return;
      }

      // ✅ Task moving — now opens comment modal instead of immediate update
      const { taskId, sourceStageId, task } = dragData;
      if (sourceStageId === stage.id) return; // no-op if same stage

      if (!task) {
        toast({
          title: "Error",
          description: "Unable to move task. Task data not found.",
          variant: "destructive",
        });
        return;
      }

      // Set pending move & target stage; open modal
      setPendingMove({ taskId, task });
      setPendingTargetStageId(stage.id);
      setComment(""); // reset any old input
      setIsCommentModalOpen(true);
    } catch (error) {
      console.error("Error handling drop:", error);
      toast({
        title: "Error",
        description: "Something went wrong during the drop operation.",
        variant: "destructive",
      });
    }
  };

  // ⬇️ NEW: confirm/cancel handlers for comment modal
  const handleConfirmMoveWithComment = async () => {
    if (!pendingMove || pendingTargetStageId == null) return;
    if (!comment.trim()) {
      toast({
        title: "Comment required",
        description: "Please add a short note for the move.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    setDraggedTaskId(pendingMove.taskId);
    try {
      const response = await updateTask(pendingMove.taskId, {
        taskStageId: pendingTargetStageId,
        comment: comment.trim(), // <-- pass the comment
      });

      if (response.isSuccess) {
        toast({
          title: "Task Moved",
          description: `"${pendingMove.task.subject}" → ${stage.name}`,
          variant: "default",
        });
        onTaskUpdate?.();
      } else {
        throw new Error(response.message || "Failed to update task");
      }
    } catch (err) {
      console.error("Error moving task:", err);
      toast({
        title: "Error Moving Task",
        description:
          err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
      setDraggedTaskId(null);
      setIsCommentModalOpen(false);
      setPendingMove(null);
      setPendingTargetStageId(null);
      setComment("");
    }
  };

  const handleCancelMove = () => {
    setIsCommentModalOpen(false);
    setPendingMove(null);
    setPendingTargetStageId(null);
    setComment("");
  };

  // Stage drag and drop handlers
  const handleStageDragStart = (e: React.DragEvent) => {
    setIsColumnDragging(true);
    const dragData = {
      type: "stage",
      stageId: stage.id,
      sourceIndex: stageIndex,
      stage: stage,
    };
    e.dataTransfer.setData("application/json", JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleStageDragEnd = () => {
    setIsColumnDragging(false);

    // Stop auto-scrolling when drag ends
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const handleStageDragOver = (e: React.DragEvent) => {
    e.preventDefault();

    try {
      const dragDataString = e.dataTransfer.getData("application/json");
      if (dragDataString) {
        const dragData = JSON.parse(dragDataString);
        if (dragData.type === "stage" && dragData.stageId !== stage.id) {
          setIsColumnDraggedOver(true);
        }
      }
    } catch (error) {
      // Ignore parsing errors
    }

    // Handle auto-scrolling during stage drag
    handleAutoScroll(e);
  };

  const handleStageDragLeave = () => {
    setIsColumnDraggedOver(false);

    // Stop auto-scrolling when leaving the area
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const handleStageMenuToggle = (e: React.MouseEvent) => {
    setIsStageMenuOpen(!isStageMenuOpen);
  };

  const handleEditStage = async (stageData: {
    name: string;
    description: string;
    orderNumber: number;
  }) => {
    setIsUpdating(true);

    try {
      const updateData = {
        name: stageData.name,
        description: stageData.description,
        orderNumber: stageData.orderNumber,
      };

      const response = await updateTaskStage(stage.id.toString(), updateData);

      if (response.isSuccess) {
        toast({
          title: "Stage Updated",
          description: `Stage "${stageData.name}" has been updated successfully.`,
          variant: "default",
        });

        if (onStageUpdate) {
          onStageUpdate();
        }
      } else {
        throw new Error(response.message || "Failed to update stage");
      }
    } catch (error) {
      console.error("Error updating stage:", error);
      toast({
        title: "Error",
        description: "Failed to update stage. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteStage = async () => {
    if (tasks.length > 0) {
      toast({
        title: "Cannot Delete Stage",
        description:
          "Please move or delete all tasks in this stage before deleting it.",
        variant: "destructive",
      });
      return;
    }

    if (
      !confirm(`Are you sure you want to delete the stage "${stage.name}"?`)
    ) {
      return;
    }

    setIsUpdating(true);

    try {
      const response = await deleteTaskStage(stage.id.toString());

      if (response.isSuccess) {
        toast({
          title: "Stage Deleted",
          description: `Stage "${stage.name}" has been deleted successfully.`,
          variant: "default",
        });

        if (onStageUpdate) {
          onStageUpdate();
        }
      } else {
        throw new Error(response.message || "Failed to delete stage");
      }
    } catch (error) {
      console.error("Error deleting stage:", error);
      toast({
        title: "Error",
        description: "Failed to delete stage. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      ref={columnRef}
      className={`flex-shrink-0 min-w-[280px] max-w-[320px] rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md ${
        isColumnDraggedOver
          ? "bg-gray-50 border-2 border-gray-300 border-dashed"
          : "bg-gray-50 border-gray-200"
      } ${isColumnDragging ? "opacity-50 scale-95" : ""}`}
      data-stage-id={stage.id}
      data-stage-name={stage.name}
      onDragOver={handleStageDragOver}
      onDragLeave={handleStageDragLeave}
      onDrop={handleDrop}
      style={{
        willChange: "transform, box-shadow",
        transform: "translateZ(0)",
      }}
    >
      {/* Stage Header */}
      <div
        className="sticky top-0 z-10 bg-gray-50 rounded-t-xl border-b border-gray-200 cursor-move"
        draggable={true}
        onDragStart={handleStageDragStart}
        onDragEnd={handleStageDragEnd}
      >
        <div
          className={`${stageColors.color} ${stageColors.textColor} px-4 py-3 rounded-t-xl flex items-center justify-between shadow-sm transition-all duration-200`}
        >
          <h2 className="font-semibold text-sm uppercase tracking-wide truncate">
            {stage.name}
          </h2>
          <div className="flex items-center gap-3">
            <Badge
              variant="secondary"
              className="bg-white/20 text-white border-white/30 flex-shrink-0"
            >
              {tasks.length}
            </Badge>

            {/* Add Task Icon */}
            {taskPermissions.canCreate && (
              <button
                onClick={() => onAddTaskForStage(stage.id)}
                className="p-1.5 rounded hover:bg-white/20 transition-colors ml-2"
                title={`Add task to ${stage.name}`}
              >
                <svg
                  className="w-5 h-5 group-hover:scale-110 transition-transform duration-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </button>
            )}
            {/* Three dots menu for stage operations */}
            {stagePermissions.canDelete && stagePermissions.canEdit && (
              <div className="relative">
                <button
                  onClick={handleStageMenuToggle}
                  className="p-1.5 rounded hover:bg-white/20 transition-colors"
                  title="Stage options"
                  type="button"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isStageMenuOpen && (
                  <>
                    {/* Backdrop to close menu */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsStageMenuOpen(false)}
                    />

                    {/* Menu */}

                    <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      {stagePermissions.canEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsStageMenuOpen(false);
                            // Instead of opening modal locally, call parent handler
                            onEditStage?.(stage);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                        >
                          <svg
                            className="w-4 h-4 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          Edit Stage
                        </button>
                      )}
                      <hr className="my-1 border-gray-200" />
                      {stagePermissions.canDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsStageMenuOpen(false);
                            // Call the parent handler which will open the confirmation modal
                            onDeleteStage?.(stage);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                        >
                          <svg
                            className="w-4 h-4 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Delete Stage
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tasks Container with Enhanced Scrolling */}
      <div
        className={`h-[calc(100vh-280px)] min-h-[550px] p-3 transition-all duration-300 ease-in-out ${
          isDraggedOver
            ? "bg-gray-50/50 border-2 border-gray-300 border-dashed shadow-inner"
            : "bg-transparent"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDragEnter={handleDragEnter}
        style={{
          overflowY: "auto",
          scrollBehavior: "smooth",
          scrollbarWidth: "thin",
          scrollbarColor: "#cbd5e1 #f1f5f9",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Custom Scrollbar Styles */}
        <style jsx>{`
          div::-webkit-scrollbar {
            width: 6px;
          }
          div::-webkit-scrollbar-track {
            background: transparent;
            border-radius: 3px;
          }
          div::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
            transition: background 0.2s ease;
          }
          div::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}</style>

        {/* Loading indicator */}
        {isUpdating && (
          <div className="flex items-center justify-center py-6 mb-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium">
                {draggedTaskId ? "Moving task..." : "Updating stage..."}
              </span>
            </div>
          </div>
        )}

        {/* Task cards with enhanced spacing and animations */}
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              className="transition-all duration-200 ease-in-out transform hover:scale-[1.02]"
              style={{
                animationDelay: `${index * 50}ms`,
                willChange: "transform, opacity",
              }}
            >
              <TaskCard
                task={task}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onTaskClick={() => onTaskClick?.(task.id)}
                draggable={!isUpdating}
                isDragging={draggedTaskId === task.id}
                onDragStart={handleDragStart}
              />
            </div>
          ))}
        </div>

        {/* Empty state */}
        {tasks.length === 0 && !isUpdating && (
          <div className="text-center py-2">
            <div className="rounded-xl p-8 transition-all duration-200">
              <p className="text-sm text-gray-500 mb-2">
                No tasks in this stage
              </p>
              {isDraggedOver && (
                <p className="text-sm text-gray-600 font-medium animate-pulse">
                  Drop task here
                </p>
              )}
            </div>
          </div>
        )}

        {/* Drop indicator when dragging over non-empty column */}
        {isDraggedOver && tasks.length > 0 && (
          <div className="mt-4 text-center py-6 text-gray-600 bg-gray-50 rounded-xl border-2 border-gray-300 border-dashed transition-all duration-200 animate-pulse">
            <div className="flex items-center justify-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
              <p className="text-sm font-medium">Drop task here</p>
            </div>
          </div>
        )}
      </div>

      {/* Edit Stage Modal */}
      <EditStageModal
        stage={stage}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEditStage}
      />
      {isCommentModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCancelMove();
            }}
          >
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Add a Move Comment
                  </h2>
                  <button
                    onClick={handleCancelMove}
                    className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                    type="button"
                    disabled={isUpdating}
                  >
                    <svg
                      className="w-5 h-5 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    {`You're moving `}
                    <span className="font-medium text-gray-900">
                      “{pendingMove?.task.subject}”
                    </span>
                    {` to `}
                    <span className="font-medium text-gray-900">
                      {stage.name}
                    </span>
                    .
                  </p>

                  <div>
                    <label
                      htmlFor="moveComment"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Why are you moving this task?{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="moveComment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors text-gray-900 placeholder-gray-400 resize-none"
                      placeholder="Add a brief comment..."
                      disabled={isUpdating}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCancelMove}
                    className="px-4 py-2.5 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors font-medium disabled:opacity-50"
                    disabled={isUpdating}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmMoveWithComment}
                    className="px-4 py-2.5 bg-[#636363] text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    disabled={isUpdating || !comment.trim()}
                  >
                    {isUpdating && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                    Move Task
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
