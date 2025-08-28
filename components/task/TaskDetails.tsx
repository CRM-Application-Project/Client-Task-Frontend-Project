"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Calendar,
  User,
  FileText,
  Edit,
  Clock,
  AlertCircle,
  CheckCircle,
  Download,
  Save,
  X,
  Target,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Smile,
  Reply,
  Trash2,
  Timer,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getTaskById,
  getDocumentDownloadUrl,
  updateTask,
  getAssignDropdown,
  // --- Optional: wire these when your backend is ready ---
  // getTaskComments,
  // addTaskComment,
  // updateTaskComment,
  // deleteTaskComment,
  // toggleTaskCommentReaction,
} from "@/app/services/data.service";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "./Richtaskeditor";

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
  estimatedHours: number;
  graceHours: number;
  actualHours: number;
  actionType: string;
  status: string;
  comment: string;
  assignee: {
    id: string;
    label: string;
    avatar?: string;
  };
  createdBy: {
    id: string;
    label: string;
    avatar?: string;
  };
  completedBy: {
    id: string;
    label: string;
    avatar?: string;
  } | null;
  completedAt: string | null;
  documents: any[];
  acceptanceInfo: {
    acceptanceCriteria: string;
  };
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

interface AssignDropdown {
  id: string;
  label: string;
}

// -------------------- Discussion Types --------------------
interface CommentAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  url?: string; // optional until uploaded
}

interface Reaction {
  emoji: string; // "👍", "❤️", etc
  count: number;
  reacted?: boolean; // whether current user reacted
}

interface CommentItem {
  id: string;
  author: { id: string; name: string; avatar?: string };
  content: string; // Plain text now instead of HTML
  createdAt: string; // ISO
  updatedAt?: string; // ISO
  attachments?: CommentAttachment[];
  reactions?: Reaction[];
  isEdited?: boolean;
}

// Utils
function formatFileSize(bytes: number) {
  if (!bytes && bytes !== 0) return "";
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function timeAgo(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

// -------------------- Discussion Panel --------------------
function DiscussionPanel({
  taskId,
  users,
  canComment,
}: {
  taskId: number;
  users: AssignDropdown[];
  canComment: boolean;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [editorValue, setEditorValue] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultReactions = ["👍", "❤️", "🎉", "🚀"];

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      // If you have a backend, replace with: const res = await getTaskComments(taskId)
      // For now, start with empty list; keep placeholder to show UI nicely.
      setComments((prev) => (prev.length ? prev : []));
    } catch (e) {
      console.error("Error loading comments", e);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    load();
  }, [load]);

  const onFilesPicked = (files: FileList | null) => {
    if (!files) return;
    setPendingFiles((prev) => [...prev, ...Array.from(files)]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!canComment) return;
    if (!editorValue?.trim() && pendingFiles.length === 0) return;
    setIsPosting(true);
    try {
      // 1) Upload pending files (if you have an API)
      // const uploaded: CommentAttachment[] = await uploadCommentFiles(taskId, pendingFiles)
      const uploaded: CommentAttachment[] = pendingFiles.map((f, i) => ({
        id: `${Date.now()}_${i}`,
        fileName: f.name,
        fileSize: f.size,
        url: undefined,
      }));

      // 2) Create the comment
      const newComment: CommentItem = {
        id: `${Date.now()}`,
        author: { id: "me", name: "You" },
        content: editorValue || "",
        createdAt: new Date().toISOString(),
        attachments: uploaded,
        reactions: [],
      };

      // Optimistic update
      setComments((prev) => [newComment, ...prev]);
      setEditorValue("");
      setPendingFiles([]);

      // TODO: POST to backend
      // await addTaskComment(taskId, { content: editorValue, attachments: uploaded })
    } catch (e) {
      console.error("Error posting comment", e);
    } finally {
      setIsPosting(false);
    }
  };

  const toggleReaction = async (commentId: string, emoji: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        const existing = (c.reactions || []).find((r) => r.emoji === emoji);
        if (existing) {
          const reacted = !existing.reacted;
          const count = Math.max(0, existing.count + (reacted ? 1 : -1));
          return {
            ...c,
            reactions: c.reactions!.map((r) =>
              r.emoji === emoji ? { ...r, count, reacted } : r
            ),
          };
        }
        return {
          ...c,
          reactions: [
            ...(c.reactions || []),
            { emoji, count: 1, reacted: true },
          ],
        };
      })
    );

    // TODO: call backend toggle
    // await toggleTaskCommentReaction(taskId, commentId, emoji)
  };

  const onDelete = async (commentId: string) => {
    if (!confirm("Delete this comment?")) return;
    const old = comments;
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    try {
      // await deleteTaskComment(taskId, commentId)
    } catch (e) {
      console.error(e);
      // revert on error
      setComments(old);
    }
  };

  const onEdit = async (commentId: string, newText: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              content: newText,
              isEdited: true,
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );
    try {
      // await updateTaskComment(taskId, commentId, { content: newText })
    } catch (e) {
      console.error(e);
    }
  };

  const list = [...comments].sort((a, b) =>
    sort === "newest"
      ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <div className="bg-white shadow-sm rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-700 text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> Discussion
          <span className="text-xs text-gray-500">({comments.length})</span>
        </h3>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">Sort</div>
          <div className="inline-flex rounded-md border overflow-hidden">
            <button
              className={`px-2 py-1 text-xs ${
                sort === "newest" ? "bg-gray-50 text-gray-900" : "text-gray-600"
              }`}
              onClick={() => setSort("newest")}
            >
              Newest
            </button>
            <button
              className={`px-2 py-1 text-xs border-l ${
                sort === "oldest" ? "bg-gray-50 text-gray-900" : "text-gray-600"
              }`}
              onClick={() => setSort("oldest")}
            >
              Oldest
            </button>
          </div>
        </div>
      </div>

      {/* Composer - Now using simple textarea */}
      <div className="border rounded-md p-3 mb-4 bg-gray-50/60">
        {!canComment && (
          <div className="text-xs text-red-600 mb-2">
            You don't have permission to comment on this task.
          </div>
        )}
        <Textarea
          value={editorValue}
          onChange={(e) => setEditorValue(e.target.value)}
          placeholder="Write a comment..."
          className="min-h-[80px]"
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => onFilesPicked(e.target.files)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-600"
              title="Attach files"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <div className="flex flex-wrap gap-2">
              {pendingFiles.map((f, i) => (
                <span
                  key={`${f.name}_${i}`}
                  className="text-xs bg-white border rounded px-2 py-1 flex items-center gap-2"
                >
                  <span className="truncate max-w-[160px]" title={f.name}>
                    {f.name}
                  </span>
                  <span className="text-gray-400">
                    {formatFileSize(f.size)}
                  </span>
                  <button
                    className="text-gray-400 hover:text-gray-600"
                    onClick={() => removePendingFile(i)}
                    title="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePost}
              disabled={
                !canComment ||
                isPosting ||
                (!editorValue.trim() && pendingFiles.length === 0)
              }
            >
              {isPosting ? "Posting…" : "Post"}
            </Button>
          </div>
        </div>
      </div>

      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-md" />
          <Skeleton className="h-16 rounded-md" />
        </div>
      ) : list.length === 0 ? (
        <p className="text-sm text-gray-500 italic">
          No comments yet. Be the first to chime in.
        </p>
      ) : (
        <ul className="space-y-3">
          {list.map((c) => (
            <li key={c.id} className="border rounded-md p-3">
              <div className="flex items-start gap-3">
                {c.author.avatar ? (
                  <img
                    src={c.author.avatar}
                    alt={c.author.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-medium text-gray-900 text-sm">
                      {c.author.name}
                    </span>
                    <span>•</span>
                    <span title={new Date(c.createdAt).toLocaleString()}>
                      {timeAgo(c.createdAt)}
                    </span>
                    {c.isEdited && <span className="italic">(edited)</span>}
                  </div>

                  {/* Plain text content */}
                  <div className="text-gray-700 mt-1 whitespace-pre-wrap">
                    {c.content}
                  </div>

                  {/* Attachments */}
                  {c.attachments && c.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {c.attachments.map((a) => (
                        <a
                          key={a.id}
                          href={a.url || "#"}
                          onClick={(e) => {
                            if (!a.url) e.preventDefault();
                          }}
                          className="inline-flex items-center gap-2 text-xs border rounded px-2 py-1 bg-gray-50 hover:bg-gray-100"
                        >
                          <FileText className="h-3 w-3" />
                          <span
                            className="truncate max-w-[140px]"
                            title={a.fileName}
                          >
                            {a.fileName}
                          </span>
                          <span className="text-gray-400">
                            {formatFileSize(a.fileSize)}
                          </span>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Reactions */}
                  <div className="mt-2 flex items-center gap-2">
                    {defaultReactions.map((emoji) => {
                      const reaction = c.reactions?.find(
                        (r) => r.emoji === emoji
                      );
                      const active = reaction?.reacted;
                      const count = reaction?.count || 0;
                      return (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction(c.id, emoji)}
                          className={`text-xs border rounded-full px-2 py-0.5 ${
                            active
                              ? "bg-blue-50 border-blue-200 text-blue-700"
                              : "text-gray-600"
                          }`}
                          title={active ? "Remove reaction" : "Add reaction"}
                        >
                          <span className="mr-1">{emoji}</span>
                          {count > 0 && <span>{count}</span>}
                        </button>
                      );
                    })}
                    <button
                      className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
                      title="More reactions"
                    >
                      <Smile className="h-3 w-3" />
                      React
                    </button>
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-gray-600"
                        title="Reply"
                      >
                        <Reply className="h-3.5 w-3.5" />
                      </Button>
                      <InlineEditButton
                        onSubmit={(text) => onEdit(c.id, text)}
                        initialText={c.content}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-gray-600"
                        onClick={() => onDelete(c.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InlineEditButton({
  initialText,
  onSubmit,
}: {
  initialText: string;
  onSubmit: (newText: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialText);

  useEffect(() => setValue(initialText), [initialText]);

  if (!isEditing) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-gray-600"
        onClick={() => setIsEditing(true)}
        title="Edit"
      >
        <Edit className="h-3.5 w-3.5" />
      </Button>
    );
  }

  return (
    <div className="w-full max-w-xl border rounded-md p-2 bg-white">
      <Textarea 
        value={value} 
        onChange={(e) => setValue(e.target.value)}
        className="min-h-[60px]"
      />
      <div className="flex justify-end gap-2 mt-2">
        <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
          <X className="h-4 w-4 mr-1" /> Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => {
            onSubmit(value);
            setIsEditing(false);
          }}
        >
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
      </div>
    </div>
  );
}

// -------------------- Main TaskDetails --------------------
export function TaskDetails({ taskId }: TaskDetailsProps) {
  const [task, setTask] = useState<TaskDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [editedSubject, setEditedSubject] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingAssignee, setIsEditingAssignee] = useState(false);
  const [isEditingStartDate, setIsEditingStartDate] = useState(false);
  const [isEditingEndDate, setIsEditingEndDate] = useState(false);
  const [isEditingAcceptanceCriteria, setIsEditingAcceptanceCriteria] =
    useState(false);
  const [users, setUsers] = useState<AssignDropdown[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");
  const [editedAssignee, setEditedAssignee] = useState("");
  const [editedStartDate, setEditedStartDate] = useState("");
  const [editedEndDate, setEditedEndDate] = useState("");
  const [editedAcceptanceCriteria, setEditedAcceptanceCriteria] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { permissions } = usePermissions("task");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchTaskDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getTaskById(taskId);
      if (response.isSuccess) {
        setTask(response.data as TaskDetailsResponse);
        setEditedDescription(response.data.description || "");
        setEditedAssignee(response.data.assignee?.id || "");
        setEditedStartDate(response.data.startDate || "");
        setEditedEndDate(response.data.endDate || "");
        setEditedSubject(response.data.subject || "");
        setEditedAcceptanceCriteria(
          response.data.acceptanceInfo?.acceptanceCriteria || ""
        );
      } else {
        console.error("Failed to fetch task details:", response.message);
      }
    } catch (error) {
      console.error("Error fetching task details:", error);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  const handleSaveSubject = async () => {
    try {
      const response = await updateTask(taskId, {
        subject: editedSubject,
      });
      if (response.isSuccess) {
        setTask((prev) => (prev ? { ...prev, subject: editedSubject } : null));
        setIsEditingSubject(false);
      } else {
        console.error("Failed to update subject:", response.message);
      }
    } catch (error) {
      console.error("Error updating subject:", error);
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchTaskDetails();
      fetchUsers();
    }
  }, [taskId, fetchTaskDetails]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await getAssignDropdown();
      if (response.isSuccess) {
        setUsers(response.data);
      } else {
        console.error("Failed to fetch users:", response.message);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSaveDescription = async () => {
    try {
      const response = await updateTask(taskId, {
        description: editedDescription,
      });
      if (response.isSuccess) {
        setTask((prev) =>
          prev ? { ...prev, description: editedDescription } : null
        );
        setIsEditingDescription(false);
      } else {
        console.error("Failed to update description:", response.message);
      }
    } catch (error) {
      console.error("Error updating description:", error);
    }
  };

  const handleSaveAssignee = async () => {
    try {
      const response = await updateTask(taskId, { assignee: editedAssignee });
      if (response.isSuccess) {
        const selectedUser = users.find((user) => user.id === editedAssignee);
        setTask((prev) =>
          prev
            ? {
                ...prev,
                assignee: selectedUser
                  ? {
                      id: selectedUser.id,
                      label: selectedUser.label,
                      avatar: prev.assignee?.avatar,
                    }
                  : prev.assignee,
              }
            : null
        );
        setIsEditingAssignee(false);
      } else {
        console.error("Failed to update assignee:", response.message);
      }
    } catch (error) {
      console.error("Error updating assignee:", error);
    }
  };

  const handleSaveStartDate = async () => {
    try {
      const formattedDateTime = editedStartDate.includes("T")
        ? editedStartDate
        : `${editedStartDate}T00:00:00`;

      const response = await updateTask(taskId, {
        startDate: formattedDateTime,
      });
      if (response.isSuccess) {
        setTask((prev) =>
          prev ? { ...prev, startDate: formattedDateTime } : null
        );
        setIsEditingStartDate(false);
      } else {
        console.error("Failed to update start date:", response.message);
      }
    } catch (error) {
      console.error("Error updating start date:", error);
    }
  };

  const handleSaveEndDate = async () => {
    try {
      const formattedDateTime = editedEndDate.includes("T")
        ? editedEndDate
        : `${editedEndDate}T23:59:59`;

      const response = await updateTask(taskId, { endDate: formattedDateTime });
      if (response.isSuccess) {
        setTask((prev) =>
          prev ? { ...prev, endDate: formattedDateTime } : null
        );
        setIsEditingEndDate(false);
      } else {
        console.error("Failed to update end date:", response.message);
      }
    } catch (error) {
      console.error("Error updating end date:", error);
    }
  };

  const handleSaveAcceptanceCriteria = async () => {
    try {
      const response = await updateTask(taskId, {
        acceptanceCriteria: editedAcceptanceCriteria,
      });
      if (response.isSuccess) {
        setTask((prev) =>
          prev
            ? {
                ...prev,
                acceptanceInfo: {
                  acceptanceCriteria: editedAcceptanceCriteria,
                },
              }
            : null
        );
        setIsEditingAcceptanceCriteria(false);
      } else {
        console.error(
          "Failed to update acceptance criteria:",
          response.message
        );
      }
    } catch (error) {
      console.error("Error updating acceptance criteria:", error);
    }
  };

  const cancelEdit = (field: string) => {
    switch (field) {
      case "subject":
        setEditedSubject(task?.subject || "");
        setIsEditingSubject(false);
        break;
      case "description":
        setEditedDescription(task?.description || "");
        setIsEditingDescription(false);
        break;
      case "assignee":
        setEditedAssignee(task?.assignee?.id || "");
        setIsEditingAssignee(false);
        break;
      case "startDate":
        setEditedStartDate(task?.startDate || "");
        setIsEditingStartDate(false);
        break;
      case "endDate":
        setEditedEndDate(task?.endDate || "");
        setIsEditingEndDate(false);
        break;
      case "acceptanceCriteria":
        setEditedAcceptanceCriteria(
          task?.acceptanceInfo?.acceptanceCriteria || ""
        );
        setIsEditingAcceptanceCriteria(false);
        setShowEmojiPicker(false);
        break;
    }
  };

  const priorityColors = {
    LOW: "bg-green-100 text-green-700 hover:bg-green-200",
    MEDIUM: "bg-blue-100 text-blue-700 hover:bg-blue-200",
    HIGH: "bg-amber-100 text-amber-700 hover:bg-amber-200",
    URGENT: "bg-red-100 text-red-700 hover:bg-red-200",
  } as const;

  const priorityIcons = {
    LOW: <CheckCircle className="h-4 w-4" />,
    MEDIUM: <Clock className="h-4 w-4" />,
    HIGH: <AlertCircle className="h-4 w-4" />,
    URGENT: <AlertCircle className="h-4 w-4" />,
  };

  const formatSize = (bytes: number) => formatFileSize(bytes);

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

  // Calculate progress percentage based on actual vs estimated hours
  const getProgressPercentage = () => {
    if (!task?.estimatedHours || task.estimatedHours === 0) return 0;
    return Math.min(100, (task.actualHours / task.estimatedHours) * 100);
  };

  // Get progress color based on hours
  const getProgressColor = () => {
    if (!task) return "bg-gray-200";
    const percentage = getProgressPercentage();
    const totalAllowedHours = task.estimatedHours + task.graceHours;
    
    if (task.actualHours > totalAllowedHours) return "bg-red-500"; // Over grace limit
    if (task.actualHours > task.estimatedHours) return "bg-amber-500"; // In grace period
    if (percentage >= 80) return "bg-blue-500"; // Nearly done
    return "bg-green-500"; // On track
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-2xl mx-auto bg-white shadow-sm rounded-lg border p-6 text-center">
        <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600">Task not found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto space-y-4 p-4 bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <h2 className="text-xl font-semibold text-gray-900">Task Details</h2>
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
          <span>•</span>
          <span>Updated: {new Date(task.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Overview */}
      <div className="bg-white shadow-sm rounded-lg border p-4">
        {/* Subject */}
        <div className="mb-4">
          <h3 className="font-medium text-gray-700 text-sm mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Subject
          </h3>
          {isEditingSubject ? (
            <div>
              <Input
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                className="w-full mb-2"
              />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => cancelEdit("subject")}
                >
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSaveSubject}>
                  <Save className="h-4 w-4 mr-1" /> Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative group">
              <h1 className="text-base font-semibold text-gray-900 bg-gray-50 p-3 rounded-md">
                {task.subject}
              </h1>
              {permissions.canEdit && (
                <button
                  onClick={() => setIsEditingSubject(true)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white rounded border shadow-sm"
                >
                  <Edit className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <Badge
            className={`${
              priorityColors[task.priority]
            } flex items-center gap-1`}
          >
            {priorityIcons[task.priority]} {task.priority}
          </Badge>
          <Badge variant="outline">{task.taskStageName}</Badge>
         <Badge variant="outline" className="flex items-center gap-1">
  <span
    className={`h-2 w-2 rounded-full ${
      task.status === "STARTED"
        ? "bg-blue-500"
        : task.status === "COMPLETED"
        ? "bg-green-500"
        : "bg-gray-400"
    }`}
  ></span>
  {task.status.replace(/_/g, " ")}
</Badge>

          {isOverdue && <Badge variant="destructive">Overdue</Badge>}
        </div>

        {/* Hours Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs text-gray-500 flex items-center gap-2">
              <Timer className="h-3 w-3" /> Hours Progress
            </h4>
            <span className="text-xs text-gray-600">
              {task.actualHours?.toFixed(1)}h / {task.estimatedHours}h
              {task.graceHours > 0 && ` (+${task.graceHours}h grace)`}
            </span>
          </div>
          
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden relative">
            {/* Main progress bar */}
            <div
              className={`h-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${Math.min(100, getProgressPercentage())}%` }}
            />
            
            {/* Grace period indicator */}
            {task.graceHours > 0 && (
              <div
                className="absolute top-0 h-full bg-gray-300 opacity-30"
                style={{ 
                  left: `${(task.estimatedHours / (task.estimatedHours + task.graceHours)) * 100}%`,
                  width: `${(task.graceHours / (task.estimatedHours + task.graceHours)) * 100}%`
                }}
              />
            )}
          </div>
          
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0h</span>
            <span className="text-gray-400">|</span>
            <span>{task.estimatedHours}h</span>
            {task.graceHours > 0 && (
              <>
                <span className="text-gray-400">|</span>
                <span>{task.estimatedHours + task.graceHours}h</span>
              </>
            )}
          </div>
          
          {/* Status indicators */}
          <div className="flex items-center gap-4 mt-2 text-xs">
            {task.actualHours > (task.estimatedHours + task.graceHours) && (
              <span className="text-red-600 flex items-center gap-1">   
                <AlertCircle className="h-3 w-3" />
                Exceeded Estimate by {(task.actualHours - task.estimatedHours - task.graceHours).toFixed(1)}h
              </span>
            )}
            {task.actualHours > task.estimatedHours && task.actualHours <= (task.estimatedHours + task.graceHours) && (
              <span className="text-amber-600 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                In grace period ({(task.actualHours - task.estimatedHours).toFixed(1)}h over)
              </span>
            )}
            {task.actualHours <= task.estimatedHours && (
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Within estimated hours
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mb-3 mt-7">
          <h3 className="font-medium text-gray-700 text-sm mb-2 flex items-center gap-2">
            <Edit className="h-4 w-4" /> Description
          </h3>
          {isEditingDescription ? (
            <div>
              <RichTextEditor
                value={editedDescription}
                onChange={setEditedDescription}
                placeholder="Enter task description..."
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => cancelEdit("description")}
                >
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSaveDescription}>
                  <Save className="h-4 w-4 mr-1" /> Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative group">
              {task.description ? (
                <div 
                  className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: task.description }}
                />
              ) : (
                <p className="text-sm text-gray-400 italic p-3 rounded-md border border-dashed">
                  No description provided
                </p>
              )}
              {permissions.canEdit && (
                <button
                  onClick={() => setIsEditingDescription(true)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white rounded border shadow-sm"
                >
                  <Edit className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Acceptance Criteria */}
      <div className="bg-white shadow-sm rounded-lg border p-4">
        <h3 className="font-medium text-gray-700 text-sm mb-3 flex items-center gap-2">
          <Target className="h-4 w-4" /> Acceptance Criteria
        </h3>

        {isEditingAcceptanceCriteria ? (
          <div className="space-y-2">
            <RichTextEditor
              value={editedAcceptanceCriteria}
              onChange={setEditedAcceptanceCriteria}
              placeholder="Start typing your acceptance criteria..."
              className=""
            />

            <div className="flex justify-end gap-2 mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => cancelEdit("acceptanceCriteria")}
              >
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSaveAcceptanceCriteria}>
                <Save className="h-4 w-4 mr-1" /> Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative group">
            {task.acceptanceInfo?.acceptanceCriteria ? (
              <div
                className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: task.acceptanceInfo.acceptanceCriteria,
                }}
              />
            ) : (
              <p className="text-sm text-gray-400 italic p-3 rounded-md border border-dashed">
                No acceptance criteria defined
              </p>
            )}
            {permissions.canEdit && (
              <button
                onClick={() => setIsEditingAcceptanceCriteria(true)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white rounded border shadow-sm"
              >
                <Edit className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-white shadow-sm rounded-lg border p-4">
        <h3 className="font-medium text-gray-700 text-sm mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-500" /> Timeline
        </h3>
        <div className="space-y-2">
          {isEditingStartDate ? (
            <div className="flex items-center gap-3 p-3 border rounded-md">
              <Calendar className="h-4 w-4 text-blue-500" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Start Date</p>
                <Input
                  type="date"
                  value={editedStartDate.split("T")[0]}
                  onChange={(e) => setEditedStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => cancelEdit("startDate")}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={handleSaveStartDate}>
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative group flex items-center gap-3 p-3 border rounded-md">
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
              {permissions.canEdit && (
                <button
                  onClick={() => setIsEditingStartDate(true)}
                  className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white rounded border shadow-sm"
                >
                  <Edit className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {task.endDate &&
            (isEditingEndDate ? (
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
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Due Date</p>
                  <Input
                    type="date"
                    value={editedEndDate ? editedEndDate.split("T")[0] : ""}
                    onChange={(e) => setEditedEndDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cancelEdit("endDate")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={handleSaveEndDate}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className={`relative group flex items-center gap-3 p-3 border rounded-md ${
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
                  {isOverdue && <p className="text-xs text-red-500">Overdue</p>}
                </div>
                {permissions.canEdit && (
                  <button
                    onClick={() => setIsEditingEndDate(true)}
                    className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white rounded border shadow-sm"
                  >
                    <Edit className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* People Section */}
      <div className="bg-white shadow-sm rounded-lg border p-4">
        <h3 className="font-medium text-gray-700 text-sm mb-3 flex items-center gap-2">
          <User className="h-4 w-4" /> People
        </h3>
        
        <div className="space-y-3">
          {/* Assigned To */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Assigned To</p>
            {isEditingAssignee ? (
              <div className="flex items-center gap-3 p-3 border rounded-md">
                {isLoadingUsers ? (
                  <Skeleton className="h-9 w-9 rounded-full" />
                ) : (
                  <User className="h-9 w-9 rounded-full bg-blue-100 p-2 text-blue-600" />
                )}
                <Select value={editedAssignee} onValueChange={setEditedAssignee}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cancelEdit("assignee")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={handleSaveAssignee}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative group">
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
                    {permissions.canEdit && (
                      <button
                        onClick={() => setIsEditingAssignee(true)}
                        className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white rounded border shadow-sm"
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="relative group flex items-center gap-3 p-3 border rounded-md">
                    <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <span className="text-sm text-gray-500">No assignee</span>
                    {permissions.canEdit && (
                      <button
                        onClick={() => setIsEditingAssignee(true)}
                        className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white rounded border shadow-sm"
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Created By */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Created By</p>
            <div className="flex items-center gap-3 p-3 border rounded-md bg-gray-50/50">
              {task.createdBy.avatar ? (
                <img
                  src={task.createdBy.avatar}
                  alt={task.createdBy.label}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
              )}
              <span className="text-sm text-gray-700">{task.createdBy.label}</span>
              <span className="text-xs text-gray-500 ml-auto">
                {new Date(task.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Completed By (if applicable) */}
          {task.completedBy && task.completedAt && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Completed By</p>
              <div className="flex items-center gap-3 p-3 border rounded-md bg-green-50/50">
                {task.completedBy.avatar ? (
                  <img
                    src={task.completedBy.avatar}
                    alt={task.completedBy.label}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-green-200 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                )}
                <span className="text-sm text-gray-700">{task.completedBy.label}</span>
                <span className="text-xs text-gray-500 ml-auto">
                  {new Date(task.completedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Discussion (like Jira) */}
      <DiscussionPanel
        taskId={taskId}
        users={users}
        canComment={Boolean(
          (permissions as any)?.canComment ?? permissions?.canEdit ?? true
        )}
      />

      {/* Attachments */}
      {task.documents && task.documents.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg border p-4">
          <h3 className="font-medium text-gray-700 text-sm mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Attachments
          </h3>
          <div className="space-y-2">
            {task.documents.map((document: Document) => (
              <div
                key={document.id}
                className="flex items-center justify-between p-3 border rounded-md"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {document.fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {document.fileType} • {formatSize(document.fileSize)}
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

      {/* Meta Info footer */}
      <div className="bg-white shadow-sm rounded-lg border p-3 text-xs text-gray-500 flex justify-between">
        <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
        <span>Updated: {new Date(task.updatedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}