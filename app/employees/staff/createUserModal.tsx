"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  createStaffUser,
  getModuleDropdown,
  Module,
  getDepartments,
} from "@/app/services/data.service";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import { Popover, PopoverContent } from "@/components/ui/popover";

interface CreateStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  departments: { id: number; name: string }[];
}

export function CreateStaffModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateStaffModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [modules, setModules] = useState<Module[]>([]);
  const [dateOfBirth, setDateOfBirth] = useState<Date>();
  const [dateOfJoin, setDateOfJoin] = useState<Date>();
  const [departments, setDepartments] = useState<
    { id: number; name: string }[]
  >([]);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    emailAddress: "",
    contactNumber: "",
    userRole: "STAFF",
    departmentId: 0,
    isActive: true,
    moduleAccess: [] as {
      moduleId: number;
      canView: boolean;
      canEdit: boolean;
      canDelete: boolean;
    }[],
  });

  useEffect(() => {
    const fetchModulesAndDepartments = async () => {
      try {
        // fetch modules
        const moduleRes = await getModuleDropdown();
        if (moduleRes.isSuccess) {
          setModules(moduleRes.data);
          setFormData((prev) => ({
            ...prev,
            moduleAccess: moduleRes.data.map((module) => ({
              moduleId: module.id,
              canView: false,
              canEdit: false,
              canDelete: false,
            })),
          }));
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to fetch modules",
          });
        }

        // fetch departments
        const deptRes = await getDepartments();
        if (deptRes.isSuccess) {
          setDepartments(deptRes.data);
          setFormData((prev) => ({
            ...prev,
            departmentId: deptRes.data[0]?.id || 0, // default to first dept
          }));
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to fetch departments",
          });
        }
      } catch {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Error loading data",
        });
      }
    };

    if (isOpen) {
      fetchModulesAndDepartments();
    }
  }, [isOpen, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        dateOfBirth: dateOfBirth ? format(dateOfBirth, "yyyy-MM-dd") : "",
        dateOfJoin: dateOfJoin ? format(dateOfJoin, "yyyy-MM-dd") : "",
      };

      const response = await createStaffUser(payload);

      if (response.isSuccess) {
        toast({
          title: "Success",
          description: "Staff user created successfully",
        });
        onSuccess();
        onClose();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to create staff user",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while creating staff user",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleModuleAccessChange = (
    moduleId: number,
    field: "canView" | "canEdit" | "canDelete",
    value: boolean
  ) => {
    setFormData((prev) => {
      const updatedModuleAccess = prev.moduleAccess.map((module) =>
        module.moduleId === moduleId ? { ...module, [field]: value } : module
      );
      return { ...prev, moduleAccess: updatedModuleAccess };
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Create New Staff User</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Personal Info */}
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.emailAddress}
                onChange={(e) =>
                  setFormData({ ...formData, emailAddress: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">Contact Number</Label>
              <Input
                id="contact"
                value={formData.contactNumber}
                onChange={(e) =>
                  setFormData({ ...formData, contactNumber: e.target.value })
                }
                required
              />
            </div>

            {/* Dates */}
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Popover>
                <DatePicker
                  style={{ width: "100%" }}
                  value={dateOfBirth ? dayjs(dateOfBirth) : null}
                  onChange={(date) =>
                    setDateOfBirth(date ? date.toDate() : undefined)
                  }
                  format="YYYY-MM-DD"
                  getPopupContainer={(trigger) => trigger.parentElement!}
                />
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Date of Join</Label>
              <Popover>
                <DatePicker
                  style={{ width: "100%" }}
                  value={dateOfJoin ? dayjs(dateOfJoin) : null}
                  onChange={(date) =>
                    setDateOfJoin(date ? date.toDate() : undefined)
                  }
                  format="YYYY-MM-DD"
                  getPopupContainer={(trigger) => trigger.parentElement!}
                />
              </Popover>
            </div>

            {/* Dropdowns */}
            <div className="space-y-2">
              <Label>User Role</Label>
              <Select
                value={formData.userRole}
                onValueChange={(value) =>
                  setFormData({ ...formData, userRole: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={formData.departmentId.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, departmentId: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: Boolean(checked) })
                }
              />
              <Label htmlFor="isActive">Active User</Label>
            </div>
          </div>

          {/* Module Access */}
          <div className="space-y-4">
            <Label className="block">Module Access Permissions</Label>
            <div className="border rounded-md p-4 overflow-x-auto">
              <div className="grid grid-cols-5 gap-2 mb-2 min-w-[500px]">
                <div className="font-medium">Module</div>
                <div className="text-center font-medium">View</div>
                <div className="text-center font-medium">Edit</div>
                <div className="text-center font-medium">Delete</div>
              </div>

              <div className="space-y-2 min-w-[500px]">
                {modules.map((module) => {
                  const moduleAccess = formData.moduleAccess.find(
                    (ma) => ma.moduleId === module.id
                  ) || { canView: false, canEdit: false, canDelete: false };

                  return (
                    <div
                      key={module.id}
                      className="grid grid-cols-5 gap-2 items-center"
                    >
                      <div className="truncate">{module.name}</div>
                      <div className="flex justify-center">
                        <Checkbox
                          checked={moduleAccess.canView}
                          onCheckedChange={(checked) =>
                            handleModuleAccessChange(
                              module.id,
                              "canView",
                              Boolean(checked)
                            )
                          }
                        />
                      </div>
                      <div className="flex justify-center">
                        <Checkbox
                          checked={moduleAccess.canEdit}
                          onCheckedChange={(checked) =>
                            handleModuleAccessChange(
                              module.id,
                              "canEdit",
                              Boolean(checked)
                            )
                          }
                        />
                      </div>
                      <div className="flex justify-center">
                        <Checkbox
                          checked={moduleAccess.canDelete}
                          onCheckedChange={(checked) =>
                            handleModuleAccessChange(
                              module.id,
                              "canDelete",
                              Boolean(checked)
                            )
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Staff User"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}