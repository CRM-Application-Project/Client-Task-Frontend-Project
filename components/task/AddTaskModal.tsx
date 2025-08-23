"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  X,
  Calendar,
  ChevronDown,
  Check,
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
  Palette,
  Type,
  MoreHorizontal,
} from "lucide-react";
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
  onSubmit: (
    task: CreateTaskRequest | Partial<UpdateTaskRequest>,
    isEdit: boolean
  ) => void | Promise<void>;
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
  endDate?: string | null;
  assignee?: string;
  acceptanceCriteria?: string;
  // New: comment captured during edit (required if stage changes)
  comment?: string;
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

// Rich Text Editor Component
interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const RichTextEditor = ({
  value,
  onChange,
  placeholder,
  className,
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [textAlignment, setTextAlignment] = useState<string>("left");

  // Comprehensive emoji collection
  const emojiCategories = {
    "Frequently Used": [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "🤣",
      "😂",
      "🙂",
      "🙃",
      "😉",
      "😊",
      "😇",
      "🥰",
      "😍",
      "🤩",
      "😘",
      "😗",
      "😚",
      "😙",
      "🥲",
      "😋",
      "😛",
      "😜",
      "🤪",
      "😝",
      "🤑",
      "🤗",
      "🤭",
      "🤫",
      "🤔",
      "🤐",
      "🤨",
      "😐",
      "😑",
      "😶",
      "😏",
      "😒",
      "🙄",
      "😬",
      "🤥",
      "😔",
      "😪",
    ],
    Gestures: [
      "👍",
      "👎",
      "👌",
      "🤌",
      "🤏",
      "✌️",
      "🤞",
      "🤟",
      "🤘",
      "🤙",
      "👈",
      "👉",
      "👆",
      "🖕",
      "👇",
      "☝️",
      "👋",
      "🤚",
      "🖐️",
      "✋",
      "🖖",
      "👏",
      "🙌",
      "🤲",
      "🤝",
      "🙏",
      "✍️",
      "💅",
      "🤳",
      "💪",
      "🦾",
      "🦿",
      "🦵",
      "🦶",
      "👂",
      "🦻",
      "👃",
      "🧠",
      "🫀",
      "🫁",
      "🦷",
      "🦴",
      "👀",
      "👁️",
      "👅",
      "👄",
      "💋",
    ],
    Symbols: [
      "✅",
      "❌",
      "⚡",
      "🛡️",
      "🎯",
      "🚀",
      "⭐",
      "🔥",
      "💡",
      "🔧",
      "📊",
      "📱",
      "💻",
      "🌟",
      "⚠️",
      "🎉",
      "📝",
      "🔍",
      "🎨",
      "🔒",
      "📈",
      "⏰",
      "🏆",
      "🎪",
      "💎",
      "🔑",
      "🎁",
      "🏅",
      "🎊",
      "💥",
      "✨",
      "🌈",
      "⭐",
      "🔮",
      "💫",
      "🌙",
      "☀️",
      "⭐",
      "🌟",
    ],
    Objects: [
      "📱",
      "💻",
      "🖥️",
      "⌨️",
      "🖱️",
      "🖨️",
      "📷",
      "📹",
      "🎥",
      "📞",
      "☎️",
      "📠",
      "📺",
      "📻",
      "🎙️",
      "🎚️",
      "🎛️",
      "🕹️",
      "💾",
      "💿",
      "📀",
      "💽",
      "💻",
      "📱",
      "☎️",
      "📞",
      "📟",
      "📠",
      "📺",
      "📻",
      "🎙️",
      "⏰",
      "⏲️",
      "⏱️",
      "🕰️",
      "📡",
      "🔋",
      "🔌",
      "💡",
      "🔦",
      "🕯️",
      "🧯",
      "🛢️",
    ],
    Activities: [
      "⚽",
      "🏀",
      "🏈",
      "⚾",
      "🥎",
      "🎾",
      "🏐",
      "🏉",
      "🥏",
      "🎱",
      "🪀",
      "🏓",
      "🏸",
      "🏒",
      "🏑",
      "🥍",
      "🏏",
      "🪃",
      "🥅",
      "⛳",
      "🪁",
      "🏹",
      "🎣",
      "🤿",
      "🥽",
      "🥼",
      "🦺",
      "⛷️",
      "🏂",
      "🪂",
      "🏋️",
      "🤼",
      "🤸",
      "⛹️",
      "🤺",
      "🤾",
      "🏌️",
      "🏇",
      "🧘",
      "🏃",
      "🚶",
      "🧎",
      "🧍",
    ],
  };

  const checkActiveFormats = () => {
    if (!editorRef.current) return;
    const newActiveFormats = new Set<string>();
    const alignmentCommands: Record<string, string> = {
      justifyLeft: "left",
      justifyCenter: "center",
      justifyRight: "right",
      justifyFull: "justify",
    };
    if (document.queryCommandState("bold")) newActiveFormats.add("bold");
    if (document.queryCommandState("italic")) newActiveFormats.add("italic");
    if (document.queryCommandState("underline"))
      newActiveFormats.add("underline");
    if (document.queryCommandState("strikeThrough"))
      newActiveFormats.add("strikeThrough");
    for (const [command, alignment] of Object.entries(alignmentCommands)) {
      if (document.queryCommandState(command)) {
        newActiveFormats.add(alignment);
        setTextAlignment(alignment);
        break;
      }
    }
    if (document.queryCommandState("insertUnorderedList"))
      newActiveFormats.add("unorderedList");
    if (document.queryCommandState("insertOrderedList"))
      newActiveFormats.add("orderedList");
    setActiveFormats(newActiveFormats);
  };

  useEffect(() => {
    if (editorRef.current && !isInitialized) {
      if (value) {
        if (value.includes("<")) {
          editorRef.current.innerHTML = value;
        } else {
          editorRef.current.innerHTML = value.replace(/\n/g, "<br>");
        }
      } else {
        editorRef.current.innerHTML = "";
      }
      setIsInitialized(true);
    }
  }, [value, isInitialized]);

  useEffect(() => {
    setIsInitialized(false);
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      const htmlContent = editorRef.current.innerHTML;
      onChange(htmlContent);
      checkActiveFormats();
    }
  };

  const executeFormat = (command: string, value?: string) => {
    editorRef.current?.focus();
    const success = document.execCommand(command, false, value);
    if (!success && command === "bold") {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (!range.collapsed) {
          const bold = document.createElement("strong");
          try {
            range.surroundContents(bold);
          } catch (e) {
            bold.appendChild(range.extractContents());
            range.insertNode(bold);
          }
        }
      }
    }
    setTimeout(() => {
      handleInput();
      checkActiveFormats();
    }, 10);
  };

  const insertAtCursor = (html: string) => {
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let range = selection.getRangeAt(0);
      range.deleteContents();
      const div = document.createElement("div");
      div.innerHTML = html;
      const frag = document.createDocumentFragment();
      let node, lastNode;
      while ((node = div.firstChild)) {
        lastNode = frag.appendChild(node);
      }
      range.insertNode(frag);
      if (lastNode) {
        const newRange = range.cloneRange();
        newRange.setStartAfter(lastNode);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }
    handleInput();
  };

  const insertEmoji = (emoji: string) => {
    insertAtCursor(emoji);
    setShowEmojiPicker(false);
  };

  const findParentList = (element: HTMLElement): HTMLElement | null => {
    let parent = element.parentElement;
    while (parent && parent !== editorRef.current) {
      if (parent.tagName === "UL" || parent.tagName === "OL") {
        return parent;
      }
      parent = parent.parentElement;
    }
    return null;
  };

  const insertNumberedList = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const p = document.createElement("p");
      p.innerHTML = "1. ";
      range.insertNode(p);
      const newRange = document.createRange();
      newRange.setStart(p, 1);
      newRange.setEnd(p, 1);
      selection.removeAllRanges();
      selection.addRange(newRange);
      handleInput();
    }
  };

  const insertBulletList = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const p = document.createElement("p");
      p.innerHTML = "• ";
      range.insertNode(p);
      const newRange = document.createRange();
      newRange.setStart(p, 1);
      newRange.setEnd(p, 1);
      selection.removeAllRanges();
      selection.addRange(newRange);
      handleInput();
    }
  };

  const convertListType = (listElement: HTMLElement, newType: string) => {
    const newList = document.createElement(newType);
    while (listElement.firstChild) {
      const listItem = document.createElement("li");
      listItem.innerHTML = (listElement.firstChild as HTMLElement).innerHTML;
      newList.appendChild(listItem);
      listElement.removeChild(listElement.firstChild);
    }
    listElement.parentNode?.replaceChild(newList, listElement);
  };

  const handleSelectionChange = useCallback(() => {
    checkActiveFormats();
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [handleSelectionChange]);

  const setAlignment = (alignment: string) => {
    const commands: Record<string, string> = {
      left: "justifyLeft",
      center: "justifyCenter",
      right: "justifyRight",
      justify: "justifyFull",
    };
    executeFormat(commands[alignment]);
  };

  const addLink = () => {
    const url = prompt("Enter URL:");
    if (url) {
      executeFormat("createLink", url);
    }
  };

  const addImage = () => {
    const url = prompt("Enter image URL:");
    if (url) {
      executeFormat("insertImage", url);
    }
  };

  const makeHeading = () => {
    executeFormat("formatBlock", "H3");
  };

  const addHorizontalRule = () => {
    executeFormat("insertHorizontalRule");
  };

  return (
    <div className={`border border-gray-300 rounded-md bg-white ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-gray-100 border-b">
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant={activeFormats.has("bold") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeFormat("bold")}
            className={`h-8 w-8 p-0 ${
              activeFormats.has("bold") ? "bg-gray-300" : "hover:bg-gray-200"
            }`}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={activeFormats.has("italic") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeFormat("italic")}
            className={`h-8 w-8 p-0 ${
              activeFormats.has("italic") ? "bg-gray-300" : "hover:bg-gray-200"
            }`}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={activeFormats.has("underline") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeFormat("underline")}
            className={`h-8 w-8 p-0 ${
              activeFormats.has("underline")
                ? "bg-gray-300"
                : "hover:bg-gray-200"
            }`}
            title="Underline"
          >
            <Underline className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={activeFormats.has("strikeThrough") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeFormat("strikeThrough")}
            className={`h-8 w-8 p-0 ${
              activeFormats.has("strikeThrough")
                ? "bg-gray-300"
                : "hover:bg-gray-200"
            }`}
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant={textAlignment === "left" ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setAlignment("left")}
            className={`h-8 w-8 p-0 ${
              textAlignment === "left" ? "bg-gray-300" : "hover:bg-gray-200"
            }`}
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={textAlignment === "center" ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setAlignment("center")}
            className={`h-8 w-8 p-0 ${
              textAlignment === "center" ? "bg-gray-300" : "hover:bg-gray-200"
            }`}
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={textAlignment === "right" ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setAlignment("right")}
            className={`h-8 w-8 p-0 ${
              textAlignment === "right" ? "bg-gray-300" : "hover:bg-gray-200"
            }`}
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={textAlignment === "justify" ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setAlignment("justify")}
            className={`h-8 w-8 p-0 ${
              textAlignment === "justify" ? "bg-gray-300" : "hover:bg-gray-200"
            }`}
            title="Justify"
          >
            <AlignJustify className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeFormat("superscript")}
            className="h-8 w-8 p-0 hover:bg-gray-200"
            title="Superscript"
          >
            <Superscript className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeFormat("subscript")}
            className="h-8 w-8 p-0 hover:bg-gray-200"
            title="Subscript"
          >
            <Subscript className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeFormat("formatBlock", "pre")}
            className="h-8 w-8 p-0 hover:bg-gray-200"
            title="Code Block"
          >
            <Code className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeFormat("formatBlock", "blockquote")}
            className="h-8 w-8 p-0 hover:bg-gray-200"
            title="Quote"
          >
            <Quote className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={insertNumberedList}
            className={`h-8 w-8 p-0 hover:bg-gray-200`}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={insertBulletList}
            className={`h-8 w-8 p-0 hover:bg-gray-200`}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
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
                        onMouseDown={(e) => e.preventDefault()}
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

        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={makeHeading}
            className="h-8 w-8 p-0 hover:bg-gray-200"
            title="Heading"
          >
            <Type className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={addHorizontalRule}
            className="h-8 w-8 p-0 hover:bg-gray-200"
            title="Horizontal Rule"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="min-h-[200px] p-4 focus:outline-none text-sm leading-relaxed"
        style={{ wordWrap: "break-word" }}
        data-placeholder={placeholder}
      />

      <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-600 rounded-b-md">
        Rich text editor with full formatting support
      </div>
    </div>
  );
};

// The rest of your AddTaskModal component with edit-comment logic
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
  const { toast } = useToast();

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

  // New: comment state (edit only)
  const [comment, setComment] = useState<string>("");

  const [originalFormData, setOriginalFormData] =
    useState<CreateTaskRequest | null>(null);
  const [dirtyFields, setDirtyFields] = useState<Set<keyof CreateTaskRequest>>(
    new Set()
  );

  const priorities: Array<CreateTaskRequest["priority"]> = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "URGENT",
  ];

  const getDefaultAcceptanceCriteria = () => {
    return `<strong>Given</strong> Dummy acceptance criteria edit your acceptance criteria here.<br><br>`;
    // You can expand template later if needed
  };

  const hasPreSelectedStage = useMemo(() => {
    return !editingTask && preSelectedStageId && preSelectedStageId > 0;
  }, [editingTask, preSelectedStageId]);

  const areValuesEqual = (original: any, current: any): boolean => {
    if (original === current) return true;
    if (original instanceof Date && typeof current === "string") {
      return original.toISOString() === current;
    }
    if (typeof original === "string" && current instanceof Date) {
      return original === current.toISOString();
    }
    const normalizeEmpty = (val: any) =>
      val === null || val === undefined || val === "" ? "" : val;
    return normalizeEmpty(original) === normalizeEmpty(current);
  };

  const updateFormField = (field: keyof CreateTaskRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (originalFormData && editingTask) {
      const originalValue = originalFormData[field];
      const newDirtyFields = new Set(dirtyFields);

      if (areValuesEqual(originalValue, value)) {
        newDirtyFields.delete(field);
      } else {
        newDirtyFields.add(field);
      }
      setDirtyFields(newDirtyFields);
    }
  };

  const getLocalISOString = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

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

  // Determine if stage changed (edit mode only)
  const stageChanged = useMemo(() => {
    if (!editingTask || !originalFormData) return false;
    return formData.taskStageId !== originalFormData.taskStageId;
  }, [editingTask, formData.taskStageId, originalFormData]);

  useEffect(() => {
    if (!isOpen) {
      setOriginalFormData(null);
      setDirtyFields(new Set());
      setComment("");
      return;
    }

    if (editingTask) {
      const initialData: CreateTaskRequest = {
        subject: editingTask.subject || "",
        description: editingTask.description || "",
        priority: editingTask.priority || "LOW",
        taskStageId: editingTask.taskStageId || 0,
        startDate: editingTask.startDate || new Date().toISOString(),
        endDate: editingTask.endDate || "",
        assignee: editingTask.assignee?.id || "",
        acceptanceCriteria: editingTask.acceptanceCriteria || "",
      };
      setFormData(initialData);
      setOriginalFormData(initialData);
      setDirtyFields(new Set());
      setComment(""); // reset comment on open
    } else {
      const adjustedTime = getAdjustedCurrentTime();
      const newTaskData: CreateTaskRequest = {
        subject: "",
        description: "",
        priority: "LOW",
        taskStageId: preSelectedStageId || 0,
        startDate: getLocalISOString(adjustedTime),
        endDate: "",
        assignee: "",
        acceptanceCriteria: getDefaultAcceptanceCriteria(),
      };
      setFormData(newTaskData);
      setOriginalFormData(null);
      setDirtyFields(new Set());
      setComment(""); // not used in create
    }
  }, [isOpen, editingTask, preSelectedStageId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return;
      try {
        setIsLoading(true);
        const stagesRes = await getTaskStagesDropdown();
        if (stagesRes?.isSuccess && stagesRes.data) {
          setStages(stagesRes.data);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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

    // Comment required only if stage changed in edit mode
    if (editingTask && stageChanged && !comment.trim()) {
      toast({
        title: "Validation Error",
        description: "Comment is required when changing the stage.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingTask) {
        if (dirtyFields.size === 0 && !(stageChanged && comment.trim())) {
          toast({
            title: "No Changes",
            description: "No changes were made to the task.",
            variant: "default",
          });
          onClose();
          return;
        }

        const updatePayload: Partial<UpdateTaskRequest> = {};
        dirtyFields.forEach((field) => {
          if (field === "endDate" && formData[field] === "") {
            (updatePayload as any)[field] = null;
          } else {
            (updatePayload as any)[field] = formData[field];
          }
        });

        // include comment if provided (always include when stage changed)
        if (comment.trim()) {
          updatePayload.comment = comment.trim();
        }

        onSubmit(updatePayload, true);
      } else {
        onSubmit(formData, false);
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

  const handleDateChange = (value: string, field: "startDate" | "endDate") => {
    try {
      if (!value) {
        updateFormField(field, "");
        return;
      }
      if (field === "startDate") {
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

  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    try {
      let date: Date;
      if (dateString.includes("T")) {
        if (
          !dateString.includes("Z") &&
          !dateString.includes("+") &&
          !dateString.includes("-", 10)
        ) {
          const [datePart, timePart] = dateString.split("T");
          const [year, month, day] = datePart.split("-").map(Number);
          const [hour, minute, second] = timePart.split(":").map(Number);
          date = new Date(year, month - 1, day, hour, minute, second || 0);
        } else {
          date = new Date(dateString);
        }
      } else {
        const [year, month, day] = dateString.split("-").map(Number);
        date = new Date(year, month - 1, day);
      }
      if (isNaN(date.getTime())) return "";
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  const getPreSelectedStageName = () => {
    if (preSelectedStageId && stages.length > 0) {
      const selectedStage = stages.find(
        (stage) => stage.id === preSelectedStageId
      );
      return selectedStage?.name;
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                    • {dirtyFields.size} field
                    {dirtyFields.size !== 1 ? "s" : ""} modified
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
              {dirtyFields.has("subject") && (
                <span className="text-blue-600 text-xs ml-1">• Modified</span>
              )}
            </Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => updateFormField("subject", e.target.value)}
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
                {dirtyFields.has("priority") && (
                  <span className="text-blue-600 text-xs ml-1">• Modified</span>
                )}
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  updateFormField("priority", value as typeof formData.priority)
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
                {dirtyFields.has("taskStageId") && (
                  <span className="text-blue-600 text-xs ml-1">• Modified</span>
                )}
              </Label>

              {hasPreSelectedStage ? (
                <div className="flex items-center gap-2 p-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
                  <span className="text-sm">
                    {stages.find((stage) => stage.id === preSelectedStageId)
                      ?.name || "Selected Stage"}
                  </span>
                  <input
                    type="hidden"
                    value={preSelectedStageId || ""}
                    onChange={(e) =>
                      updateFormField("taskStageId", parseInt(e.target.value))
                    }
                  />
                </div>
              ) : (
                <Select
                  value={formData.taskStageId?.toString() || ""}
                  onValueChange={(value) => {
                    const numValue = parseInt(value, 10);
                    if (!isNaN(numValue)) {
                      updateFormField("taskStageId", numValue);
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

          {/* Comment field - Only show in edit mode when stage is changed */}
          {editingTask && stageChanged && (
            <div className="space-y-2 ">
              <Label className="text-sm font-medium text-foreground">
                Comment <span className="text-red-600">*</span>
                <span className="text-xs text-gray-600 ml-2">
                  Required because stage was changed
                </span>
              </Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Explain the reason for changing the stage..."
                rows={3}
                className={`resize-none ${
                  !comment.trim() ? "border-red-300 focus:border-red-400" : ""
                }`}
                required
              />
              {!comment.trim() && (
                <p className="text-xs text-gray-600">
                  Comment is required when changing the stage.
                </p>
              )}
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Start Date: *
                {dirtyFields.has("startDate") && (
                  <span className="text-blue-600 text-xs ml-1">• Modified</span>
                )}
              </Label>
              <Input
                type="date"
                value={formatDateForInput(formData.startDate)}
                onChange={(e) => handleDateChange(e.target.value, "startDate")}
                className="w-full"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                End Date (Optional):
                {dirtyFields.has("endDate") && (
                  <span className="text-blue-600 text-xs ml-1">• Modified</span>
                )}
              </Label>
              <Input
                type="date"
                value={formatDateForInput(formData.endDate)}
                onChange={(e) => handleDateChange(e.target.value, "endDate")}
                className="w-full"
              />
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Assignee: *
              {dirtyFields.has("assignee") && (
                <span className="text-blue-600 text-xs ml-1">• Modified</span>
              )}
            </Label>
            <Select
              value={formData.assignee}
              onValueChange={(value) => updateFormField("assignee", value)}
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
              {dirtyFields.has("description") && (
                <span className="text-blue-600 text-xs ml-1">• Modified</span>
              )}
            </Label>
            <Textarea
              value={formData.description}
              onChange={(e) => updateFormField("description", e.target.value)}
              placeholder="Enter Description"
              rows={4}
              className="resize-none"
              required
            />
          </div>

          {/* Acceptance Criteria */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground text-blue-600">
              Acceptance Criteria
              {dirtyFields.has("acceptanceCriteria") && (
                <span className="text-blue-600 text-xs ml-1">• Modified</span>
              )}
            </Label>
            <RichTextEditor
              value={formData.acceptanceCriteria || ""}
              onChange={(value) => updateFormField("acceptanceCriteria", value)}
              placeholder="Start typing your acceptance criteria..."
              className=""
            />
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