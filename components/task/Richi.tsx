import { useCallback, useEffect, useRef, useState } from "react";
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

// Custom Button component
const Button = ({ 
  children, 
  onClick, 
  onMouseDown, 
  className = "", 
  variant = "ghost",
  size = "sm",
  type = "button",
  title,
  ...props 
}: any) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const sizeClasses = size === "sm" ? "h-8 px-3 text-xs" : "h-10 py-2 px-4";
  const variantClasses = variant === "ghost" ? "hover:bg-gray-200 text-gray-700" : variant === "secondary" ? "bg-gray-600 text-white hover:bg-gray-700" : "";
  
  return (
    <button
      type={type}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      onClick={onClick}
      onMouseDown={onMouseDown}
      title={title}
      {...props}
    >
      {children}
    </button>
  );
};

// Rich Text Editor Component
interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  id?: string;
}

export const RichTextEditor = ({
  value,
  onChange,
  placeholder,
  className,
  minHeight = "200px",
  id,
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [textAlignment, setTextAlignment] = useState<string>("left");

  // Comprehensive emoji collection
  const emojiCategories = {
    "Frequently Used": [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", 
      "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", 
      "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", 
      "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", 
      "🤥", "😔", "😪"
    ],
    Gestures: [
      "👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", 
      "👈", "👉", "👆", "🖕", "👇", "☝️", "👋", "🤚", "🖐️", "✋", 
      "🖖", "👏", "🙌", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", 
      "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", 
      "🦷", "🦴", "👀", "👁️", "👅", "👄", "💋"
    ],
    Symbols: [
      "✅", "❌", "⚡", "🛡️", "🎯", "🚀", "⭐", "🔥", "💡", "🔧", 
      "📊", "📱", "💻", "🌟", "⚠️", "🎉", "📝", "🔍", "🎨", "🔒", 
      "📈", "⏰", "🏆", "🎪", "💎", "🔑", "🎁", "🏅", "🎊", "💥", 
      "✨", "🌈", "⭐", "🔮", "💫", "🌙", "☀️", "⭐", "🌟"
    ],
    Objects: [
      "📱", "💻", "🖥️", "⌨️", "🖱️", "🖨️", "📷", "📹", "🎥", "📞", 
      "☎️", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🕹️", "💾", "💿", 
      "📀", "💽", "💻", "📱", "☎️", "📞", "📟", "📠", "📺", "📻", 
      "🎙️", "⏰", "⏲️", "⏱️", "🕰️", "📡", "🔋", "🔌", "💡", "🔦", 
      "🕯️", "🧯", "🛢️"
    ],
    Activities: [
      "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", 
      "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", 
      "🪁", "🏹", "🎣", "🤿", "🥽", "🥼", "🦺", "⛷️", "🏂", "🪂", 
      "🏋️", "🤼", "🤸", "⛹️", "🤺", "🤾", "🏌️", "🏇", "🧘", "🏃", 
      "🚶", "🧎", "🧍"
    ],
  };

  // Helper function to check if cursor is inside a list
  const isInList = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return { inList: false };
    
    let currentNode = selection.anchorNode;
    while (currentNode && currentNode !== editorRef.current) {
      if (currentNode.nodeType === Node.ELEMENT_NODE) {
        const element = currentNode as HTMLElement;
        if (element.tagName === 'LI') {
          const listParent = element.parentElement;
          return { 
            inList: true, 
            listType: listParent?.tagName.toLowerCase() === 'ol' ? 'ordered' : 'unordered',
            listItem: element,
            list: listParent
          };
        }
      }
      currentNode = currentNode.parentNode;
    }
    return { inList: false };
  };

  const checkActiveFormats = () => {
    if (!editorRef.current) return;
    
    // Only check formats if this editor is currently focused
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    
    const focusedElement = selection.focusNode;
    if (!focusedElement) return;
    
    // Check if the selection is within this editor
    let isInThisEditor = false;
    let currentNode: Node | null = focusedElement;
    while (currentNode) {
      if (currentNode === editorRef.current) {
        isInThisEditor = true;
        break;
      }
      currentNode = currentNode.parentNode;
    }
    
    if (!isInThisEditor) return;
    
    const newActiveFormats = new Set<string>();
    const alignmentCommands: Record<string, string> = {
      justifyLeft: "left",
      justifyCenter: "center",
      justifyRight: "right",
      justifyFull: "justify",
    };
    
    // Check text formatting commands
    const formatCommands = [
      { command: "bold", key: "bold" },
      { command: "italic", key: "italic" },
      { command: "underline", key: "underline" },
      { command: "strikeThrough", key: "strikeThrough" },
    ];
    
    formatCommands.forEach(({ command, key }) => {
      try {
        if (document.queryCommandState(command)) {
          newActiveFormats.add(key);
        }
      } catch (e) {
        console.warn(`Could not check command state for ${command}:`, e);
      }
    });
    
    // Check alignment
    for (const [command, alignment] of Object.entries(alignmentCommands)) {
      try {
        if (document.queryCommandState(command)) {
          newActiveFormats.add(alignment);
          setTextAlignment(alignment);
          break;
        }
      } catch (e) {
        console.warn(`Could not check command state for ${command}:`, e);
      }
    }
    
    // Check if we're in a list using our custom function
    const listInfo = isInList();
    if (listInfo.inList) {
      if (listInfo.listType === 'ordered') {
        newActiveFormats.add("orderedList");
      } else {
        newActiveFormats.add("unorderedList");
      }
    }
    
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
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const htmlContent = editorRef.current.innerHTML;
      onChange(htmlContent);
      checkActiveFormats();
    }
  };

  const handleFocus = () => {
    // Update active formats when this editor gains focus
    setTimeout(() => {
      checkActiveFormats();
    }, 10);
  };

  const handleBlur = () => {
    // Clear active formats when this editor loses focus
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount || !editorRef.current) {
        setActiveFormats(new Set());
        setTextAlignment("left");
        return;
      }
      
      const range = selection.getRangeAt(0);
      const commonAncestor = range.commonAncestorContainer;
      
      let isInThisEditor = false;
      let currentNode: Node | null = commonAncestor;
      while (currentNode) {
        if (currentNode === editorRef.current) {
          isInThisEditor = true;
          break;
        }
        currentNode = currentNode.parentNode;
      }
      
      if (!isInThisEditor) {
        setActiveFormats(new Set());
        setTextAlignment("left");
      }
    }, 100);
  };

  const executeFormat = (command: string, value?: string) => {
    if (!editorRef.current) return;
    
    // Ensure this editor is focused before executing commands
    editorRef.current.focus();
    
    // Double-check that the selection is within this editor
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const commonAncestor = range.commonAncestorContainer;
      
      let isInThisEditor = false;
      let currentNode: Node | null = commonAncestor;
      while (currentNode) {
        if (currentNode === editorRef.current) {
          isInThisEditor = true;
          break;
        }
        currentNode = currentNode.parentNode;
      }
      
      if (!isInThisEditor) {
        // If selection is not in this editor, create a new selection at the end
        const newRange = document.createRange();
        newRange.selectNodeContents(editorRef.current);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }
    
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

  // Fixed insertAtCursor function with proper cursor positioning
   const insertAtCursor = (html: string) => {
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let range = selection.getRangeAt(0);
      
      // Ensure the range is within this editor
      const commonAncestor = range.commonAncestorContainer;
      let isInThisEditor = false;
      let currentNode: Node | null = commonAncestor;
      while (currentNode) {
        if (currentNode === editorRef.current) {
          isInThisEditor = true;
          break;
        }
        currentNode = currentNode.parentNode;
      }
      
      if (!isInThisEditor) {
        // Create a new range at the end of this editor
        range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
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
    } else {
      // No selection, insert at the end of the editor
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
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
        selection?.removeAllRanges();
        selection?.addRange(newRange);
      }
    }
    handleInput();
  };

  const insertEmoji = (emoji: string) => {
    if (!editorRef.current) return;
    
    // Ensure this editor is focused before inserting emoji
    editorRef.current.focus();
    insertAtCursor(emoji);
    setShowEmojiPicker(false);
  };

  // Enhanced list functions with proper behavior
  const insertNumberedList = () => {
  if (!editorRef.current) return;
  
  editorRef.current.focus();
  
  // Ensure the selection is within this editor
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const commonAncestor = range.commonAncestorContainer;
    
    let isInThisEditor = false;
    let currentNode: Node | null = commonAncestor;
    while (currentNode) {
      if (currentNode === editorRef.current) {
        isInThisEditor = true;
        break;
      }
      currentNode = currentNode.parentNode;
    }
    
    if (!isInThisEditor) {
      // Create a new selection at the end of this editor
      const newRange = document.createRange();
      newRange.selectNodeContents(editorRef.current);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
  }
  
  // Use browser's native command
  document.execCommand("insertOrderedList");
  
  // Force re-render to update active formats
  setTimeout(() => {
    handleInput();
    checkActiveFormats();
  }, 10);
};

const insertBulletList = () => {
  if (!editorRef.current) return;
  
  editorRef.current.focus();
  
  // Ensure the selection is within this editor
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const commonAncestor = range.commonAncestorContainer;
    
    let isInThisEditor = false;
    let currentNode: Node | null = commonAncestor;
    while (currentNode) {
      if (currentNode === editorRef.current) {
        isInThisEditor = true;
        break;
      }
      currentNode = currentNode.parentNode;
    }
    
    if (!isInThisEditor) {
      // Create a new selection at the end of this editor
      const newRange = document.createRange();
      newRange.selectNodeContents(editorRef.current);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
  }
  
  document.execCommand("insertUnorderedList");
  
  // Force re-render to update active formats
  setTimeout(() => {
    handleInput();
    checkActiveFormats();
  }, 10);
};



  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const listInfo = isInList();
        
        if (listInfo.inList && listInfo.listItem) {
          const isEmpty = !listInfo.listItem.textContent?.trim() || listInfo.listItem.innerHTML === '&nbsp;' || listInfo.listItem.innerHTML === '<br>';
          
          if (isEmpty) {
            // Empty list item - exit list
            e.preventDefault();
            const div = document.createElement('div');
            div.innerHTML = '<br>';
            listInfo.list?.parentNode?.insertBefore(div, listInfo.list.nextSibling);
            listInfo.listItem.remove();
            
            // If list is now empty, remove it
            if (listInfo.list && !listInfo.list.children.length) {
              listInfo.list.remove();
            }
            
            // Set cursor in the new div
            const range = document.createRange();
            range.setStart(div, 0);
            range.setEnd(div, 0);
            selection.removeAllRanges();
            selection.addRange(range);
            handleInput();
            return;
          }
        }
      }
    }
  };

  const handleSelectionChange = useCallback(() => {
    // Only check formats if the selection is within this editor
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !editorRef.current) return;
    
    const range = selection.getRangeAt(0);
    const commonAncestor = range.commonAncestorContainer;
    
    let isInThisEditor = false;
    let currentNode: Node | null = commonAncestor;
    while (currentNode) {
      if (currentNode === editorRef.current) {
        isInThisEditor = true;
        break;
      }
      currentNode = currentNode.parentNode;
    }
    
    if (isInThisEditor) {
      checkActiveFormats();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [handleSelectionChange]);

  // Enhanced setAlignment function to handle lists properly
  const setAlignment = (alignment: string) => {
    if (!editorRef.current) return;
    
    const commands: Record<string, string> = {
      left: "justifyLeft",
      center: "justifyCenter",
      right: "justifyRight",
      justify: "justifyFull",
    };
    
    // Check if we're in a list
    const listInfo = isInList();
    
    if (listInfo.inList && listInfo.list) {
      // Apply alignment to the entire list container
      const listElement = listInfo.list as HTMLElement;
      
      // Remove any existing alignment classes
      listElement.style.textAlign = '';
      listElement.style.direction = '';
      listElement.classList.remove('text-left', 'text-center', 'text-right', 'text-justify');
      
      // Apply new alignment
      switch(alignment) {
        case 'left':
          listElement.style.textAlign = 'left';
          listElement.style.listStylePosition = 'inside';
          break;
        case 'center':
          listElement.style.textAlign = 'center';
          listElement.style.listStylePosition = 'inside';
          break;
        case 'right':
          listElement.style.textAlign = 'right';
          listElement.style.listStylePosition = 'inside';
          break;
        case 'justify':
          listElement.style.textAlign = 'justify';
          listElement.style.listStylePosition = 'inside';
          break;
      }
      
      // Also apply to individual list items for better browser compatibility
      const listItems = listElement.querySelectorAll('li');
      listItems.forEach((li: any) => {
        li.style.textAlign = alignment;
      });
      
    } else {
      // Regular text alignment
      executeFormat(commands[alignment]);
    }
    
    setTextAlignment(alignment);
    setTimeout(() => {
      handleInput();
      checkActiveFormats();
    }, 10);
  };

  const addLink = () => {
    if (!editorRef.current) return;
    
    const url = prompt("Enter URL:");
    if (url) {
      executeFormat("createLink", url);
    }
  };

  const addImage = () => {
    if (!editorRef.current) return;
    
    const url = prompt("Enter image URL:");
    if (url) {
      executeFormat("insertImage", url);
    }
  };

  const makeHeading = () => {
    if (!editorRef.current) return;
    
    executeFormat("formatBlock", "H3");
  };

  const addHorizontalRule = () => {
    if (!editorRef.current) return;
    
    executeFormat("insertHorizontalRule");
  };



  // Add this to handle selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        // Only check formats if selection is within this editor
        if (editorRef.current?.contains(range.startContainer)) {
          checkActiveFormats();
        }
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  return (
    <div className={`border border-gray-200 rounded-md bg-white ${className}`} id={id}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-gray-100 border-b">
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant={activeFormats.has("bold") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e: any) => e.preventDefault()}
            onClick={() => executeFormat("bold")}
            className="h-10 w-9 p-0"
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={activeFormats.has("italic") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e: any) => e.preventDefault()}
            onClick={() => executeFormat("italic")}
            className="h-10 w-9 p-0"
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={activeFormats.has("underline") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e: any) => e.preventDefault()}
            onClick={() => executeFormat("underline")}
            className="h-10 w-9 p-0"
            title="Underline"
          >
            <Underline className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={activeFormats.has("strikeThrough") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e: any) => e.preventDefault()}
            onClick={() => executeFormat("strikeThrough")}
            className="h-10 w-9 p-0"
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
            onMouseDown={(e: any) => e.preventDefault()}
            onClick={() => setAlignment("left")}
            className="h-10 w-9 p-0"
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={textAlignment === "center" ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e: any) => e.preventDefault()}
            onClick={() => setAlignment("center")}
            className="h-10 w-9 p-0"
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={textAlignment === "right" ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e: any) => e.preventDefault()}
            onClick={() => setAlignment("right")}
            className="h-10 w-9 p-0"
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={textAlignment === "justify" ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e: any) => e.preventDefault()}
            onClick={() => setAlignment("justify")}
            className="h-10 w-9 p-0"
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
            onMouseDown={(e: any) => e.preventDefault()}
            onClick={() => executeFormat("superscript")}
            className="h-10 w-9 p-0"
            title="Superscript"
          >
            <Superscript className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e: any) => e.preventDefault()}
            onClick={() => executeFormat("subscript")}
            className="h-10 w-9 p-0"
            title="Subscript"
          >
            <Subscript className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e: any) => e.preventDefault()}
            onClick={() => executeFormat("formatBlock", "pre")}
            className="h-10 w-9 p-0"
            title="Code Block"
          >
            <Code className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e: any) => e.preventDefault()}
            onClick={() => executeFormat("formatBlock", "blockquote")}
            className="h-10 w-9 p-0"
            title="Quote"
          >
            <Quote className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant={activeFormats.has("orderedList") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e: any) => e.preventDefault()}
            onClick={insertNumberedList}
            className="h-10 w-9 p-0"
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={activeFormats.has("unorderedList") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e: any) => e.preventDefault()}
            onClick={insertBulletList}
            className="h-10 w-9 p-0"
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
            onMouseDown={(e:any) => e.preventDefault()}
            onClick={() => {
              if (editorRef.current) {
                editorRef.current.focus();
                setShowEmojiPicker(!showEmojiPicker);
              }
            }}
            className="h-8 w-8 p-0 hover:bg-gray-200"
            title="Insert Emoji"
          >
            <Smile className="h-4 w-4" />
          </Button>
          {showEmojiPicker && (
            <div 
              className="absolute top-10 left-0 z-20 bg-white border border-gray-200 rounded-md shadow-lg w-80 max-h-64 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
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
            onMouseDown={(e: any) => e.preventDefault()}
            onClick={makeHeading}
            className="h-10 w-9 p-0"
            title="Heading"
          >
            <Type className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e: any) => e.preventDefault()}
            onClick={addHorizontalRule}
            className="h-10 w-9 p-0"
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
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="p-4 focus:outline-none text-sm leading-relaxed rich-text-editor"
        style={{ 
          wordWrap: "break-word",
          minHeight: minHeight
        }}
        data-placeholder={placeholder}
        data-editor-id={id}
      />
      
      {/* Enhanced CSS for proper list styling, selection behavior, and improved visibility */}
      <style>
        {`
          /* Enhanced selection visibility with strong contrast */
          .rich-text-editor ::selection {
            background-color: #2563eb !important;
            color: white !important;
            text-shadow: none !important;
          }
          
          .rich-text-editor ::-moz-selection {
            background-color: #2563eb !important;
            color: white !important;
            text-shadow: none !important;
          }
          
          /* Enhanced list styling with proper alignment and marker inclusion */
          .rich-text-editor ul,
          .rich-text-editor ol {
            margin: 0.5rem 0;
            padding-left: 1.5rem;
            list-style-position: inside;
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            user-select: text;
          }
          
          /* Make list items fully selectable including markers */
          .rich-text-editor li {
            display: list-item;
            margin: 0.25rem 0;
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            user-select: text;
            position: relative;
          }
          
          /* Ensure markers are included in selection */
          .rich-text-editor li::marker {
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            user-select: text;
            unicode-bidi: isolate;
            font-variant-numeric: tabular-nums;
          }
          
          /* Fix alignment for lists - ensure markers move with content */
          .rich-text-editor ul[style*="text-align: center"],
          .rich-text-editor ol[style*="text-align: center"] {
            list-style-position: inside;
            text-align: center;
            padding-left: 0;
          }
          
          .rich-text-editor ul[style*="text-align: right"],
          .rich-text-editor ol[style*="text-align: right"] {
            list-style-position: inside;
            text-align: right;
            padding-left: 0;
            direction: rtl;
          }
          
          .rich-text-editor ul[style*="text-align: right"] li,
          .rich-text-editor ol[style*="text-align: right"] li {
            direction: ltr;
            text-align: right;
          }
          
          .rich-text-editor ul[style*="text-align: left"],
          .rich-text-editor ol[style*="text-align: left"] {
            list-style-position: inside;
            text-align: left;
            padding-left: 1.5rem;
          }
          
          .rich-text-editor ul[style*="text-align: justify"],
          .rich-text-editor ol[style*="text-align: justify"] {
            list-style-position: inside;
            text-align: justify;
            padding-left: 1.5rem;
          }
          
          /* Improve cursor and interaction */
          .rich-text-editor {
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            user-select: text;
            cursor: text;
          }
          
          .rich-text-editor [data-placeholder]:empty:before {
            content: attr(data-placeholder);
            color: #9ca3af;
            font-style: italic;
            pointer-events: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
          }
          
          .rich-text-editor:focus {
            outline: none;
          }
          
          /* Ensure all content is selectable */
          .rich-text-editor * {
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            user-select: text;
            position: relative;
          }
          
          /* Enhanced visual feedback for active selection */
          .rich-text-editor:focus-within {
            box-shadow: 0 0 0 2px #3b82f6;
          }
          
          /* Improve readability of selected text */
          .rich-text-editor strong::selection,
          .rich-text-editor b::selection {
            background-color: #1d4ed8 !important;
            color: white !important;
          }
          
          .rich-text-editor em::selection,
          .rich-text-editor i::selection {
            background-color: #1d4ed8 !important;
            color: white !important;
          }
          
          .rich-text-editor u::selection {
            background-color: #1d4ed8 !important;
            color: white !important;
            text-decoration: underline !important;
          }
          
          /* Fix for better list marker selection across browsers */
          .rich-text-editor li {
            position: relative;
            display: list-item;
            list-style-position: inside;
          }
          
          /* Webkit specific fixes for list selection */
          .rich-text-editor ul li::before,
          .rich-text-editor ol li::before {
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            user-select: text;
          }
          
          /* Better handling of nested lists */
          .rich-text-editor ul ul,
          .rich-text-editor ol ol,
          .rich-text-editor ul ol,
          .rich-text-editor ol ul {
            margin: 0.25rem 0;
            padding-left: 1.5rem;
          }
          
          /* Ensure consistent selection across browsers */
          .rich-text-editor {
            -webkit-touch-callout: text;
            -webkit-user-select: text;
            -khtml-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            user-select: text;
          }
          
          /* Fix for Firefox list marker selection */
          @-moz-document url-prefix() {
            .rich-text-editor li {
              list-style-position: inside;
            }
          }
        `}
      </style>
    </div>
  );
};

