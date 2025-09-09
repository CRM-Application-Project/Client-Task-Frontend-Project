import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
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

// Rich Text Editor Component
interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export const RichTextEditor = ({
  value,
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

  // Fixed insertAtCursor function with proper cursor positioning
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

  // Fixed list implementation with proper numbering
  const insertNumberedList = () => {
  editorRef.current?.focus();
  
  // Use browser's native command
  document.execCommand("insertOrderedList");
  
  // Force re-render to update active formats
  setTimeout(() => {
    handleInput();
    checkActiveFormats();
  }, 10);
};

const insertBulletList = () => {
  editorRef.current?.focus();
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
        // Check if we're in a list item
        let currentNode = selection.anchorNode;
        let listItem = null;
        
        while (currentNode && currentNode !== editorRef.current) {
          if (currentNode.nodeType === Node.ELEMENT_NODE && (currentNode as HTMLElement).tagName === 'LI') {
            listItem = currentNode as HTMLElement;
            break;
          }
          currentNode = currentNode.parentNode;
        }
        
        if (listItem) {
          const isEmpty = !listItem.textContent?.trim() || listItem.innerHTML === '&nbsp;';
          
          if (isEmpty) {
            // Empty list item - exit list
            e.preventDefault();
            const listElement = listItem.parentElement;
            const div = document.createElement('div');
            div.innerHTML = '<br>';
            listElement?.parentNode?.insertBefore(div, listElement.nextSibling);
            listItem.remove();
            
            // If list is now empty, remove it
            if (listElement && !listElement.children.length) {
              listElement.remove();
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

  return (
    <div className={`border border-gray-200 rounded-md bg-white ${className}`}>
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
            variant={activeFormats.has("orderedList") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={insertNumberedList}
            className={`h-8 w-8 p-0 ${
              activeFormats.has("orderedList") ? "bg-gray-300" : "hover:bg-gray-200"
            }`}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={activeFormats.has("unorderedList") ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={insertBulletList}
            className={`h-8 w-8 p-0 ${
              activeFormats.has("unorderedList") ? "bg-gray-300" : "hover:bg-gray-200"
            }`}
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
        onKeyDown={handleKeyDown}
        className="p-4 focus:outline-none text-sm leading-relaxed rich-text-editor"
        style={{ 
          wordWrap: "break-word",
          minHeight: minHeight
        }}
        data-placeholder={placeholder}
      />
      
      {/* Enhanced CSS for proper list styling and cursor behavior */}
      <style>
        {`
          .rich-text-editor ul {
            list-style-type: disc;
            padding-left: 1.5rem;
            margin: 0.5rem 0;
          }
          
          .rich-text-editor ol {
            list-style-type: decimal;
            padding-left: 1.5rem;
            margin: 0.5rem 0;
            counter-reset: list-counter;
          }
          
          .rich-text-editor ol li {
            margin: 0.25rem 0;
            list-style: decimal;
          }
          
          .rich-text-editor ul li {
            margin: 0.25rem 0;
            list-style: disc;
          }
          
          .rich-text-editor li {
            display: list-item;
          }
          
          .rich-text-editor [data-placeholder]:empty:before {
            content: attr(data-placeholder);
            color: #9ca3af;
            font-style: italic;
            pointer-events: none;
          }
          
          .rich-text-editor:focus {
            outline: none;
          }
          
          /* Ensure proper cursor positioning */
          .rich-text-editor * {
            position: relative;
          }
        `}
      </style>
    </div>
  );
};