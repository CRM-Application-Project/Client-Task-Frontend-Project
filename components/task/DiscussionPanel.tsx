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
  Search,
  Download
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
  TaskDiscussionReplyRequest,
  getDiscussionFileDownloadLink,
  GetDiscussionFileDownloadLinkResponse
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
import { BASE_URL } from "@/app/http-common";

// Helper function to get caret coordinates
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

// Helper function to check if file is an image
function isImageFile(fileName: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
}

// Helper function to find mention boundaries
function findMentionBoundaries(text: string, cursorPosition: number) {
  const textBeforeCursor = text.substring(0, cursorPosition);
  const lastAtSymbolIndex = textBeforeCursor.lastIndexOf("@");

  if (lastAtSymbolIndex === -1) return null;

  // Check if @ is at start or preceded by whitespace
  const charBeforeAt = lastAtSymbolIndex > 0 ? textBeforeCursor[lastAtSymbolIndex - 1] : null;
  const isValidMentionStart = charBeforeAt === null || charBeforeAt === " " || charBeforeAt === "\n";

  if (!isValidMentionStart) return null;

  // Find the end of the mention (space, newline, or end of string)
  const textAfterAt = text.substring(lastAtSymbolIndex + 1);
  const endMatch = textAfterAt.match(/[\s\n]/);
  const mentionEnd = endMatch ? lastAtSymbolIndex + 1 + endMatch.index! : text.length;

  // Only show popup if cursor is within the mention
  if (cursorPosition > mentionEnd) return null;

  const query = text.substring(lastAtSymbolIndex + 1, cursorPosition);

  return {
    start: lastAtSymbolIndex,
    end: mentionEnd,
    query: query
  };
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
  const [expandedReplies, setExpandedReplies] = useState<string[]>([]);
  const [repliesData, setRepliesData] = useState<Record<string, CommentItem[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<string[]>([]);

  const [replyMentionQuery, setReplyMentionQuery] = useState("");
  const [replyMentionedUsers, setReplyMentionedUsers] = useState<AssignDropdown[]>([]);
  const [showReplyMentionPopup, setShowReplyMentionPopup] = useState(false);
  const [replyMentionPosition, setReplyMentionPosition] = useState({ top: 0, left: 0 });
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Add state for downloading files
  const [downloadingFiles, setDownloadingFiles] = useState<string[]>([]);

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

  const filteredReplyUsers = users.filter((user: AssignDropdown) =>
    user.label.toLowerCase().includes(replyMentionQuery.toLowerCase())
  );

  // Fixed reply change handler with improved mention detection
  const handleReplyChange = (e: React.ChangeEvent<HTMLTextAreaElement>, commentId: string) => {
    const value = e.target.value;
    setReplyContent(value);

    const cursorPosition = e.target.selectionStart;
    const mentionBoundaries = findMentionBoundaries(value, cursorPosition);

    if (mentionBoundaries) {
      setReplyMentionQuery(mentionBoundaries.query);

      if (e.target) {
        const textarea = e.target;
        const { top, left } = getCaretCoordinates(textarea, cursorPosition);
        setReplyMentionPosition({
          top: top + textarea.offsetTop + 20,
          left: left + textarea.offsetLeft,
        });
      }

      setShowReplyMentionPopup(true);
    } else {
      setShowReplyMentionPopup(false);
      setReplyMentionQuery("");
    }
  };

  const handleReplyMentionSelect = (user: AssignDropdown) => {
    if (!replyTextareaRef.current) return;

    const textarea = replyTextareaRef.current;
    const cursorPosition = textarea.selectionStart;
    const mentionBoundaries = findMentionBoundaries(replyContent, cursorPosition);

    if (mentionBoundaries) {
      const textBeforeAt = replyContent.substring(0, mentionBoundaries.start);
      const textAfterMention = replyContent.substring(mentionBoundaries.end);
      const newValue = `${textBeforeAt}@${user.label} ${textAfterMention}`;

      setReplyContent(newValue);
      setReplyMentionedUsers((prev) => [...prev, user]);

      setTimeout(() => {
        if (replyTextareaRef.current) {
          const newCursorPos = mentionBoundaries.start + user.label.length + 2; // +2 for @ and space
          replyTextareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          replyTextareaRef.current.focus();
        }
      }, 0);
    }

    setShowReplyMentionPopup(false);
    setReplyMentionQuery("");
  };

  // Load main comments function
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
        const formattedComments: CommentItem[] = response.data.content.map((comment: any) => {
          // Debug logging
          console.log('Raw comment from API:', comment);

          return {
            id: comment.id.toString(),
            parentId: comment.parentId || null,
            author: {
              id: comment.author.id,
              name: comment.author.label,
              avatar: "",
            },
            content: comment.message,
            createdAt: comment.createdAt,
            isEdited: false,
            updatedAt: comment.createdAt,
            attachments: comment.files ? comment.files.map((file: any) => ({
              id: file.id.toString(),
              fileName: file.fileName,
              fileSize: 0,
              url: "#",
            })) : [],
            reactions: comment.reactions ? comment.reactions.map((reaction: any) => ({
              emoji: reaction.reaction,
              count: 1,
              reacted: reaction.reactedBy !== null,
            })) : [],
            mentions: comment.mentions ? comment.mentions.map((mention: any) => ({
              id: mention.mentioned.id,
              name: mention.mentioned.label,
            })) : [],
            replyCount: comment.replyCount || 0,
            isDeletable: comment.isDeletable !== false, // Default to true unless explicitly false
          };
        });

        if (append) {
          setComments(prev => [...prev, ...formattedComments]);
        } else {
          setComments(formattedComments);
        }

        setPaginationMeta({
          totalPages: response.data.totalPages || 1,
          totalElements: response.data.totalElements || formattedComments.length,
          pageSize: response.data.pageSize || limit,
          pageIndex: response.data.pageIndex || page,
          numberOfElementsInThePage: response.data.numberOfElementsInThePage || formattedComments.length,
        });

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

  // Updated function to create a filter URL with parentId
  const getFilterUrlWithParentId = (taskId: number, parentId: string) => {
    return `${BASE_URL}/task/discussion/filter?taskId=${taskId}&parentId=${parentId}`;
  };

  // Fixed loadReplies function to properly fetch replies using parentId
  const loadReplies = useCallback(async (commentId: string) => {
    setLoadingReplies(prev => [...prev, commentId]);

    try {
      // Make a direct fetch call to the filter endpoint with parentId
      const response = await fetch(getFilterUrlWithParentId(taskId, commentId), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add your authentication headers here if needed
        },
        credentials: 'include', // This will include cookies
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: TaskDiscussionFilterResponse = await response.json();

      if (data.isSuccess && data.data) {
        const formattedReplies: CommentItem[] = data.data.content.map((reply: any) => ({
          id: reply.id.toString(),
          parentId: reply.parentId || commentId,
          author: {
            id: reply.author.id,
            name: reply.author.label,
            avatar: "",
          },
          content: reply.message,
          createdAt: reply.createdAt,
          isEdited: false,
          updatedAt: reply.createdAt,
          attachments: reply.files ? reply.files.map((file: any) => ({
            id: file.id.toString(),
            fileName: file.fileName,
            fileSize: 0,
            url: "#",
          })) : [],
          reactions: reply.reactions ? reply.reactions.map((reaction: any) => ({
            emoji: reaction.reaction,
            count: 1,
            reacted: reaction.reactedBy !== null,
          })) : [],
          mentions: reply.mentions ? reply.mentions.map((mention: any) => ({
            id: mention.mentioned.id,
            name: mention.mentioned.label,
          })) : [],
          replyCount: reply.replyCount || 0,
          isDeletable: reply.isDeletable !== false, // Default to true unless explicitly false
        }));

        setRepliesData(prev => ({
          ...prev,
          [commentId]: formattedReplies
        }));
      }
    } catch (e) {
      console.error("Error loading replies", e);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load replies",
      });
    } finally {
      setLoadingReplies(prev => prev.filter(id => id !== commentId));
    }
  }, [taskId, toast]);

  // Toggle replies visibility
  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const isExpanded = prev.includes(commentId);
      if (isExpanded) {
        return prev.filter(id => id !== commentId);
      } else {
        // Load replies if not already loaded
        if (!repliesData[commentId]) {
          loadReplies(commentId);
        }
        return [...prev, commentId];
      }
    });
  };

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

    if (scrollTop + clientHeight >= scrollHeight * 0.8) {
      const nextPage = paginationMeta.pageIndex + 1;
      load(searchTerm, nextPage, paginationMeta.pageSize, true);
    }
  }, [isLoading, isLoadingMore, hasMore, searchTerm, load, paginationMeta]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Fixed main editor change handler with improved mention detection
  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setEditorValue(value);

    const cursorPosition = e.target.selectionStart;
    const mentionBoundaries = findMentionBoundaries(value, cursorPosition);

    if (mentionBoundaries) {
      setMentionQuery(mentionBoundaries.query);

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
      setMentionQuery("");
    }
  };

  // Fixed main mention select handler
  const handleMentionSelect = (user: AssignDropdown) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const cursorPosition = textarea.selectionStart;
    const mentionBoundaries = findMentionBoundaries(editorValue, cursorPosition);

    if (mentionBoundaries) {
      const textBeforeAt = editorValue.substring(0, mentionBoundaries.start);
      const textAfterMention = editorValue.substring(mentionBoundaries.end);
      const newValue = `${textBeforeAt}@${user.label} ${textAfterMention}`;

      setEditorValue(newValue);
      setMentionedUsers((prev) => [...prev, user]);

      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = mentionBoundaries.start + user.label.length + 2; // +2 for @ and space
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
      const uploadResponse = await uploadDiscussionFile(taskId, {
        message: editorValue,
        mentions: mentionedUsers.map(user => user.id),
        fileName: file.name,
        fileType: file.type
      });

      if (!uploadResponse.isSuccess) {
        throw new Error(uploadResponse.message);
      }

      await uploadFileToS3(
        uploadResponse.data.url,
        file,
        file.type
      );

      const verifyResponse = await verifyDiscussionFile(uploadResponse.data.docId);
      if (!verifyResponse.isSuccess) {
        throw new Error("File verification failed");
      }

      return {
        id: uploadResponse.data.docId.toString(),
        fileName: file.name,
        fileSize: file.size,
        url: uploadResponse.data.url.split('?')[0]
      };
    } catch (error) {
      console.error("File upload failed:", error);
      throw error;
    }
  };

  // Handle file download
  const handleFileDownload = async (fileId: string, fileName: string) => {
    setDownloadingFiles(prev => [...prev, fileId]);

    try {
      const response: GetDiscussionFileDownloadLinkResponse = await getDiscussionFileDownloadLink(fileId);

      if (response.isSuccess && response.data) {
        // For images and other files, force download instead of opening in new tab
        try {
          // Fetch the file as a blob
          const fileResponse = await fetch(response.data.url, {
            method: 'GET',
            headers: {
              'Accept': '*/*',
            },
          });

          if (!fileResponse.ok) {
            throw new Error('Failed to fetch file');
          }

          const blob = await fileResponse.blob();

          // Create blob URL and trigger download
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName;
          link.style.display = 'none';

          // Add to DOM, click, and remove
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Clean up blob URL after a short delay
          setTimeout(() => {
            window.URL.revokeObjectURL(blobUrl);
          }, 100);

          toast({
            title: "Success",
            description: `${fileName} downloaded successfully`,
          });
        } catch (fetchError) {
          console.warn('Blob download failed, falling back to direct link:', fetchError);
          // Fallback: try direct download with proper attributes
          const link = document.createElement('a');
          link.href = response.data.url;
          link.download = fileName;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.style.display = 'none';

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          toast({
            title: "Download Started",
            description: `${fileName} download initiated`,
          });
        }
      } else {
        throw new Error(response.message || "Failed to get download link");
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to download ${fileName}`,
      });
    } finally {
      setDownloadingFiles(prev => prev.filter(id => id !== fileId));
    }
  };

  // Fixed handlePost function - send original message
  const handlePost = async () => {
    if (!canComment) return;
    if (!editorValue?.trim() && pendingFiles.length === 0) return;

    setIsPosting(true);
    try {
      const mentionIds = mentionedUsers.map(user => user.id);
      const messageToSend = editorValue; // Send original message with @mentions

      // Debug logs
      console.log('Posting message:', messageToSend);
      console.log('Posting mentions:', mentionIds);
      console.log('Mentioned users:', mentionedUsers);

      // Create optimistic comment for UI
      const newComment: CommentItem = {
        id: `temp_${Date.now()}`,
        parentId: null,
        author: { id: "me", name: "You" },
        content: messageToSend,
        createdAt: new Date().toISOString(),
        isEdited: false,
        updatedAt: new Date().toISOString(),
        attachments: [],
        reactions: [],
        mentions: mentionedUsers.map(user => ({
          id: user.id,
          name: user.label,
        })),
        replyCount: 0,
        isDeletable: true,
      };

      setComments((prev) => [newComment, ...prev]);

      let commentResponse;

      if (pendingFiles.length > 0) {
        // If files are present, use the file upload API that also handles the comment
        const file = pendingFiles[0];

        try {
          const uploadResponse = await uploadDiscussionFile(taskId, {
            message: messageToSend,
            mentions: mentionIds,
            fileName: file.name,
            fileType: file.type
          });

          if (!uploadResponse.isSuccess) {
            throw new Error(uploadResponse.message);
          }

          await uploadFileToS3(
            uploadResponse.data.url,
            file,
            file.type
          );

          const verifyResponse = await verifyDiscussionFile(uploadResponse.data.docId);
          if (!verifyResponse.isSuccess) {
            throw new Error("File verification failed");
          }

          // The comment is created through the file upload process
          commentResponse = uploadResponse;

          // Update optimistic comment with uploaded file
          setComments((prev) =>
            prev.map(c =>
              c.id === newComment.id
                ? {
                  ...c,
                  attachments: [
                    {
                      id: uploadResponse.data.docId.toString(),
                      fileName: file.name,
                      fileSize: file.size,
                      url: uploadResponse.data.url.split('?')[0]
                    }
                  ]
                }
                : c
            )
          );

        } catch (error) {
          console.error(`Failed to upload file ${file.name}:`, error);
          toast({
            variant: "destructive",
            title: "Error",
            description: `Failed to upload file ${file.name}`,
          });
          throw error;
        }

      } else {
        // If no files, use the regular comment API
        commentResponse = await addTaskDiscussionComment(taskId, {
          message: messageToSend, // Send original message with @mentions
          mentions: mentionIds,
        });
      }

      if (!commentResponse.isSuccess) {
        throw new Error(commentResponse.message || "Failed to post comment");
      }

      setEditorValue("");
      setPendingFiles([]);
      setMentionedUsers([]);

      toast({
        title: "Success",
        description: "Comment posted successfully",
      });

      await load(searchTerm, 0, paginationMeta.pageSize);

    } catch (e: any) {
      console.error("Error posting comment", e);
      setComments((prev) => prev.filter(c => !c.id.startsWith('temp_')));
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message || "Failed to post comment",
      });
    } finally {
      setIsPosting(false);
    }
  };

  // Handle reply functionality
  const handleReply = (commentId: string, authorName: string) => {
    setReplyingTo(commentId);
    setReplyContent(`@${authorName} `);
    setTimeout(() => {
      const replyTextarea = document.getElementById(`reply-textarea-${commentId}`);
      if (replyTextarea) {
        (replyTextarea as HTMLTextAreaElement).focus();
      }
    }, 0);
  };

  // Fixed reply post handler - send original message
  const handleReplyPost = async (commentId: string) => {
    if (!replyContent.trim()) return;

    setIsReplying(true);
    try {
      const messageToSend = replyContent; // Send original message with @mentions

      // Debug logs
      console.log('Posting reply message:', messageToSend);
      console.log('Posting reply mentions:', replyMentionedUsers.map(user => user.id));

      const payload = {
        message: messageToSend,
        mentions: replyMentionedUsers.map(user => user.id),
      };

      await addTaskDiscussionReply(commentId, payload);

      toast({
        title: "Success",
        description: "Reply posted successfully",
      });

      // Reset reply state
      setReplyingTo(null);
      setReplyContent("");
      setReplyMentionedUsers([]);

      // Reload replies for this comment
      await loadReplies(commentId);

      // Update the parent comment's reply count
      setComments((prev: CommentItem[]) =>
        prev.map((c: CommentItem) =>
          c.id === commentId
            ? { ...c, replyCount: (c.replyCount || 0) + 1 }
            : c
        )
      );

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
    const comment = comments.find(c => c.id === commentId) ||
      Object.values(repliesData).flat().find(r => r.id === commentId);
    if (!comment) return;

    // Check if user already has a reaction (any type)
    const userHasExistingReaction = comment.reactions?.some((r: any) => r.reacted);
    const existingReactionType = comment.reactions?.find((r: any) => r.reacted)?.emoji;
    const isSameReaction = existingReactionType === reactionType;

    // Optimistic update for main comments
    setComments((prev: CommentItem[]) =>
      prev.map((c: CommentItem) => {
        if (c.id !== commentId) return c;

        // If clicking the same reaction, remove it
        if (isSameReaction) {
          return {
            ...c,
            reactions: c.reactions!.filter((r: any) => r.emoji !== reactionType)
          };
        }
        // If user has a different reaction, replace it
        else if (userHasExistingReaction) {
          return {
            ...c,
            reactions: [
              // Remove any existing user reaction
              ...c.reactions!.filter((r: any) => !r.reacted),
              // Add the new reaction
              {
                emoji: reactionType,
                count: 1,
                reacted: true
              }
            ]
          };
        }
        // If no existing reaction, add new one
        else {
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

    // Optimistic update for replies
    setRepliesData(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(parentId => {
        updated[parentId] = updated[parentId].map(reply => {
          if (reply.id !== commentId) return reply;

          // Same logic as above for replies
          if (isSameReaction) {
            return {
              ...reply,
              reactions: reply.reactions!.filter((r: any) => r.emoji !== reactionType)
            };
          } else if (userHasExistingReaction) {
            return {
              ...reply,
              reactions: [
                ...reply.reactions!.filter((r: any) => !r.reacted),
                {
                  emoji: reactionType,
                  count: 1,
                  reacted: true
                }
              ]
            };
          } else {
            const newReaction = {
              emoji: reactionType,
              count: 1,
              reacted: true
            };
            return {
              ...reply,
              reactions: [...(reply.reactions || []), newReaction]
            };
          }
        });
      });
      return updated;
    });

    try {
      // First remove any existing reaction if user has one
      if (userHasExistingReaction) {
        await removeTaskDiscussionReaction(commentId);
      }

      // Then add the new reaction if it's not the same as the existing one
      if (!isSameReaction) {
        const payload: TaskDiscussionReactionRequest = { reactionType };
        await addTaskDiscussionReaction(commentId, payload);
      }

      toast({
        title: "Success",
        description: isSameReaction ? "Reaction removed" : "Reaction added",
      });
    } catch (error) {
      console.error("Error toggling reaction:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update reaction",
      });
      // Note: You might want to revert the optimistic update here
      // by storing the previous state and restoring it on error
    }
  };

  const onDelete = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    const oldComments = [...comments];
    const oldRepliesData = { ...repliesData };

    // Optimistic update - remove from main comments
    setComments((prev: CommentItem[]) => prev.filter((c: CommentItem) => c.id !== commentId));

    // Optimistic update - remove from replies
    setRepliesData(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(parentId => {
        updated[parentId] = updated[parentId].filter(reply => reply.id !== commentId);
      });
      return updated;
    });

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
      setRepliesData(oldRepliesData);

      toast({
        variant: "destructive",
        title: "Error",
        description: e.message || "Failed to delete comment",
      });
    }
  };

  const renderAttachment = (attachment: CommentAttachment) => {
    const isImage = isImageFile(attachment.fileName);
    const isDownloading = downloadingFiles.includes(attachment.id);

    return (
      <div
        key={attachment.id}
        className="inline-flex items-center gap-2 text-xs border rounded-lg px-3 py-2 bg-white hover:bg-gray-50 transition-colors shadow-sm"
      >
        <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
        <div className="flex flex-col min-w-0">
          <span
            className="truncate max-w-[140px] font-medium text-gray-700"
            title={attachment.fileName}
          >
            {attachment.fileName}
          </span>
          {!isImage && (
            <span className="text-gray-400 text-xs">
              {formatFileSize(attachment.fileSize)}
            </span>
          )}
        </div>
        <button
          onClick={() => handleFileDownload(attachment.id, attachment.fileName)}
          disabled={isDownloading}
          className="text-gray-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed p-1 rounded hover:bg-gray-100 transition-colors"
          title={`Download ${attachment.fileName}`}
        >
          {isDownloading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
          ) : (
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          )}
        </button>
      </div>
    );
  };

  // Render comment component (reusable for both main comments and replies)
  const renderComment = (comment: CommentItem, isReply = false, depth = 0) => {
    const canReplyToThis = !isReply || depth < 2; // Allow replies to replies but limit depth

    return (
      <div key={comment.id} className={isReply ? "ml-4" : ""}>
        <div className="flex items-start gap-3">
          {comment.author.avatar ? (
            <img
              src={comment.author.avatar}
              alt={comment.author.name}
              className={`${isReply ? "h-6 w-6" : "h-8 w-8"} rounded-full object-cover`}
            />
          ) : (
            <div className={`${isReply ? "h-6 w-6" : "h-8 w-8"} rounded-full ${isReply ? "bg-green-100" : "bg-blue-100"} flex items-center justify-center`}>
              <User className={`${isReply ? "h-3 w-3 text-green-600" : "h-4 w-4 text-blue-600"}`} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-medium text-gray-900 text-sm">
                {comment.author.name}
              </span>
              <span>•</span>
              <span title={new Date(comment.createdAt).toLocaleString()}>
                {timeAgo(comment.createdAt)}
              </span>
              {comment.isEdited && <span className="italic">(edited)</span>}
            </div>

            {/* Plain text content */}
            <div className="text-gray-700 mt-1 whitespace-pre-wrap">
              {(() => {
                // If no mentions, just return the content as is
                if (!comment.mentions || comment.mentions.length === 0) {
                  return comment.content;
                }

                let processedContent = comment.content;

                // Replace each mention with highlighted version
                comment.mentions.forEach((mention) => {
                  // Escape special regex characters in the mention name
                  const escapedName = mention.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  const mentionPattern = new RegExp(`@${escapedName}(?=\\s|$)`, 'gi');

                  processedContent = processedContent.replace(mentionPattern, (match) => {
                    return `<span class="bg-blue-100 text-blue-700 px-1 rounded">@${mention.name}</span>`;
                  });
                });

                return (
                  <span dangerouslySetInnerHTML={{ __html: processedContent }} />
                );
              })()}
            </div>

            {/* Attachments */}
            {comment.attachments && comment.attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {comment.attachments.map((attachment) => renderAttachment(attachment))}
              </div>
            )}

            {/* Reactions */}
            <div className="mt-2 flex items-center gap-2">
              {defaultReactions.map((reactionType) => {
                const reaction = comment.reactions?.find(
                  (r: any) => r.emoji === reactionType
                );
                const active = reaction?.reacted;
                const count = reaction?.count || 0;
                return (
                  <button
                    key={reactionType}
                    onClick={() => toggleReaction(comment.id, reactionType)}
                    className={`text-xs border rounded-full px-2 py-0.5 ${active
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
                {/* Show replies button if there are replies and it's not a reply itself */}
                {!isReply && comment.replyCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-blue-600 hover:text-blue-700"
                    onClick={() => toggleReplies(comment.id)}
                    title={expandedReplies.includes(comment.id) ? "Hide replies" : "Show replies"}
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1" />
                    {expandedReplies.includes(comment.id) ? "Hide" : "Show"} {comment.replyCount} {comment.replyCount === 1 ? "reply" : "replies"}
                  </Button>
                )}
                {canReplyToThis && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-gray-600"
                    onClick={() => handleReply(comment.id, comment.author.name)}
                    title="Reply"
                  >
                    <Reply className="h-3.5 w-3.5" />
                  </Button>
                )}
                {comment.isDeletable && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-gray-600 hover:text-red-600"
                    onClick={() => onDelete(comment.id)}
                    title="Delete comment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Replies section for main comments */}
            {!isReply && expandedReplies.includes(comment.id) && (
              <div className="mt-3 border-l-2 border-gray-200 pl-4">
                {loadingReplies.includes(comment.id) ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 rounded-md" />
                    <Skeleton className="h-12 rounded-md" />
                  </div>
                ) : repliesData[comment.id] && repliesData[comment.id].length > 0 ? (
                  <div className="space-y-3">
                    {repliesData[comment.id].map((reply) => renderComment(reply, true, 1))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic">
                    No replies yet.
                  </div>
                )}
              </div>
            )}

            {/* Reply section - simplified without file uploads */}
            {replyingTo === comment.id && (
              <div className="mt-3 border-t pt-3">
                <div className="relative">
                  <Textarea
                    ref={replyTextareaRef}
                    id={`reply-textarea-${comment.id}`}
                    value={replyContent}
                    onChange={(e) => handleReplyChange(e, comment.id)}
                    placeholder="Write your reply... Mention someone with @"
                    className="min-h-[60px] mb-2"
                  />

                  {/* Reply mention popup */}
                  {showReplyMentionPopup && (
                    <MentionPopup
                      users={filteredReplyUsers}
                      onSelect={handleReplyMentionSelect}
                      position={replyMentionPosition}
                    />
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent("");
                      setReplyMentionedUsers([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-brand-primary hover:bg-brand-primary/80"
                    onClick={() => handleReplyPost(comment.id)}
                    disabled={!replyContent.trim() || isReplying}
                  >
                    {isReplying ? "Posting…" : "Post Reply"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
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
              className={`px-2 py-1 text-xs ${sort === "newest" ? "bg-gray-50 text-gray-900" : "text-gray-600"
                }`}
              onClick={() => setSort("newest")}
            >
              Newest
            </button>
            <button
              className={`px-2 py-1 text-xs border-l ${sort === "oldest" ? "bg-gray-50 text-gray-900" : "text-gray-600"
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
            {`You don't have permission to comment on this task.`}
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
              className="bg-brand-primary hover:bg-brand-primary/80"
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
              {list.map((comment) => (
                <li key={comment.id} className="border rounded-md p-3">
                  {renderComment(comment)}
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