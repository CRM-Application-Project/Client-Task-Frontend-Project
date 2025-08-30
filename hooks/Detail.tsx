export interface CommentAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  url?: string; // optional until uploaded
}

export interface Reaction {
  emoji: string; // "👍", "❤️", etc
  count: number;
  reacted?: boolean; // whether current user reacted
}

export interface CommentItem {
  id: string;
  parentId: string | null;
  author: { id: string; name: string; avatar?: string };
  content: string;
  replyCount: number;
  isDeletable: boolean;
  createdAt: string;
  attachments?: CommentAttachment[];
  reactions?: Reaction[];
  isEdited?: boolean;
  updatedAt?: string;
  mentions?: { id: string; name: string }[];
}


export function formatFileSize(bytes: number) {
  if (!bytes && bytes !== 0) return "";
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function timeAgo(iso: string) {
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