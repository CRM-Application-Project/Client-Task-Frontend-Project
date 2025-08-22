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
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Smile,
  Code,
  List,
  ListOrdered,
  Link,
  Image,
  Quote,
  Strikethrough,
  Subscript,
  Superscript,
  Type,
  MoreHorizontal
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTaskById, getDocumentDownloadUrl, updateTask, getAssignDropdown } from "@/app/services/data.service";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
  progress?: number;
  assignee: {
    id: string;
    label: string;
    avatar?: string;
  };
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

// Emoji categories for the picker
const emojiCategories = {
  "Frequently Used": ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😔", "😪"],
  "Gestures": ["👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👋", "🤚", "🖐️", "✋", "🖖", "👏", "🙌", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄", "💋"],
  "Symbols": ["✅", "❌", "⚡", "🛡️", "🎯", "🚀", "⭐", "🔥", "💡", "🔧", "📊", "📱", "💻", "🌟", "⚠️", "🎉", "📝", "🔍", "🎨", "🔒", "📈", "⏰", "🏆", "🎪", "💎", "🔑", "🎁", "🏅", "🎊", "💥", "✨", "🌈", "⭐", "🔮", "💫", "🌙", "☀️", "⭐", "🌟"],
  "Objects": ["📱", "💻", "🖥️", "⌨️", "🖱️", "🖨️", "📷", "📹", "🎥", "📞", "☎️", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🕹️", "💾", "💿", "📀", "💽", "💻", "📱", "☎️", "📞", "📟", "📠", "📺", "📻", "🎙️", "⏰", "⏲️", "⏱️", "🕰️", "📡", "🔋", "🔌", "💡", "🔦", "🕯️", "🧯", "🛢️"],
  "Activities": ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥽", "🥼", "🦺", "⛷️", "🏂", "🪂", "🏋️", "🤼", "🤸", "⛹️", "🤺", "🤾", "🏌️", "🏇", "🧘", "🏃", "🚶", "🧎", "🧍"]
};

export function TaskDetails({ taskId }: TaskDetailsProps) {
  const [task, setTask] = useState<TaskDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingAssignee, setIsEditingAssignee] = useState(false);
  const [isEditingStartDate, setIsEditingStartDate] = useState(false);
  const [isEditingEndDate, setIsEditingEndDate] = useState(false);
  const [isEditingAcceptanceCriteria, setIsEditingAcceptanceCriteria] = useState(false);
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
        // Convert HTML to plain text for editing
        setEditedAcceptanceCriteria(htmlToText(response.data.acceptanceInfo?.acceptanceCriteria || ""));
      } else {
        console.error("Failed to fetch task details:", response.message);
      }
    } catch (error) {
      console.error("Error fetching task details:", error);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

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

  // Helper function to convert HTML to plain text for editing
  const htmlToText = (html: string): string => {
  console.log('🔄 Converting HTML to Text:', html);
  
  if (!html) {
    console.log('❌ No HTML content to convert');
    return "";
  }
  
  let text = html;
  
  // Check if content is already in markdown format (no HTML tags)
  if (!html.includes('<') && !html.includes('>')) {
    console.log('✅ Content appears to already be in markdown format');
    return html;
  }
  
  // Enhanced conversion with better handling of nested formatting
  // Handle line breaks first to preserve structure
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
  
  // Handle headings
  text = text.replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (match, level, content) => {
    const hashes = '#'.repeat(parseInt(level));
    return `${hashes} ${content}\n`;
  });
  
  // Handle formatting tags with better regex to preserve nested content
  text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  text = text.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  text = text.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  text = text.replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~');
  text = text.replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~');
  text = text.replace(/<strike[^>]*>(.*?)<\/strike>/gi, '~~$1~~');
  text = text.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  
  // Handle blockquotes with better structure preservation
  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (match, content) => {
    const lines = content.split('\n').map((line: string) => line.trim() ? `> ${line}` : '>').join('\n');
    return lines;
  });
  
  // Handle lists with proper nesting and spacing
  text = text.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
    let counter = 1;
    const listItems = content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => {
      return `${counter++}. $1\n`;
    });
    return '\n' + listItems.trim() + '\n';
  });
  
  text = text.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
    const listItems = content.replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n');
    return '\n' + listItems.trim() + '\n';
  });
  
  // Handle standalone list items
  text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1');
  
  // Handle special HTML tags that should be preserved (underline, sup, sub)
  // These stay as HTML since markdown doesn't support them natively
  
  // Handle alignment divs - preserve them as HTML for now
  // text = text.replace(/<div style="text-align:\s*(left|center|right|justify)"[^>]*>(.*?)<\/div>/gi, '<div style="text-align: $1">$2</div>');
  
  // Handle center tags
  // text = text.replace(/<center[^>]*>(.*?)<\/center>/gi, '<center>$1</center>');
  
  // Clean up paragraph tags
  text = text.replace(/<p[^>]*>/gi, '');
  text = text.replace(/<\/p>/gi, '\n');
  
  // Clean up div tags (except alignment ones) - be more careful
  text = text.replace(/<div(?![^>]*text-align)[^>]*>/gi, '');
  text = text.replace(/<\/div>/gi, '');
  
  // Remove any other HTML tags we haven't specifically handled
  // But preserve underline, superscript, subscript, and alignment tags
  text = text.replace(/<(?!\/?(?:u|sup|sub|center|div\s+style="text-align))[^>]+>/gi, '');
  
  // Clean up excessive whitespace and line breaks
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n'); // Multiple line breaks to double
  text = text.replace(/^\s+|\s+$/g, ''); // Trim start and end
  text = text.replace(/[ \t]+/g, ' '); // Multiple spaces to single space
  
  console.log('✅ Final converted Text:', text);
  return text;
};

// Also replace the textToHtml function with this enhanced version

const textToHtml = (text: string): string => {
  console.log('🔄 Converting Text to HTML:', text);
  
  if (!text) {
    console.log('❌ No text content to convert');
    return "";
  }
  
  let html = text;
  
  // Convert markdown formatting to HTML with better handling
  // Handle line breaks first to preserve structure
  html = html.replace(/\n/g, '<br>');
  
  // Handle headings
  html = html.replace(/^(#{1,6})\s+(.*$)/gm, (match, hashes, content) => {
    const level = hashes.length;
    return `<h${level}>${content}</h${level}>`;
  });
  
  // Handle formatting tags with better regex to preserve nested content
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>'); // Italic (not part of bold)
  html = html.replace(/~~(.*?)~~/g, '<del>$1</del>'); // Strikethrough
  html = html.replace(/`(.*?)`/g, '<code>$1</code>'); // Code
  
  // Handle blockquotes
  html = html.replace(/^>\s*(.*$)/gm, '<blockquote>$1</blockquote>');
  
  // Handle lists with better structure
  const lines = html.split('<br>');
  let inOrderedList = false;
  let inUnorderedList = false;
  let result = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const orderedMatch = line.match(/^(\d+)\.\s+(.*)/);
    const unorderedMatch = line.match(/^[•*-]\s+(.*)/);
    
    if (orderedMatch) {
      if (!inOrderedList) {
        if (inUnorderedList) {
          result.push('</ul>');
          inUnorderedList = false;
        }
        result.push('<ol>');
        inOrderedList = true;
      }
      result.push(`<li>${orderedMatch[2]}</li>`);
    } else if (unorderedMatch) {
      if (!inUnorderedList) {
        if (inOrderedList) {
          result.push('</ol>');
          inOrderedList = false;
        }
        result.push('<ul>');
        inUnorderedList = true;
      }
      result.push(`<li>${unorderedMatch[1]}</li>`);
    } else {
      if (inOrderedList) {
        result.push('</ol>');
        inOrderedList = false;
      }
      if (inUnorderedList) {
        result.push('</ul>');
        inUnorderedList = false;
      }
      result.push(line);
    }
  }
  
  // Close any remaining lists
  if (inOrderedList) result.push('</ol>');
  if (inUnorderedList) result.push('</ul>');
  
  html = result.join('<br>');
  
  // Clean up excessive <br> tags
  html = html.replace(/(<br>){3,}/g, '<br><br>');
  
  console.log('✅ Final converted HTML:', html);
  return html;
};
  // Helper function to convert plain text to HTML


  const handleSaveDescription = async () => {
    try {
      const response = await updateTask(taskId, { description: editedDescription });
      if (response.isSuccess) {
        setTask(prev => prev ? {...prev, description: editedDescription} : null);
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
        const selectedUser = users.find(user => user.id === editedAssignee);
        setTask(prev => prev ? {
          ...prev, 
          assignee: selectedUser ? {
            id: selectedUser.id,
            label: selectedUser.label,
            avatar: prev.assignee?.avatar
          } : prev.assignee
        } : null);
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

      const response = await updateTask(taskId, { startDate: formattedDateTime });
      if (response.isSuccess) {
        setTask(prev => prev ? {...prev, startDate: formattedDateTime} : null);
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
        setTask(prev => prev ? {...prev, endDate: formattedDateTime} : null);
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
      // Convert the text to HTML before sending
      const htmlAcceptanceCriteria = textToHtml(editedAcceptanceCriteria);
      
      const response = await updateTask(taskId, { 
        acceptanceCriteria: htmlAcceptanceCriteria
      });
      if (response.isSuccess) {
        setTask(prev => prev ? {
          ...prev, 
          acceptanceInfo: { acceptanceCriteria: htmlAcceptanceCriteria }
        } : null);
        setIsEditingAcceptanceCriteria(false);
      } else {
        console.error("Failed to update acceptance criteria:", response.message);
      }
    } catch (error) {
      console.error("Error updating acceptance criteria:", error);
    }
  };

  const cancelEdit = (field: string) => {
    switch (field) {
      case 'description':
        setEditedDescription(task?.description || "");
        setIsEditingDescription(false);
        break;
      case 'assignee':
        setEditedAssignee(task?.assignee?.id || "");
        setIsEditingAssignee(false);
        break;
      case 'startDate':
        setEditedStartDate(task?.startDate || "");
        setIsEditingStartDate(false);
        break;
      case 'endDate':
        setEditedEndDate(task?.endDate || "");
        setIsEditingEndDate(false);
        break;
      case 'acceptanceCriteria':
        setEditedAcceptanceCriteria(htmlToText(task?.acceptanceInfo?.acceptanceCriteria || ""));
        setIsEditingAcceptanceCriteria(false);
        setShowEmojiPicker(false);
        break;
    }
  };

  // Formatting functions for acceptance criteria
  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = editedAcceptanceCriteria || "";
    
    const newText = currentText.substring(0, start) + text + currentText.substring(end);
    
    setEditedAcceptanceCriteria(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const wrapSelectedText = (prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = editedAcceptanceCriteria || "";
    const selectedText = currentText.substring(start, end);
    
    if (selectedText) {
      const wrappedText = prefix + selectedText + suffix;
      const newText = currentText.substring(0, start) + wrappedText + currentText.substring(end);
      setEditedAcceptanceCriteria(newText);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + wrappedText.length);
      }, 0);
    } else {
      insertAtCursor(prefix + suffix);
      setTimeout(() => {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length);
      }, 0);
    }
  };

  const formatBold = () => wrapSelectedText("**", "**");
  const formatItalic = () => wrapSelectedText("*", "*");
  const formatUnderline = () => wrapSelectedText("<u>", "</u>");
  const formatStrikethrough = () => wrapSelectedText("~~", "~~");
  const formatCode = () => wrapSelectedText("`", "`");
  const formatQuote = () => insertAtCursor("> ");
  
  const insertNumberedList = () => insertAtCursor("\n1. ");
  const insertBulletList = () => insertAtCursor("\n• ");
  
  const insertAlignment = (alignment: 'left' | 'center' | 'right' | 'justify') => {
    const alignTags = {
      left: '<div style="text-align: left;">',
      center: '<center>',
      right: '<div style="text-align: right;">',
      justify: '<div style="text-align: justify;">'
    };
    const closeTags = {
      left: '</div>',
      center: '</center>',
      right: '</div>',
      justify: '</div>'
    };
    wrapSelectedText(alignTags[alignment], closeTags[alignment]);
  };

  const insertEmoji = (emoji: string) => {
    insertAtCursor(emoji);
    setShowEmojiPicker(false);
  };

  const insertLink = () => {
    wrapSelectedText("[", "](url)");
  };

  const insertSuperscript = () => wrapSelectedText("<sup>", "</sup>");
  const insertSubscript = () => wrapSelectedText("<sub>", "</sub>");

  const priorityColors = {
    LOW: "bg-green-100 text-green-700",
    MEDIUM: "bg-blue-100 text-blue-700",
    HIGH: "bg-amber-100 text-amber-700",
    URGENT: "bg-red-100 text-red-700",
  } as const;

  const priorityIcons = {
    LOW: <CheckCircle className="h-4 w-4" />,
    MEDIUM: <Clock className="h-4 w-4" />,
    HIGH: <AlertCircle className="h-4 w-4" />,
    URGENT: <AlertCircle className="h-4 w-4" />,
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

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
      {/* Task Overview */}
      <div className="flex justify-between items-start mb-3">
        <h2 className="text-xl font-semibold text-gray-900">
          Task Details
        </h2>
      </div>
      
      {/* Task Overview Card */}
      <div className="bg-white shadow-sm rounded-lg border p-4">
        <div className="flex justify-between items-start mb-3">
          <h1 className="text-base font-semibold text-gray-900">
            {task.subject}
          </h1>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <Badge className={`${priorityColors[task.priority]} flex items-center gap-1`}>
            {priorityIcons[task.priority]} {task.priority}
          </Badge>
          <Badge variant="outline">{task.taskStageName}</Badge>
          {isOverdue && <Badge variant="destructive">Overdue</Badge>}
        </div>

        {task.progress !== undefined && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1">Progress</p>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${task.progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{task.progress}%</p>
          </div>
        )}

        {isEditingDescription ? (
          <div className="mb-3">
            <Textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              className="w-full"
              rows={3}
            />
            <div className="flex justify-end gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={() => cancelEdit('description')}>
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
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                {task.description}
              </p>
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

      {/* Enhanced Acceptance Criteria Section */}
      <div className="bg-white shadow-sm rounded-lg border p-4">
        <h3 className="font-medium text-gray-700 text-sm mb-3 flex items-center gap-2">
          <Target className="h-4 w-4" /> Acceptance Criteria
        </h3>
        
        {isEditingAcceptanceCriteria ? (
          <div className="space-y-2">
            {/* Comprehensive Formatting Toolbar */}
            <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-t-md">
              {/* Text Formatting Group */}
              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={formatBold}
                  className="h-8 w-8 p-0 hover:bg-gray-200"
                  title="Bold"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={formatItalic}
                  className="h-8 w-8 p-0 hover:bg-gray-200"
                  title="Italic"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={formatUnderline}
                  className="h-8 w-8 p-0 hover:bg-gray-200"
                  title="Underline"
                >
                  <Underline className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={formatStrikethrough}
                  className="h-8 w-8 p-0 hover:bg-gray-200"
                  title="Strikethrough"
                >
                  <Strikethrough className="h-4 w-4" />
                </Button>
              </div>

              <div className="w-px h-6 bg-gray-300 mx-1" />

              {/* Alignment Group */}
              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertAlignment('left')}
                  className="h-8 w-8 p-0 hover:bg-gray-200"
                  title="Align Left"
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertAlignment('center')}
                  className="h-8 w-8 p-0 hover:bg-gray-200"
                  title="Align Center"
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertAlignment('right')}
                  className="h-8 w-8 p-0 hover:bg-gray-200"
                  title="Align Right"
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertAlignment('justify')}
                  className="h-8 w-8 p-0 hover:bg-gray-200"
                  title="Justify"
                >
                  <AlignJustify className="h-4 w-4" />
                </Button>
              </div>

              <div className="w-px h-6 bg-gray-300 mx-1" />

              {/* Advanced Formatting */}
              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={insertSuperscript}
                  className="h-8 w-8 p-0 hover:bg-gray-200"
                  title="Superscript"
                >
                  <Superscript className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={insertSubscript}
                  className="h-8 w-8 p-0 hover:bg-gray-200"
                  title="Subscript"
                >
                  <Subscript className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={formatCode}
                  className="h-8 w-8 p-0 hover:bg-gray-200"
                  title="Code"
                >
                  <Code className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={formatQuote}
                  className="h-8 w-8 p-0 hover:bg-gray-200"
                  title="Quote"
                >
                  <Quote className="h-4 w-4" />
                </Button>
              </div>

              <div className="w-px h-6 bg-gray-300 mx-1" />

              {/* Lists Group */}
              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={insertBulletList}
                  className="h-8 w-8 p-0 hover:bg-gray-200"
                  title="Bullet List"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={insertNumberedList}
                  className="h-8 w-8 p-0 hover:bg-gray-200"
                  title="Numbered List"
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
              </div>

              <div className="w-px h-6 bg-gray-300 mx-1" />

              {/* Media & Links */}
              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={insertLink}
                  className="h-8 w-8 p-0 hover:bg-gray-200"
                  title="Insert Link"
                >
                  <Link className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertAtCursor("![image](url)")}
                  className="h-8 w-8 p-0 hover:bg-gray-200"
                  title="Insert Image"
                >
                  <Image className="h-4 w-4" />
                </Button>
              </div>

              <div className="w-px h-6 bg-gray-300 mx-1" />

              {/* Emoji Picker */}
              <div className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="h-8 w-8 p-0 hover:bg-gray-200"
                  title="Insert Emoji"
                >
                  <Smile className="h-4 w-4" />
                </Button>
                
                {showEmojiPicker && (
                  <div className="absolute top-10 left-0 z-20 bg-white border border-gray-200 rounded-md shadow-lg w-80 max-h-64 overflow-y-auto">
                    {Object.entries(emojiCategories).map(([category, emojis]) => (
                      <div key={category} className="p-2">
                        <div className="text-xs font-medium text-gray-600 mb-1 sticky top-0 bg-white">
                          {category}
                        </div>
                        <div className="grid grid-cols-10 gap-1">
                          {emojis.map((emoji, index) => (
                            <button
                              key={`${category}-${index}`}
                              type="button"
                              className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded text-sm"
                              onClick={() => insertEmoji(emoji)}
                              title={emoji}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-px h-6 bg-gray-300 mx-1" />

              {/* Additional Tools */}
              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertAtCursor("# ")}
                  className="h-8 w-8 p-0 hover:bg-gray-200"
                  title="Heading"
                >
                  <Type className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertAtCursor("---\n")}
                  className="h-8 w-8 p-0 hover:bg-gray-200"
                  title="Horizontal Rule"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Text Area */}
            <Textarea
              ref={textareaRef}
              value={editedAcceptanceCriteria}
              onChange={(e) => setEditedAcceptanceCriteria(e.target.value)}
              placeholder="Start typing your acceptance criteria..."
              rows={10}
              className="resize-none border border-t-0 border-gray-300 focus:ring-0 focus:outline-none rounded-b-none font-mono text-sm p-4"
            />

            {/* Support Text */}
            <div className="px-4 py-2 bg-gray-50 border border-t-0 border-gray-300 text-xs text-gray-600 rounded-b-md">
              We support markdown, you can convert this field.
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={() => cancelEdit('acceptanceCriteria')}>
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
                dangerouslySetInnerHTML={{ __html: task.acceptanceInfo.acceptanceCriteria }}
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
          <Calendar className="h-4 w-4" /> Timeline
        </h3>
        <div className="space-y-2">
          {isEditingStartDate ? (
            <div className="flex items-center gap-3 p-3 border rounded-md">
              <Calendar className="h-4 w-4 text-blue-500" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Start Date</p>
                <Input
                  type="date"
                  value={editedStartDate.split('T')[0]}
                  onChange={(e) => setEditedStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => cancelEdit('startDate')}>
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

          {task.endDate && (
            isEditingEndDate ? (
              <div className={`flex items-center gap-3 p-3 border rounded-md ${isOverdue ? "border-red-200" : ""}`}>
                <Calendar className={`h-4 w-4 ${isOverdue ? "text-red-500" : "text-gray-500"}`} />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Due Date</p>
                  <Input
                    type="date"
                    value={editedEndDate ? editedEndDate.split('T')[0] : ''}
                    onChange={(e) => setEditedEndDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => cancelEdit('endDate')}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={handleSaveEndDate}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className={`relative group flex items-center gap-3 p-3 border rounded-md ${isOverdue ? "border-red-200" : ""}`}>
                <Calendar className={`h-4 w-4 ${isOverdue ? "text-red-500" : "text-gray-500"}`} />
                <div>
                  <p className="text-xs text-gray-500">Due Date</p>
                  <p className={`text-sm font-medium ${isOverdue ? "text-red-600" : "text-gray-900"}`}>
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
            )
          )}
        </div>
      </div>

      {/* Assignee */}
      <div className="bg-white shadow-sm rounded-lg border p-4">
        <h3 className="font-medium text-gray-700 text-sm mb-3 flex items-center gap-2">
          <User className="h-4 w-4" /> Assigned To
        </h3>
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
              <Button size="sm" variant="outline" onClick={() => cancelEdit('assignee')}>
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

      {/* Attachments */}
      {task.documents && task.documents.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg border p-4">
          <h3 className="font-medium text-gray-700 text-sm mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Attachments
          </h3>
          <div className="space-y-2">
            {task.documents.map((document) => (
              <div
                key={document.id}
                className="flex items-center justify-between p-3 border rounded-md"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {document.fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {document.fileType} • {formatFileSize(document.fileSize)}
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

      {/* Meta Info */}
      <div className="bg-white shadow-sm rounded-lg border p-3 text-xs text-gray-500 flex justify-between">
        <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
        <span>Updated: {new Date(task.updatedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}