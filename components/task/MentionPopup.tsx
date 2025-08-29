"use client";
import { AssignDropdown } from "@/app/services/data.service";
import { User } from "lucide-react";
import { useEffect, useRef } from "react";

export function MentionPopup({
  users,
  onSelect,
  position,
}: {
  users: AssignDropdown[];
  onSelect: (user: AssignDropdown) => void;
  position: { top: number; left: number };
}) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Ensure the popup stays within viewport
    if (popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      if (rect.bottom > window.innerHeight) {
        popupRef.current.style.top = `${position.top - rect.height}px`;
      }
      if (rect.right > window.innerWidth) {
        popupRef.current.style.left = `${position.left - rect.width}px`;
      }
    }
  }, [position]);

  return (
    <div
      ref={popupRef}
      className="absolute z-50 bg-white border rounded-md shadow-md max-h-60 overflow-y-auto"
      style={{ top: position.top, left: position.left }}
    >
      {users.length === 0 ? (
        <div className="p-2 text-sm text-gray-500">No users found</div>
      ) : (
        users.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer"
            onClick={() => onSelect(user)}
          >
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-sm">{user.label}</span>
          </div>
        ))
      )}
    </div>
  );
}