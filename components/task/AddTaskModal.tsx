"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { X, Calendar, ChevronDown, Check, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Smile, Code, List, ListOrdered, Link, Image, Quote, Strikethrough, Subscript, Superscript, Palette, Type, MoreHorizontal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import { useToast } from "@/hooks/use-toast";
import { getTaskStagesDropdown, User } from "@/app/services/data.service";
import { TaskStage } from "@/lib/data";

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: CreateTaskRequest | Partial<UpdateTaskRequest>, isEdit: boolean) => void;
  editingTask?: GetTaskByIdResponse["data"];
  preSelectedStageId?: number | null;
  users: User[];
}

interface CreateTaskRequest {
  subject: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  taskStageId: number;
  startDate: string;
  endDate: string;
  assignee: string;
  acceptanceCriteria?: string;
}

interface UpdateTaskRequest {
  subject?: string;
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  taskStageId?: number;
  startDate?: string;
  endDate?: string;
  assignee?: string;
  acceptanceCriteria?: string;
}

interface GetTaskByIdResponse {
  data: {
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
    assignee: {
      id: string;
      label: string;
    };
    acceptanceCriteria?: string;
  };
}

export const AddTaskModal = ({
  isOpen,
  onClose,
  onSubmit,
  editingTask,
  preSelectedStageId,
  users,
}: AddTaskModalProps) => {
  const [stages, setStages] = useState<TaskStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [formData, setFormData] = useState<CreateTaskRequest>({
    subject: "",
    description: "",
    priority: "LOW",
    taskStageId: 0,
    startDate: new Date().toISOString(),
    endDate: "",
    assignee: "",
    acceptanceCriteria: "",
  });

  // Track original values for comparison
  const [originalFormData, setOriginalFormData] = useState<CreateTaskRequest | null>(null);
  
  // Track which fields have been modified
  const [dirtyFields, setDirtyFields] = useState<Set<keyof CreateTaskRequest>>(new Set());

  const priorities: Array<CreateTaskRequest["priority"]> = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "URGENT",
  ];

  // Default acceptance criteria template with bold formatting
  const getDefaultAcceptanceCriteria = () => {
    return `**Given** the user is on the login page
**When** they enter valid credentials
**Then** they should be redirected to the dashboard

**Given** the user submits invalid data
**When** the form is processed
**Then** appropriate error messages should be displayed

**Acceptance Criteria:**
• **Performance**: Page should load within 2 seconds
• **Security**: All inputs must be validated
• **Accessibility**: Form should be keyboard navigable
• **Browser Support**: Must work on Chrome, Firefox, and Safari`;
  };

  // Comprehensive emoji collection
  const emojiCategories = {
    "Frequently Used": ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😔", "😪"],
    "Gestures": ["👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👋", "🤚", "🖐️", "✋", "🖖", "👏", "🙌", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄", "💋"],
    "Symbols": ["✅", "❌", "⚡", "🛡️", "🎯", "🚀", "⭐", "🔥", "💡", "🔧", "📊", "📱", "💻", "🌟", "⚠️", "🎉", "📝", "🔍", "🎨", "🔒", "📈", "⏰", "🏆", "🎪", "💎", "🔑", "🎁", "🏅", "🎊", "💥", "✨", "🌈", "⭐", "🔮", "💫", "🌙", "☀️", "⭐", "🌟"],
    "Objects": ["📱", "💻", "🖥️", "⌨️", "🖱️", "🖨️", "📷", "📹", "🎥", "📞", "☎️", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🕹️", "💾", "💿", "📀", "💽", "💻", "📱", "☎️", "📞", "📟", "📠", "📺", "📻", "🎙️", "⏰", "⏲️", "⏱️", "🕰️", "📡", "🔋", "🔌", "💡", "🔦", "🕯️", "🧯", "🛢️"],
    "Activities": ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥽", "🥼", "🦺", "⛷️", "🏂", "🪂", "🏋️", "🤼", "🤸", "⛹️", "🤺", "🤾", "🏌️", "🏇", "🧘", "🏃", "🚶", "🧎", "🧍"]
  };

const hasPreSelectedStage = useMemo(() => {
    return !editingTask && preSelectedStageId && preSelectedStageId > 0;
  }, [editingTask, preSelectedStageId]);

  // Enhanced HTML to Markdown conversion that preserves formatting exactly
 const convertHtmlToMarkdown = (html: string): string => {
    console.log('🔄 Converting HTML to Markdown:', html);
    
    if (!html) {
      console.log('❌ No HTML content to convert');
      return "";
    }
    
    let markdown = html;
    
    // Check if content is already in markdown format (no HTML tags)
    if (!html.includes('<') && !html.includes('>')) {
      console.log('✅ Content appears to already be in markdown format');
      return html;
    }
    
    // Enhanced conversion with better handling of nested formatting
    // Handle line breaks first to preserve structure
    markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
    markdown = markdown.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
    
    // Handle headings
    markdown = markdown.replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (match, level, content) => {
      const hashes = '#'.repeat(parseInt(level));
      return `${hashes} ${content}\n`;
    });
    
    // Handle formatting tags with better regex to preserve nested content
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
    markdown = markdown.replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~');
    markdown = markdown.replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~');
    markdown = markdown.replace(/<strike[^>]*>(.*?)<\/strike>/gi, '~~$1~~');
    markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    
    // Handle blockquotes with better structure preservation
    markdown = markdown.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (match, content) => {
      // Fix: Add explicit type annotation for the line parameter
      const lines = content.split('\n').map((line: string) => line.trim() ? `> ${line}` : '>').join('\n');
      return lines;
    });
    
    // Handle lists with proper nesting and spacing
    markdown = markdown.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
      let counter = 1;
      const listItems = content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => {
        return `${counter++}. $1\n`;
      });
      return '\n' + listItems.trim() + '\n';
    });
    
    markdown = markdown.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
      const listItems = content.replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n');
      return '\n' + listItems.trim() + '\n';
    });
    
    // Handle standalone list items
    markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1');
    
    // Handle special HTML tags that should be preserved (underline, sup, sub)
    // These stay as HTML since markdown doesn't support them natively
    
    // Handle alignment divs - preserve them as HTML
    // markdown = markdown.replace(/<div style="text-align:\s*(left|center|right|justify)"[^>]*>(.*?)<\/div>/gi, '<div style="text-align: $1">$2</div>');
    
    // Handle center tags
    // markdown = markdown.replace(/<center[^>]*>(.*?)<\/center>/gi, '<center>$1</center>');
    
    // Clean up paragraph tags
    markdown = markdown.replace(/<p[^>]*>/gi, '');
    markdown = markdown.replace(/<\/p>/gi, '\n');
    
    // Clean up div tags (except alignment ones)
    markdown = markdown.replace(/<div(?![^>]*text-align)[^>]*>/gi, '');
    markdown = markdown.replace(/<\/div>(?![^<]*<\/div>)/gi, '');
    
    // Remove any other HTML tags we haven't specifically handled
    // But preserve underline, superscript, subscript, and alignment tags
    markdown = markdown.replace(/<(?!\/?(?:u|sup|sub|center|div\s+style="text-align))[^>]+>/gi, '');
    
    // Clean up excessive whitespace and line breaks
    markdown = markdown.replace(/\n\s*\n\s*\n/g, '\n\n'); // Multiple line breaks to double
    markdown = markdown.replace(/^\s+|\s+$/g, ''); // Trim start and end
    markdown = markdown.replace(/[ \t]+/g, ' '); // Multiple spaces to single space
    
    console.log('✅ Final converted Markdown:', markdown);
    return markdown;
  };

  // Helper function to compare values (handles dates properly)
  const areValuesEqual = (original: any, current: any): boolean => {
    if (original === current) return true;
    
    // Handle date comparison
    if (original instanceof Date && typeof current === 'string') {
      return original.toISOString() === current;
    }
    if (typeof original === 'string' && current instanceof Date) {
      return original === current.toISOString();
    }
    
    // Handle null/undefined/empty string equivalence
    const normalizeEmpty = (val: any) => val === null || val === undefined || val === '' ? '' : val;
    return normalizeEmpty(original) === normalizeEmpty(current);
  };

  // Function to update form data and track dirty fields
  const updateFormField = (field: keyof CreateTaskRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (originalFormData && editingTask) {
      const originalValue = originalFormData[field];
      const newDirtyFields = new Set(dirtyFields);
      
      if (areValuesEqual(originalValue, value)) {
        // Value matches original, remove from dirty fields
        newDirtyFields.delete(field);
      } else {
        // Value is different from original, add to dirty fields
        newDirtyFields.add(field);
      }
      
      setDirtyFields(newDirtyFields);
    }
  };

  // Enhanced markdown to HTML conversion
  const convertToHtml = (text: string): string => {
    if (!text) return "";
    
    let html = text;
    
    // Convert markdown formatting to HTML with better handling
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>'); // Italic (not part of bold)
    html = html.replace(/~~(.*?)~~/g, '<del>$1</del>'); // Strikethrough
    html = html.replace(/`(.*?)`/g, '<code>$1</code>'); // Code
    
    // Convert quotes
    html = html.replace(/^>\s*(.*$)/gm, '<blockquote>$1</blockquote>');
    
    // Convert headings
    html = html.replace(/^(#{1,6})\s+(.*$)/gm, (match, hashes, content) => {
      const level = hashes.length;
      return `<h${level}>${content}</h${level}>`;
    });
    
    // Convert lists with better structure
    const lines = html.split('\n');
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
    
    html = result.join('\n');
    
    // Convert line breaks
    html = html.replace(/\n/g, '<br>');
    
    return html;
  };

  // Helper function to get local ISO string without timezone conversion
  const getLocalISOString = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  // Helper function to add minutes to current time and round up to next 5-minute interval
  const getAdjustedCurrentTime = (): Date => {
    const now = new Date();
    const currentMinutes = now.getMinutes();
    const currentSeconds = now.getSeconds();
    
    if (currentSeconds > 0) {
      now.setMinutes(currentMinutes + 1);
    }
    
    const minutesToAdd = 5 - (now.getMinutes() % 5);
    if (minutesToAdd < 5) {
      now.setMinutes(now.getMinutes() + minutesToAdd);
    } else {
      now.setMinutes(now.getMinutes() + 5);
    }
    
    now.setSeconds(0);
    now.setMilliseconds(0);
    
    return now;
  };

  // MAIN EFFECT: Reset and initialize form when modal opens/closes or when key props change
  useEffect(() => {
    console.log('🚀 Main effect triggered:', {
      isOpen,
      editingTaskId: editingTask?.id,
      preSelectedStageId,
      acceptanceCriteria: editingTask?.acceptanceCriteria
    });
    
    if (!isOpen) {
      // Reset everything when modal closes
      console.log('🔄 Modal closed - resetting form');
      setOriginalFormData(null);
      setDirtyFields(new Set());
      return;
    }

    // Initialize form data when modal opens
    if (editingTask) {
      // EDIT MODE: Initialize with existing task data
      console.log('📝 Edit mode - setting up form with existing data');
      console.log('Original acceptance criteria from API:', editingTask.acceptanceCriteria);
      
      // Convert HTML back to markdown for editing - with enhanced conversion
      const convertedAcceptanceCriteria = convertHtmlToMarkdown(editingTask.acceptanceCriteria || "");
      
      const initialData = {
        subject: editingTask.subject || "",
        description: editingTask.description || "",
        priority: editingTask.priority || "LOW",
        taskStageId: editingTask.taskStageId || 0,
        startDate: editingTask.startDate || new Date().toISOString(),
        endDate: editingTask.endDate || "",
        assignee: editingTask.assignee?.id || "",
        acceptanceCriteria: convertedAcceptanceCriteria,
      };
      
      console.log('✅ Final form data for edit:', initialData);
      console.log('📋 Acceptance criteria set to:', initialData.acceptanceCriteria);
      
      setFormData(initialData);
      setOriginalFormData(initialData);
      setDirtyFields(new Set());
    } else {
      // NEW TASK MODE: Initialize with defaults and pre-selected stage + prefilled acceptance criteria
      console.log('➕ New task mode - setting up form with defaults and prefilled acceptance criteria');
      const adjustedTime = getAdjustedCurrentTime();
      const newTaskData = {
        subject: "",
        description: "",
        priority: "LOW" as const,
        taskStageId: preSelectedStageId || 0,
        startDate: getLocalISOString(adjustedTime),
        endDate: "",
        assignee: "",
        acceptanceCriteria: getDefaultAcceptanceCriteria(), // Prefill with default template
      };
      
      console.log('✅ New task data with prefilled acceptance criteria:', newTaskData);
      setFormData(newTaskData);
      setOriginalFormData(null);
      setDirtyFields(new Set());
    }
  }, [isOpen, editingTask, preSelectedStageId]);

  // Fetch stages when modal opens
  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return;
      
      try {
        setIsLoading(true);
        const stagesRes = await getTaskStagesDropdown();

        if (stagesRes?.isSuccess && stagesRes.data) {
          setStages(stagesRes.data);
          console.log('Stages loaded:', stagesRes.data);
        } else {
          console.error("Failed to fetch stages:", stagesRes?.message);
          toast({
            title: "Error",
            description: "Failed to load stages. Please try again later.",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description:
            error?.message || "Failed to load data. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isOpen, toast]);

  // Formatting functions for acceptance criteria
  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = formData.acceptanceCriteria || "";
    
    const newText = currentText.substring(0, start) + text + currentText.substring(end);
    
    updateFormField('acceptanceCriteria', newText);
    
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
    const currentText = formData.acceptanceCriteria || "";
    const selectedText = currentText.substring(start, end);
    
    if (selectedText) {
      const wrappedText = prefix + selectedText + suffix;
      const newText = currentText.substring(0, start) + wrappedText + currentText.substring(end);
      updateFormField('acceptanceCriteria', newText);
      
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.subject?.trim()) {
      toast({
        title: "Validation Error",
        description: "Subject is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.description?.trim()) {
      toast({
        title: "Validation Error", 
        description: "Description is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.taskStageId || formData.taskStageId === 0) {
      toast({
        title: "Validation Error",
        description: "Please select a stage",
        variant: "destructive",
      });
      return;
    }

    if (!formData.assignee?.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select an assignee",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingTask) {
        // For editing, only send changed fields
        if (dirtyFields.size === 0) {
          toast({
            title: "No Changes",
            description: "No changes were made to the task.",
            variant: "default",
          });
          onClose();
          return;
        }

        const updatePayload: Partial<UpdateTaskRequest> = {};
        
        // Only include fields that have been modified
        dirtyFields.forEach(field => {
          if (field === 'endDate' && formData[field] === '') {
            // Handle empty endDate specially - send null or don't send at all
            (updatePayload as any)[field] = null;
          } else if (field === 'acceptanceCriteria') {
            // Convert acceptance criteria to HTML before sending
            updatePayload[field] = convertToHtml(formData[field] || "");
          } else {
            (updatePayload as any)[field] = formData[field];
          }
        });

        console.log('Update payload (only dirty fields):', updatePayload);
        console.log('Dirty fields:', Array.from(dirtyFields));
        
        onSubmit(updatePayload, true);
      } else {
        // For new tasks, send all required fields with HTML conversion for acceptance criteria
        const submitData = {
          ...formData,
          acceptanceCriteria: convertToHtml(formData.acceptanceCriteria || "")
        };
        
        console.log('Submitting new task:', submitData);
        onSubmit(submitData, false);
      }
      
      onClose();
    } catch (error) {
      console.error("Error submitting task:", error);
      toast({
        title: "Error",
        description: "Failed to save task. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Updated handleDateChange function
  const handleDateChange = (value: string, field: 'startDate' | 'endDate') => {
    try {
      if (!value) {
        updateFormField(field, "");
        return;
      }
      
      if (field === 'startDate') {
        const selectedDate = new Date(value);
        const today = new Date();
        
        const isToday = 
          selectedDate.getDate() === today.getDate() &&
          selectedDate.getMonth() === today.getMonth() &&
          selectedDate.getFullYear() === today.getFullYear();
        
        if (isToday) {
          const adjustedTime = getAdjustedCurrentTime();
          const finalDate = new Date(selectedDate);
          finalDate.setHours(adjustedTime.getHours());
          finalDate.setMinutes(adjustedTime.getMinutes());
          finalDate.setSeconds(0);
          finalDate.setMilliseconds(0);
          
          const localISOTime = getLocalISOString(finalDate);
          updateFormField(field, localISOTime);
        } else {
          selectedDate.setHours(9, 0, 0, 0);
          const localISOTime = getLocalISOString(selectedDate);
          updateFormField(field, localISOTime);
        }
      } else {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          console.error("Invalid date:", value);
          return;
        }
        
        date.setHours(23, 59, 59, 0);
        const localISOTime = getLocalISOString(date);
        updateFormField(field, localISOTime);
      }
    } catch (error) {
      console.error("Error handling date change:", error);
    }
  };

  // Updated formatDateForInput function
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    try {
      let date: Date;
      
      if (dateString.includes('T')) {
        if (!dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('-', 10)) {
          const [datePart, timePart] = dateString.split('T');
          const [year, month, day] = datePart.split('-').map(Number);
          const [hour, minute, second] = timePart.split(':').map(Number);
          date = new Date(year, month - 1, day, hour, minute, second || 0);
        } else {
          date = new Date(dateString);
        }
      } else {
        const [year, month, day] = dateString.split('-').map(Number);
        date = new Date(year, month - 1, day);
      }
      
      if (isNaN(date.getTime())) return "";
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  // Get the name of the pre-selected stage for display
  const getPreSelectedStageName = () => {
    if (preSelectedStageId && stages.length > 0) {
      const selectedStage = stages.find(stage => stage.id === preSelectedStageId);
      return selectedStage?.name;
    }
    return null;
  };

  if (!isOpen) return null;

  console.log('RENDER - formData.taskStageId:', formData.taskStageId, 'preSelectedStageId:', preSelectedStageId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            {editingTask ? "Edit Task" : "Add Task"}
            {!editingTask ? (
              <p className="text-xs text-[#636363] mt-1">
                Create a new task for your team
                {preSelectedStageId && getPreSelectedStageName() && (
                  <span className="text-blue-600 ml-1">
                  {`• Adding to "${getPreSelectedStageName()}" stage`}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-xs text-[#636363] mt-1">
                Edit the task details
                {dirtyFields.size > 0 && (
                  <span className="text-blue-600 ml-1">
                    • {dirtyFields.size} field{dirtyFields.size !== 1 ? 's' : ''} modified
                  </span>
                )}
              </p>
            )}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 border border-gray-200 p-4 rounded-lg"
        >
          {/* Subject */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold mb-2">Task Details</h3>
            <Label
              htmlFor="subject"
              className="text-sm font-medium text-foreground"
            >
              Subject: *
              {dirtyFields.has('subject') && (
                <span className="text-blue-600 text-xs ml-1">• Modified</span>
              )}
            </Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => updateFormField('subject', e.target.value)}
              placeholder="Enter Subject"
              required
              className="w-full"
            />
          </div>

          {/* Row 1: Priority and Stage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Priority: *
                {dirtyFields.has('priority') && (
                  <span className="text-blue-600 text-xs ml-1">• Modified</span>
                )}
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  updateFormField('priority', value as typeof formData.priority)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Stage: *
                {dirtyFields.has('taskStageId') && (
                  <span className="text-blue-600 text-xs ml-1">• Modified</span>
                )}
              </Label>
              {hasPreSelectedStage ? (
                // Display locked stage when pre-selected
                <div className="flex items-center gap-2 p-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
                 
                  <span className="text-sm">
                    {stages.find(stage => stage.id === preSelectedStageId)?.name || "Selected Stage"}
                  </span>
                  <input
                    type="hidden"
                    value={preSelectedStageId || ""}
                    onChange={(e) => updateFormField('taskStageId', parseInt(e.target.value))}
                  />
                </div>
              ) : (
                // Normal stage selection when not pre-selected
                <Select
                  value={formData.taskStageId?.toString() || ""}
                  onValueChange={(value) => {
                    const numValue = parseInt(value, 10);
                    if (!isNaN(numValue)) {
                      console.log('Stage selection changed to:', numValue);
                      updateFormField('taskStageId', numValue);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id.toString()}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Start Date: *
                {dirtyFields.has('startDate') && (
                  <span className="text-blue-600 text-xs ml-1">• Modified</span>
                )}
              </Label>
              <Input
                type="date"
                value={formatDateForInput(formData.startDate)}
                onChange={(e) => handleDateChange(e.target.value, 'startDate')}
                className="w-full"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                End Date (Optional):
                {dirtyFields.has('endDate') && (
                  <span className="text-blue-600 text-xs ml-1">• Modified</span>
                )}
              </Label>
              <Input
                type="date"
                value={formatDateForInput(formData.endDate)}
                onChange={(e) => handleDateChange(e.target.value, 'endDate')}
                className="w-full"
              />
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Assignee: *
              {dirtyFields.has('assignee') && (
                <span className="text-blue-600 text-xs ml-1">• Modified</span>
              )}
            </Label>
            <Select
              value={formData.assignee}
              onValueChange={(value) => updateFormField('assignee', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                {users && users.length > 0 ? (
                  users.map((user) => (
                    <SelectItem key={user.userId} value={user.userId}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>
                    No users available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Description: *
              {dirtyFields.has('description') && (
                <span className="text-blue-600 text-xs ml-1">• Modified</span>
              )}
            </Label>
            <Textarea
              value={formData.description}
              onChange={(e) => updateFormField('description', e.target.value)}
              placeholder="Enter Description"
              rows={4}
              className="resize-none"
              required
            />
          </div>

          {/* Enhanced Acceptance Criteria - Reference UI Style */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground text-blue-600">
              Acceptance Criteria
              {dirtyFields.has('acceptanceCriteria') && (
                <span className="text-blue-600 text-xs ml-1">• Modified</span>
              )}
            </Label>
            
            <div className="border border-gray-300 rounded-md bg-white">
              {/* Comprehensive Formatting Toolbar */}
              <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-gray-100 border-b">
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
                value={formData.acceptanceCriteria || ""}
                onChange={(e) => {
                  console.log('📝 Acceptance criteria changed to:', e.target.value);
                  updateFormField('acceptanceCriteria', e.target.value);
                }}
                placeholder="Start typing your acceptance criteria..."
                rows={10}
                className="resize-none border-0 focus:ring-0 focus:outline-none rounded-none font-mono text-sm p-4"
              />

              {/* Support Text */}
              <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-600 rounded-b-md">
                We support markdown, you can convert this field.
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : editingTask ? "Update" : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};