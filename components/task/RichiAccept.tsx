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

export const RichTextEditorAccptance = ({
  value,
  id,
  onChange,
  placeholder,
  className,
  minHeight = "200px",
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

  // Enhanced list functions with proper behavior
  const insertNumberedList = () => {
    editorRef.current?.focus();
    
    const listInfo = isInList();
    
    if (listInfo.inList) {
      if (listInfo.listType === 'ordered') {
        // Already in numbered list - add new list item
        const newListItem = document.createElement('li');
        newListItem.innerHTML = '<br>';
        listInfo.listItem?.parentNode?.insertBefore(newListItem, listInfo.listItem?.nextSibling);
        
        // Set cursor in new list item
        const range = document.createRange();
        const selection = window.getSelection();
        range.setStart(newListItem, 0);
        range.setEnd(newListItem, 0);
        selection?.removeAllRanges();
        selection?.addRange(range);
      } else {
        // In unordered list - convert to ordered list
        if (listInfo.list) {
          const ol = document.createElement('ol');
          ol.innerHTML = listInfo.list.innerHTML;
          listInfo.list.parentNode?.replaceChild(ol, listInfo.list);
        }
      }
    } else {
      // Not in list - create new ordered list
      document.execCommand("insertOrderedList");
    }
    
    setTimeout(() => {
      handleInput();
      checkActiveFormats();
    }, 10);
  };

  const insertBulletList = () => {
    editorRef.current?.focus();
    
    const listInfo = isInList();
    
    if (listInfo.inList) {
      if (listInfo.listType === 'unordered') {
        // Already in bullet list - add new list item
        const newListItem = document.createElement('li');
        newListItem.innerHTML = '<br>';
        listInfo.listItem?.parentNode?.insertBefore(newListItem, listInfo.listItem?.nextSibling);
        
        // Set cursor in new list item
        const range = document.createRange();
        const selection = window.getSelection();
        range.setStart(newListItem, 0);
        range.setEnd(newListItem, 0);
        selection?.removeAllRanges();
        selection?.addRange(range);
      } else {
        // In ordered list - convert to unordered list
        if (listInfo.list) {
          const ul = document.createElement('ul');
          ul.innerHTML = listInfo.list.innerHTML;
          listInfo.list.parentNode?.replaceChild(ul, listInfo.list);
        }
      }
    } else {
      // Not in list - create new unordered list
      document.execCommand("insertUnorderedList");
    }
    
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
  // In RichTextEditor component, modify the executeFormat function
const executeFormat = (command: string, value?: string) => {
  editorRef.current?.focus();
  
  // Save the current selection
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  
  // Check if selection is within this editor
  if (!editorRef.current?.contains(selection.anchorNode)) return;
  
  const success = document.execCommand(command, false, value);
  // ... rest of your existing code
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
            onMouseDown={(e: any) => e.preventDefault()}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="h-10 w-9 p-0"
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
        onKeyDown={handleKeyDown}
        className="p-4 focus:outline-none text-sm leading-relaxed rich-text-editor"
        style={{ 
          wordWrap: "break-word",
          minHeight: minHeight
        }}
        data-placeholder={placeholder}
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
          
          /* Ensure selection works on all text elements */
          .rich-text-editor *::selection {
            background-color: #2563eb !important;
            color: white !important;
          }
          
          .rich-text-editor *::-moz-selection {
            background-color: #2563eb !important;
            color: white !important;
          }
          
          /* Make list markers selectable and included in selection */
          .rich-text-editor ul, .rich-text-editor ol {
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            user-select: text;
          }
          
          .rich-text-editor li {
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            user-select: text;
            display: list-item;
            position: relative;
            margin: 0.25rem 0;
          }
          
          .rich-text-editor li::marker {
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            user-select: text;
            unicode-bidi: isolate;
            font-variant-numeric: tabular-nums;
          }
          
          /* Enhanced list styling */
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
          
          /* Ensure selection works on all text elements */
          .rich-text-editor *::selection {
            background-color: #2563eb !important;
            color: white !important;
          }
          
          .rich-text-editor *::-moz-selection {
            background-color: #2563eb !important;
            color: white !important;
          }
          
          /* Make list markers selectable and included in selection */
          .rich-text-editor ul, .rich-text-editor ol {
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            user-select: text;
          }
          
          .rich-text-editor li {
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            user-select: text;
            display: list-item;
            position: relative;
            margin: 0.25rem 0;
          }
          
          .rich-text-editor li::marker {
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            user-select: text;
            unicode-bidi: isolate;
            font-variant-numeric: tabular-nums;
          }
          
          /* Enhanced list styling */
          .rich-text-editor ul {
            list-style-type: disc;
            padding-left: 1.5rem;
            margin: 0.5rem 0;
            -webkit-user-select: text;
            user-select: text;
            -webkit-user-select: text;
            user-select: text;
          }
          
          .rich-text-editor ol {
            list-style-type: decimal;
            padding-left: 1.5rem;
            margin: 0.5rem 0;
            counter-reset: list-counter;
            -webkit-user-select: text;
            user-select: text;
            -webkit-user-select: text;
            user-select: text;
          }
          
          .rich-text-editor ol li {
            list-style: decimal;
            display: list-item;
          }
          
          .rich-text-editor ul li {
            list-style: disc;
            display: list-item;
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
          }
          
          .rich-text-editor:focus {
            outline: none;
          }
          /* Ensure all content is selectable */
          .rich-text-editor * {
            -webkit-user-select: text;
            -moz-user-select: text;
          /* Improve cursor and interaction */
          .rich-text-editor {
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            user-select: text;
            cursor: text;
          }
          
          /* Special handling for better list selection */
          .rich-text-editor li > * {
            display: inline;
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
          
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
          .rich-text-editor em::selection,
          .rich-text-editor i::selection {
            background-color: #1d4ed8 !important;
            color: white !important;
          }
          
          /* Ensure all content is selectable */
          .rich-text-editor * {
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            user-select: text;
            position: relative;
          }
          
          /* Special handling for better list selection */
          .rich-text-editor li > * {
            display: inline;
            -webkit-user-select: text;
            -khtml-user-select: text;
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
          
          /* Ensure consistent selection across browsers */
          .rich-text-editor {
            -webkit-touch-callout: text;
            -webkit-user-select: text;
            -khtml-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            user-select: text;
          }
        `}
      </style>
    </div>
  );
};

