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
    description?: string;
  };
  onSuccess?: () => void;
}

export default function UpdateDepartmentModal({
  department,
  onSuccess,
}: UpdateDepartmentModalProps) {
  const [name, setName] = useState(department.name || "");
  const [description, setDescription] = useState(department.description || "");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setName(department.name || "");
      setDescription(department.description || "");
    }
  }, [open, department]);

  const handleUpdate = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Department name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await updateDepartment(department.id, { name, description });
      if (res.isSuccess) {
        toast({ title: "Success", description: res.message });
        setOpen(false); // Close modal
        if (onSuccess) onSuccess();
      } else {
        toast({
          title: "Error",
          description: res.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update department",
        variant: "destructive",
      });
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

      <DialogContent>
        <DialogHeader className="flex items-center justify-between">
          <DialogTitle>Update Department</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Department Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter department name"
            />
          </div>

          {/* <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
            />
          </div> */}

          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleUpdate} disabled={loading}>
              {loading ? "Updating..." : "Update"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
