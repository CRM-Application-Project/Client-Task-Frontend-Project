"use client";

import { useState, useEffect } from "react";
import { createDepartment } from "@/app/services/data.service";
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
import { Plus } from "lucide-react";

export default function CreateDepartmentModal({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [touched, setTouched] = useState<{ name?: boolean }>({});

  // ✅ validation rules
  const validateField = (value: string) => {
    if (!value.trim())
      return touched.name ? "Department name is required" : undefined;
    if (value.length < 2) return "Name must be at least 2 characters";
    if (value.length > 50) return "Name cannot exceed 50 characters";
    if (!/^[A-Za-z0-9\s\-&]+$/.test(value))
      return "Name can only contain letters, numbers, spaces, - and &";
    return undefined;
  };

  // validate whole form
  const validateForm = () => {
    const newErrors = { name: validateField(name) };
    setErrors(newErrors);
    return !newErrors.name;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const res = await createDepartment({ name: name.trim() });
      if (res.isSuccess) {
        toast({ title: "Success", description: res.message });
        setName("");
        setErrors({}); // clear errors
        setOpen(false);
        if (onSuccess) onSuccess();
      } else {
        // 👇 Instead of just toast, also set field error
        setErrors({ name: res.message });
      }
    } catch (error: any) {
      setErrors({ name: error.message || "Failed to create department" });
    } finally {
      setLoading(false);
    }
  };

  // ✅ live validation
  useEffect(() => {
    if (name) setErrors({ name: validateField(name) });
  }, [name]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-brand-primary text-text-white hover:bg-brand-primary/90">
          <Plus className="h-4 w-4" />
          Add Department
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Department</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name field */}
          <div className="space-y-2">
            <Label htmlFor="name">Department Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                setTouched({ name: true });
                setErrors({ name: validateField(name) });
              }}
              placeholder="Enter department name"
              className={`outline-none border ${
                errors.name ? "border-red-500" : "border-gray-300"
              } rounded-md p-2`}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleCreate}
              disabled={loading || !name.trim() || !!errors.name}
              className={`bg-brand-primary text-text-white hover:bg-brand-primary/90 ${
                loading || !name.trim() || !!errors.name ? "btn-disabled" : ""
              }`}
            >
              {loading ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
