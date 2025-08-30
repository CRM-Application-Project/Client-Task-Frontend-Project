"use client";

import { useState, useEffect } from "react";
import { updateDepartment } from "@/app/services/data.service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Pencil } from "lucide-react";

interface UpdateDepartmentModalProps {
  department: {
    id: number;
    name: string;
  };
  onSuccess?: () => void;
}

export default function UpdateDepartmentModal({
  department,
  onSuccess,
}: UpdateDepartmentModalProps) {
  const [name, setName] = useState(department.name || "");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset values when modal opens
  useEffect(() => {
    if (open) {
      setName(department.name || "");
      setError(null);
    }
  }, [open, department]);

  // Validate name instantly
  useEffect(() => {
    const trimmed = name.trim();

    if (!trimmed) {
      setError("Department name is required");
    } else if (trimmed === department.name.trim()) {
      setError("Name must be different from the current one");
    } else if (trimmed.length < 2) {
      setError("Name must be at least 2 characters");
    } else if (trimmed.length > 50) {
      setError("Name cannot exceed 50 characters");
    } else if (!/^[A-Za-z0-9\s\-&]+$/.test(trimmed)) {
      setError("Only letters, numbers, spaces, - and & are allowed");
    } else {
      setError(null);
    }
  }, [name, department.name]);

  const handleUpdate = async () => {
    if (error) return;

    setLoading(true);
    try {
      const res = await updateDepartment(department.id, { name: name.trim() });
      if (res.isSuccess) {
        toast({ title: "Success", description: res.message });
        setOpen(false);
        if (onSuccess) onSuccess();
      } else {
        // 👇 Inline error under field
        setError(res.message || "Failed to update department");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update department");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>Update Department</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name field */}
          <div className="space-y-2">
            <Label htmlFor="name">Department Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter department name"
              className={`outline-none border ${
                error ? "border-red-500" : "border-gray-300"
              } rounded-md p-2`}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleUpdate}
              disabled={loading || !!error}
              className={loading || !!error ? "btn-disabled" : ""}
            >
              {loading ? "Updating..." : "Update"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
