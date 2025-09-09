"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

 export const RichTextEditor = ({ value, onChange, placeholder, className }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [textAlignment, setTextAlignment] = useState<string>('left');

  // Comprehensive emoji collection
  const emojiCategories = {
    "Frequently Used": ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😔", "😪"],
    "Gestures": ["👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👋", "🤚", "🖐️", "✋", "🖖", "👏", "🙌", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄", "💋"],
    "Symbols": ["✅", "❌", "⚡", "🛡️", "🎯", "🚀", "⭐", "🔥", "💡", "🔧", "📊", "📱", "💻", "🌟", "⚠️", "🎉", "📝", "🔍", "🎨", "🔒", "📈", "⏰", "🏆", "🎪", "💎", "🔑", "🎁", "🏅", "🎊", "💥", "✨", "🌈", "⭐", "🔮", "💫", "🌙", "☀️", "⭐", "🌟"],
    "Objects": ["📱", "💻", "🖥️", "⌨️", "🖱️", "🖨️", "📷", "📹", "🎥", "📞", "☎️", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🕹️", "💾", "💿", "📀", "💽", "💻", "📱", "☎️", "📞", "📟", "📠", "📺", "📻", "🎙️", "⏰", "⏲️", "⏱️", "🕰️", "📡", "🔋", "🔌", "💡", "🔦", "🕯️", "🧯", "🛢️"],
    "Activities": ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥽", "🥼", "🦺", "⛷️", "🏂", "🪂", "🏋️", "🤼", "🤸", "⛹️", "🤺", "🤾", "🏌️", "🏇", "🧘", "🏃", "🚶", "🧎", "🧍"]
  };

  // Check active formats
  const checkActiveFormats = () => {
    if (!editorRef.current) return;
    
    const newActiveFormats = new Set<string>();
    const alignmentCommands: Record<string, string> = {
      'justifyLeft': 'left',
      'justifyCenter': 'center',
      'justifyRight': 'right',
      'justifyFull': 'justify'
    };
    
    // Check text formatting
    if (document.queryCommandState('bold')) newActiveFormats.add('bold');
    if (document.queryCommandState('italic')) newActiveFormats.add('italic');
    if (document.queryCommandState('underline')) newActiveFormats.add('underline');
    if (document.queryCommandState('strikeThrough')) newActiveFormats.add('strikeThrough');
    
    // Check alignment
    for (const [command, alignment] of Object.entries(alignmentCommands)) {
      if (document.queryCommandState(command)) {
        newActiveFormats.add(alignment);
        setTextAlignment(alignment);
        break;
      }
    }
    
    // Check lists
    if (document.queryCommandState('insertUnorderedList')) newActiveFormats.add('unorderedList');
    if (document.queryCommandState('insertOrderedList')) newActiveFormats.add('orderedList');
    
    setActiveFormats(newActiveFormats);
  };

  // Initialize editor content only once
  useEffect(() => {
    if (editorRef.current && !isInitialized) {
      if (value) {
        if (value.includes('<')) {
          editorRef.current.innerHTML = value;
        } else {
          editorRef.current.innerHTML = value.replace(/\n/g, '<br>');
        }
      } else {
        editorRef.current.innerHTML = '';
      }
      setIsInitialized(true);
    }
  }, [value, isInitialized]);

  // Reset initialization when modal reopens
  useEffect(() => {
    setIsInitialized(false);
  }, []);

  const handleInput = (e: any) => {
    if (editorRef.current) {
      const htmlContent = editorRef.current.innerHTML;
      onChange(htmlContent);
      checkActiveFormats();
    }
  };



  // Add event listener for selection changes


  const executeFormat = (command: string, value?: string) => {
    // Ensure the editor is focused
    editorRef.current?.focus();
    
    // Execute the command
    const success = document.execCommand(command, false, value);
    
    if (!success && command === 'bold') {
      // Fallback for bold if execCommand fails
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (!range.collapsed) {
          const bold = document.createElement('strong');
          try {
            range.surroundContents(bold);
          } catch (e) {
            bold.appendChild(range.extractContents());
            range.insertNode(bold);
          }
        }
      }
    }
    
    // Trigger change event
    setTimeout(() => {
      handleInput(null);
      checkActiveFormats();
    }, 10);
  };

  const insertAtCursor = (html: string) => {
    editorRef.current?.focus();
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let range = selection.getRangeAt(0);
      range.deleteContents();
      
      const div = document.createElement('div');
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
    
    handleInput(null);
  };

  const insertEmoji = (emoji: string) => {
    insertAtCursor(emoji);
    setShowEmojiPicker(false);
  };

const toggleList = (ordered: boolean) => {
  editorRef.current?.focus();
  
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  
  // Check if we're already in a list of the same type
  let listParent = findParentList(range.commonAncestorContainer as HTMLElement);
  
  if (listParent) {
    // If we're in a list of the same type, toggle it off
    if ((ordered && listParent.tagName === 'OL') || (!ordered && listParent.tagName === 'UL')) {
      // Convert list items to paragraphs
      const listItems = Array.from(listParent.querySelectorAll('li'));
      listItems.forEach(li => {
        const p = document.createElement('p');
        p.innerHTML = li.innerHTML;
        li.parentNode?.replaceChild(p, li);
      });
      
      // Remove the empty list
      listParent.parentNode?.removeChild(listParent);
    } else {
      // Convert to the other list type
      convertListType(listParent, ordered ? 'OL' : 'UL');
    }
  } else {
    // Create a new list
    const list = document.createElement(ordered ? 'ol' : 'ul');
    const listItem = document.createElement('li');
    
    // If there's selected text, put it in the list item
    if (!range.collapsed) {
      listItem.appendChild(range.extractContents());
    } else {
      // Add a zero-width space to make the list item visible
      listItem.innerHTML = '&#8203;';
    }
    
    list.appendChild(listItem);
    range.insertNode(list);
    
    // Place cursor inside the list item
    const newRange = document.createRange();
    newRange.setStart(listItem, 0);
    newRange.setEnd(listItem, 0);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
  
  handleInput(null);
  checkActiveFormats();
};

// Helper function to find if an element is inside a list
const findParentList = (element: HTMLElement): HTMLElement | null => {
  let parent = element.parentElement;
  while (parent && parent !== editorRef.current) {
    if (parent.tagName === 'UL' || parent.tagName === 'OL') {
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
    
    // Create a new paragraph with the numbered list prefix
    const p = document.createElement('p');
    p.innerHTML = '1. ';
    
    // Insert it at the cursor position
    range.insertNode(p);
    
    // Move cursor after the "1. "
    const newRange = document.createRange();
    newRange.setStart(p, 1);
    newRange.setEnd(p, 1);
    selection.removeAllRanges();
    selection.addRange(newRange);
    
    handleInput(null);
  }
};

const insertBulletList = () => {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    
    // Create a new paragraph with the bullet list prefix
    const p = document.createElement('p');
    p.innerHTML = '• ';
    
    // Insert it at the cursor position
    range.insertNode(p);
    
    // Move cursor after the "• "
    const newRange = document.createRange();
    newRange.setStart(p, 1);
    newRange.setEnd(p, 1);
    selection.removeAllRanges();
    selection.addRange(newRange);
    
    handleInput(null);
  }
};

// Replace the toggleList function with these simpler functions
// Remove the old toggleList, findParentList, and convertListType functions
// Helper function to convert list type
const convertListType = (listElement: HTMLElement, newType: string) => {
  const newList = document.createElement(newType);
  
  // Copy all list items to the new list
  while (listElement.firstChild) {
    const listItem = document.createElement('li');
    listItem.innerHTML = (listElement.firstChild as HTMLElement).innerHTML;
    newList.appendChild(listItem);
    listElement.removeChild(listElement.firstChild);
  }
  
  // Replace the old list with the new one
  listElement.parentNode?.replaceChild(newList, listElement);
};
// Empty dependency array since checkActiveFormats doesn't change

// Add event listener for selection changes
const handleSelectionChange = useCallback(() => {
  checkActiveFormats();
}, []); // Empty dependency array since checkActiveFormats doesn't change

// Add event listener for selection changes
useEffect(() => {
  document.addEventListener('selectionchange', handleSelectionChange);
  return () => {
    document.removeEventListener('selectionchange', handleSelectionChange);
  };
}, [handleSelectionChange]); // Now this dependency is stable // Now this dependency is stable
  const setAlignment = (alignment: string) => {
    const commands: Record<string, string> = {
      'left': 'justifyLeft',
      'center': 'justifyCenter',
      'right': 'justifyRight',
      'justify': 'justifyFull'
    };
    executeFormat(commands[alignment]);
  };

  const addLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      executeFormat('createLink', url);
    }
  };

  const addImage = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      executeFormat('insertImage', url);
    }
  };

  const makeHeading = () => {
    executeFormat('formatBlock', 'H3');
  };

  const addHorizontalRule = () => {
    executeFormat('insertHorizontalRule');
  };

  return (
    <div className={`border border-gray-200 rounded-md bg-white ${className}`}>
      {/* Comprehensive Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-gray-100 border-b">
        {/* Text Formatting Group */}
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant={activeFormats.has('bold') ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeFormat('bold')}
            className={`h-8 w-8 p-0 ${activeFormats.has('bold') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={activeFormats.has('italic') ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeFormat('italic')}
            className={`h-8 w-8 p-0 ${activeFormats.has('italic') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={activeFormats.has('underline') ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeFormat('underline')}
            className={`h-8 w-8 p-0 ${activeFormats.has('underline') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
            title="Underline"
          >
            <Underline className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={activeFormats.has('strikeThrough') ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeFormat('strikeThrough')}
            className={`h-8 w-8 p-0 ${activeFormats.has('strikeThrough') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
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
            variant={textAlignment === 'left' ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setAlignment('left')}
            className={`h-8 w-8 p-0 ${textAlignment === 'left' ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={textAlignment === 'center' ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setAlignment('center')}
            className={`h-8 w-8 p-0 ${textAlignment === 'center' ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={textAlignment === 'right' ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setAlignment('right')}
            className={`h-8 w-8 p-0 ${textAlignment === 'right' ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={textAlignment === 'justify' ? "secondary" : "ghost"}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setAlignment('justify')}
            className={`h-8 w-8 p-0 ${textAlignment === 'justify' ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
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
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeFormat('superscript')}
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
            onClick={() => executeFormat('subscript')}
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
            onClick={() => executeFormat('formatBlock', 'pre')}
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
            onClick={() => executeFormat('formatBlock', 'blockquote')}
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
    variant={activeFormats.has('orderedList') ? "secondary" : "ghost"}
    size="sm"
    onMouseDown={(e) => e.preventDefault()}
    onClick={insertNumberedList}
    className={`h-8 w-8 p-0 ${activeFormats.has('orderedList') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
    title="Numbered List"
  >
    <ListOrdered className="h-4 w-4" />
  </Button>
  <Button
    type="button"
    variant={activeFormats.has('unorderedList') ? "secondary" : "ghost"}
    size="sm"
    onMouseDown={(e) => e.preventDefault()}
    onClick={insertBulletList}
    className={`h-8 w-8 p-0 ${activeFormats.has('unorderedList') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
    title="Bullet List"
  >
    <List className="h-4 w-4" />
  </Button>
</div>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Media & Links */}
       

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Emoji Picker */}
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

        {/* Additional Tools */}
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

      {/* Content Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="min-h-[200px] p-4 focus:outline-none text-sm leading-relaxed"
        style={{ wordWrap: 'break-word' }}
        data-placeholder={placeholder}
      />

  
    </div>
  );
};
