import { 
  Edit, 
  FileText, 
  MessageSquare, 
  Paperclip, 
  Reply, 
  Save, 
  Smile, 
  Trash2, 
  User, 
  X, 
  Search 
} from "lucide-react";

import { 
  addTaskDiscussionComment, 
  addTaskDiscussionReply,
  AssignDropdown, 
  getTaskDiscussionComments,
  uploadDiscussionFile,
  uploadFileToS3,
  addTaskDiscussionReaction,
  removeTaskDiscussionReaction,
  verifyDiscussionFile,
  deleteDiscussion,
  TaskDiscussionReplyRequest
} from "@/app/services/data.service";
import { 
  CommentAttachment, 
  CommentItem, 
  formatFileSize, 
  timeAgo 
} from "@/hooks/Detail";

import { useCallback, useEffect, useRef, useState } from "react";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { MentionPopup } from "./MentionPopup";
import { Input } from "../ui/input";
import { Mention, TaskDiscussionComment, TaskDiscussionFilterResponse, TaskDiscussionReactionRequest } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";

// Helper function to get caret coordinates (keep as is)
function getCaretCoordinates(element: HTMLTextAreaElement, position: number) {
  const div = document.createElement('div');
  const style = getComputedStyle(element);
  
  div.style.position = 'absolute';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordWrap = 'break-word';
  div.style.top = '0';
  div.style.left = '0';
  div.style.visibility = 'hidden';
  div.style.width = style.width;
  div.style.height = style.height;
  div.style.padding = style.padding;
  div.style.border = style.border;
  div.style.font = style.font;
  div.style.lineHeight = style.lineHeight;
  
  document.body.appendChild(div);
  
  // Set text content up to the caret position
  const text = element.value.substring(0, position);
  div.textContent = text;
  
  if (text.endsWith('\n')) {
    div.appendChild(document.createElement('br'));
  }
  
  const span = document.createElement('span');
  span.textContent = element.value.substring(position) || '.';
  div.appendChild(span);
  
  const coordinates = {
    top: span.offsetTop + parseInt(style.borderTopWidth),
    left: span.offsetLeft + parseInt(style.borderLeftWidth),
  };
  
  document.body.removeChild(div);
  
  return coordinates;
}

export function DiscussionPanel({
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
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionedUsers, setMentionedUsers] = useState<AssignDropdown[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Add state for reply functionality
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  
  // Add search state
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [paginationMeta, setPaginationMeta] = useState({
    totalPages: 0,
    totalElements: 0,
    pageSize: 10,
    pageIndex: 0,
    numberOfElementsInThePage: 0,
  });

  // Use the toast hook
  const { toast } = useToast();

  const defaultReactions = ["LIKE", "HEART", "LAUGH", "CLAP"];
  const reactionEmojis: Record<string, string> = {
    "LIKE": "👍",
    "HEART": "❤️",
    "LAUGH": "😂",
    "CLAP": "👏"
  };
  
  const filteredUsers = users.filter((user: AssignDropdown) =>
    user.label.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Update the load function to include search and pagination
  const load = useCallback(async (search = "", page = 0, limit = 10, append = false) => {
    if (page === 0) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    
    try {
      const response: TaskDiscussionFilterResponse = await getTaskDiscussionComments(
        taskId,
        search,
        page,
        limit
      );
      
      if (response.isSuccess && response.data) {
        const formattedComments: CommentItem[] = response.data.content.map((comment: any) => ({
          id: comment.id.toString(),
          parentId: comment.parentId || null,
          author: {
            id: comment.author.id,
            name: comment.author.label,
            avatar: "",
          },
          content: comment.message,
          createdAt: comment.createdAt,
          isEdited: false, // API doesn't provide this field
          updatedAt: comment.createdAt, // Use createdAt as fallback
          attachments: comment.files ? comment.files.map((file: any) => ({
            id: file.id.toString(),
            fileName: file.fileName,
            fileSize: 0, // API doesn't provide file size
            url: "#", // API doesn't provide direct URL
          })) : [],
          reactions: comment.reactions ? comment.reactions.map((reaction: any) => ({
            emoji: reaction.reaction,
            count: 1, // API doesn't provide count, we'll handle this differently
            reacted: reaction.reactedBy !== null, // Check if current user reacted
          })) : [],
          mentions: comment.mentions ? comment.mentions.map((mention: any) => ({
            id: mention.mentioned.id,
            name: mention.mentioned.label,
          })) : [],
          replyCount: comment.replyCount || 0,
          isDeletable: comment.isDeletable || false,
        }));
        
        if (append) {
          setComments(prev => [...prev, ...formattedComments]);
        } else {
          setComments(formattedComments);
        }
        
        // Update pagination meta and check if there are more pages
        setPaginationMeta({
          totalPages: response.data.totalPages || 1,
          totalElements: response.data.totalElements || formattedComments.length,
          pageSize: response.data.pageSize || limit,
          pageIndex: response.data.pageIndex || page,
          numberOfElementsInThePage: response.data.numberOfElementsInThePage || formattedComments.length,
        });
        
        // Check if there are more pages to load
        setHasMore(page < (response.data.totalPages || 1) - 1);
      }
    } catch (e) {
      console.error("Error loading comments", e);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load comments",
      });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsSearching(false);
    }
  }, [taskId, toast]);

  // Initial load
  useEffect(() => {
    load();
  }, [load]);

  // Handle search
  const handleSearch = useCallback(() => {
    setIsSearching(true);
    load(searchTerm, 0, paginationMeta.pageSize);
  }, [searchTerm, load, paginationMeta.pageSize]);

  // Handle infinite scroll
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || isLoading || isLoadingMore || !hasMore) return;
    
    const container = scrollContainerRef.current;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    
    // Load more when scrolled to 80% of the container
    if (scrollTop + clientHeight >= scrollHeight * 0.8) {
      const nextPage = paginationMeta.pageIndex + 1;
      load(searchTerm, nextPage, paginationMeta.pageSize, true);
    }
  }, [isLoading, isLoadingMore, hasMore, searchTerm, load, paginationMeta]);

  // Add scroll event listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Handle textarea changes to detect @ mentions
  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setEditorValue(value);

    // Check for @ mentions
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf("@");

    if (
      lastAtSymbolIndex !== -1 &&
      (lastAtSymbolIndex === 0 ||
        textBeforeCursor[lastAtSymbolIndex - 1] === " " ||
        textBeforeCursor[lastAtSymbolIndex - 1] === "\n")
    ) {
      const query = textBeforeCursor.substring(lastAtSymbolIndex + 1);
      setMentionQuery(query);

      // Get textarea position for popup placement
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        const { top, left } = getCaretCoordinates(textarea, cursorPosition);
        setMentionPosition({
          top: top + textarea.offsetTop + 20,
          left: left + textarea.offsetLeft,
        });
      }

      setShowMentionPopup(true);
    } else {
      setShowMentionPopup(false);
    }
  };

  // Insert mention into textarea
  const handleMentionSelect = (user: AssignDropdown) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = editorValue.substring(0, cursorPosition);
    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtSymbolIndex !== -1) {
      const textBeforeAt = editorValue.substring(0, lastAtSymbolIndex);
      const textAfterCursor = editorValue.substring(cursorPosition);
      const newValue = `${textBeforeAt}@${user.label}${textAfterCursor}`;

      setEditorValue(newValue);
      setMentionedUsers((prev) => [...prev, user]);
      
      // Set cursor position after the mention
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = lastAtSymbolIndex + user.label.length + 1;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          textareaRef.current.focus();
        }
      }, 0);
    }

    setShowMentionPopup(false);
    setMentionQuery("");
  };

  // Handle file upload
  const uploadFile = async (file: File): Promise<CommentAttachment> => {
    try {
      // Step 1: Get presigned URL
      const uploadResponse = await uploadDiscussionFile(taskId, {
        message: editorValue,
        mentions: mentionedUsers.map(user => user.id),
        fileName: file.name,
        fileType: file.type
      });

      if (!uploadResponse.isSuccess) {
        throw new Error(uploadResponse.message);
      }

      // Step 2: Upload to S3
      await uploadFileToS3(
        uploadResponse.data.url,
        file,
        file.type
      );

      // Step 3: Verify file upload
      const verifyResponse = await verifyDiscussionFile(uploadResponse.data.docId);
      if (!verifyResponse.isSuccess) {
        throw new Error("File verification failed");
      }

      return {
        id: uploadResponse.data.docId.toString(),
        fileName: file.name,
        fileSize: file.size,
        url: uploadResponse.data.url.split('?')[0] // Remove query params for the download URL
      };
    } catch (error) {
      console.error("File upload failed:", error);
      throw error;
    }
  };

  // Handle posting with mentions and files
  const handlePost = async () => {
    if (!canComment) return;
    if (!editorValue?.trim() && pendingFiles.length === 0) return;
    
    setIsPosting(true);
    try {
      const mentionIds = mentionedUsers.map(user => user.id);
      
      // Upload files first
      const uploadedAttachments: CommentAttachment[] = [];
      for (const file of pendingFiles) {
        try {
          const attachment = await uploadFile(file);
          uploadedAttachments.push(attachment);
        } catch (error) {
          console.error(`Failed to upload file ${file.name}:`, error);
          toast({
            variant: "destructive",
            title: "Error",
            description: `Failed to upload file ${file.name}`,
          });
        }
      }

      const newComment: CommentItem = {
        id: `${Date.now()}`,
        parentId: null,
        author: { id: "me", name: "You" },
        content: editorValue || "",
        createdAt: new Date().toISOString(),
        isEdited: false,
        updatedAt: new Date().toISOString(),
        attachments: uploadedAttachments,
        reactions: [],
        mentions: mentionedUsers.map(user => ({
          id: user.id,
          name: user.label,
        })),
        replyCount: 0,
        isDeletable: true,
      };

      // Optimistic update
      setComments((prev) => [newComment, ...prev]);
      setEditorValue("");
      setPendingFiles([]);
      setMentionedUsers([]);

      // Post comment to backend
      await addTaskDiscussionComment(taskId, {
        message: editorValue,
        mentions: mentionIds,
      });

      toast({
        title: "Success",
        description: "Comment posted successfully",
      });
      
      // Reload comments to get the actual data from backend
      load(searchTerm, 0, paginationMeta.pageSize);

    } catch (e) {
      console.error("Error posting comment", e);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to post comment",
      });
    } finally {
      setIsPosting(false);
    }
  };

  // Handle reply functionality
  const handleReply = (commentId: string, authorName: string) => {
    setReplyingTo(commentId);
    setReplyContent(`@${authorName} `);
    // Focus on the reply textarea if it exists
    setTimeout(() => {
      const replyTextarea = document.getElementById(`reply-textarea-${commentId}`);
      if (replyTextarea) {
        (replyTextarea as HTMLTextAreaElement).focus();
      }
    }, 0);
  };

  const handleReplyPost = async (commentId: string) => {
    if (!replyContent.trim()) return;
    
    setIsReplying(true);
    try {
      // Post reply to backend using the specific reply endpoint
      const payload: TaskDiscussionReplyRequest = {
        message: replyContent,
        // Add any other required fields for reply
      };
      
      await addTaskDiscussionReply(commentId, payload);

      toast({
        title: "Success",
        description: "Reply posted successfully",
      });
      
      // Reset reply state
      setReplyingTo(null);
      setReplyContent("");
      
      // Reload comments to get the actual data from backend
      load(searchTerm, 0, paginationMeta.pageSize);
    } catch (e) {
      console.error("Error posting reply", e);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to post reply",
      });
    } finally {
      setIsReplying(false);
    }
  };

  const onFilesPicked = (files: FileList | null) => {
    if (!files) return;
    setPendingFiles((prev) => [...prev, ...Array.from(files)]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleReaction = async (commentId: string, reactionType: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    const existingReaction = comment.reactions?.find(r => r.emoji === reactionType);
    const hasReacted = existingReaction?.reacted;

    // Optimistic update
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        
        if (hasReacted) {
          // Remove reaction
          return {
            ...c,
            reactions: c.reactions!.filter(r => r.emoji !== reactionType)
          };
        } else {
          // Add reaction
          const newReaction = {
            emoji: reactionType,
            count: 1,
            reacted: true
          };
          return {
            ...c,
            reactions: [...(c.reactions || []), newReaction]
          };
        }
      })
    );

    try {
      if (hasReacted) {
        await removeTaskDiscussionReaction(commentId);
        toast({
          title: "Success",
          description: "Reaction removed",
        });
      } else {
        const payload: TaskDiscussionReactionRequest = { reactionType };
        await addTaskDiscussionReaction(commentId, payload);
        toast({
          title: "Success",
          description: "Reaction added",
        });
      }
    } catch (error) {
      console.error("Error toggling reaction:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update reaction",
      });
      // Revert optimistic update on error
      setComments((prev) =>
        prev.map((c) => {
          if (c.id !== commentId) return c;
          return comment; // Revert to original comment
        })
      );
    }
  };

  const onDelete = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    
    const oldComments = [...comments];
    
    // Optimistic update
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    
    try {
      const response = await deleteDiscussion(commentId);
      
      if (response.isSuccess) {
        toast({
          title: "Success",
          description: "Comment deleted successfully",
        });
      } else {
        throw new Error(response.message || "Failed to delete comment");
      }
    } catch (e: any) {
      console.error("Error deleting comment:", e);
      
      // Revert optimistic update on error
      setComments(oldComments);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message || "Failed to delete comment",
      });
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
          <span className="text-xs text-gray-500">({paginationMeta.totalElements})</span>
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

      {/* Search Bar */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search comments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-8"
          />
        </div>
        <Button 
          onClick={handleSearch} 
          disabled={isSearching}
          size="sm"
        >
          {isSearching ? "Searching..." : "Search"}
        </Button>
        {searchTerm && (
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchTerm("");
              load("", 0, paginationMeta.pageSize);
            }}
            size="sm"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Composer */}
      <div className="border rounded-md p-3 mb-4 bg-gray-50/60">
        {!canComment && (
          <div className="text-xs text-red-600 mb-2">
            You don't have permission to comment on this task.
          </div>
        )}
        <Textarea
          ref={textareaRef}
          value={editorValue}
          onChange={handleEditorChange}
          placeholder="Write a comment... Mention someone with @"
          className="min-h-[80px]"
          disabled={!canComment}
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => onFilesPicked(e.target.files)}
              disabled={!canComment}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-600"
              title="Attach files"
              disabled={!canComment}
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

      {showMentionPopup && (
        <MentionPopup
          users={filteredUsers}
          onSelect={handleMentionSelect}
          position={mentionPosition}
        />
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-md" />
          <Skeleton className="h-16 rounded-md" />
        </div>
      ) : list.length === 0 ? (
        <p className="text-sm text-gray-500 italic">
          {searchTerm ? "No matching comments found." : "No comments yet. Be the first to chime in."}
        </p>
      ) : (
        <>
          <div 
            ref={scrollContainerRef}
            className="space-y-3 max-h-[500px] overflow-y-auto"
          >
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
                        {c.content.split(/(@\w+)/g).map((part, i) => {
                          if (part.startsWith('@')) {
                            const username = part.substring(1);
                            const mentionedUser = c.mentions?.find(m => m.name === username);
                            if (mentionedUser) {
                              return (
                                <span key={i} className="bg-blue-100 text-blue-700 px-1 rounded">
                                  @{username}
                                </span>
                              );
                            }
                          }
                          return part;
                        })}
                      </div>

                      {/* Attachments */}
                      {c.attachments && c.attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {c.attachments.map((a) => (
                            <a
                              key={a.id}
                              href={a.url || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
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
                        {defaultReactions.map((reactionType) => {
                          const reaction = c.reactions?.find(
                            (r) => r.emoji === reactionType
                          );
                          const active = reaction?.reacted;
                          const count = reaction?.count || 0;
                          return (
                            <button
                              key={reactionType}
                              onClick={() => toggleReaction(c.id, reactionType)}
                              className={`text-xs border rounded-full px-2 py-0.5 ${
                                active
                                  ? "bg-blue-50 border-blue-200 text-blue-700"
                                  : "text-gray-600"
                              }`}
                              title={active ? "Remove reaction" : "Add reaction"}
                            >
                              <span className="mr-1">{reactionEmojis[reactionType]}</span>
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
                            onClick={() => handleReply(c.id, c.author.name)}
                            title="Reply"
                          >
                            <Reply className="h-3.5 w-3.5" />
                          </Button>
                          {c.isDeletable && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-gray-600 hover:text-red-600"
                              onClick={() => onDelete(c.id)}
                              title="Delete comment"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Reply section */}
                      {replyingTo === c.id && (
                        <div className="mt-3 border-t pt-3">
                          <Textarea
                            id={`reply-textarea-${c.id}`}
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Write your reply..."
                            className="min-h-[60px] mb-2"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyContent("");
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleReplyPost(c.id)}
                              disabled={!replyContent.trim() || isReplying}
                            >
                              {isReplying ? "Posting…" : "Post Reply"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            
            {/* Loading indicator for infinite scroll */}
            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            )}
            
            {/* No more comments to load indicator */}
            {!hasMore && comments.length > 0 && (
              <div className="text-center py-4 text-sm text-gray-500">
                No more comments to load
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}