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
  getRoleScopeDropdown,
  RoleScope,
} from "@/app/services/data.service";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { X, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const [roles, setRoles] = useState<RoleScope[]>([]);
  const [dateOfBirth, setDateOfBirth] = useState<Date>();
  const [dateOfJoin, setDateOfJoin] = useState<Date>();
  const [departments, setDepartments] = useState<
    { id: number; name: string }[]
  >([]);
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [sendMail, setSendMail] = useState(true);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    emailAddress: "",
    contactNumber: "",
    userRole: "",
    departmentId: 0,
    isActive: true,
    password: "",
    moduleAccess: [] as {
      moduleId: number;
      moduleName: string;
      canView: boolean;
      canEdit: boolean;
      canDelete: boolean;
      canCreate: boolean;
    }[],
  });

  const formatText = (text: string) => {
    return text
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // fetch modules
        const moduleRes = await getModuleDropdown();
        if (moduleRes.isSuccess) {
          setModules(moduleRes.data);
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
            departmentId: 0,
          }));
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to fetch departments",
          });
        }

        // fetch roles
        const roleRes = await getRoleScopeDropdown();
        if (roleRes.isSuccess) {
          setRoles(roleRes.data);
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to fetch roles",
          });
        }
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Error loading data",
        });
      }
    };

    if (isOpen) {
      fetchData();
      // Reset form when modal opens
      setFormData({
        firstName: "",
        lastName: "",
        emailAddress: "",
        contactNumber: "",
        userRole: "",
        departmentId: 0,
        isActive: true,
        password: "",
        moduleAccess: [],
      });
      setDateOfBirth(undefined);
      setDateOfJoin(undefined);
      setSelectedModule(null);
      setSendMail(true);
    }
  }, [isOpen, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate password field if sendMail is false
    if (!sendMail && !formData.password) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Password is required when not sending email",
      });
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        dateOfBirth: dateOfBirth ? format(dateOfBirth, "yyyy-MM-dd") : "",
        dateOfJoin: dateOfJoin ? format(dateOfJoin, "yyyy-MM-dd") : "",
        moduleAccess: formData.moduleAccess.filter(
          (m) => m.canView || m.canEdit || m.canDelete || m.canCreate
        ),
        sendMail,
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
          description: "Failed to create staff user",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.message || "An error occurred while creating staff user",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleModuleAccessChange = (
    moduleId: number,
    field: "canView" | "canEdit" | "canDelete" | "canCreate",
    value: boolean
  ) => {
    setFormData((prev) => {
      const updatedModuleAccess = prev.moduleAccess.map((module) => {
        if (module.moduleId === moduleId) {
          const updatedModule = { ...module, [field]: value };

          // Ensure edit/delete permissions require create permission
          if (
            (field === "canEdit" || field === "canDelete") &&
            value &&
            !updatedModule.canCreate
          ) {
            updatedModule.canCreate = true;
            toast({
              title: "Permission Dependency",
              description:
                "Create permission is required for edit/delete operations",
              variant: "default",
            });
          }

          // If create permission is removed, also remove edit and delete
          if (field === "canCreate" && !value) {
            updatedModule.canEdit = false;
            updatedModule.canDelete = false;
            toast({
              title: "Permission Dependency",
              description:
                "Edit and delete permissions require create permission",
              variant: "default",
            });
          }

          return updatedModule;
        }
        return module;
      });

      return { ...prev, moduleAccess: updatedModuleAccess };
    });
  };

  const addModule = () => {
    if (!selectedModule) return;

    const module = modules.find((m) => m.id === selectedModule);
    if (!module) return;

    // Check if module already exists
    if (formData.moduleAccess.some((ma) => ma.moduleId === selectedModule)) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Module already added",
      });
      return;
    }

    setFormData((prev) => ({
      ...prev,
      moduleAccess: [
        ...prev.moduleAccess,
        {
          moduleId: module.id,
          moduleName: module.name,
          canView: true,
          canEdit: false,
          canDelete: false,
          canCreate: false,
        },
      ],
    }));

    setSelectedModule(null);
  };

  const removeModule = (moduleId: number) => {
    setFormData((prev) => ({
      ...prev,
      moduleAccess: prev.moduleAccess.filter((ma) => ma.moduleId !== moduleId),
    }));
  };

  const getAvailableModules = () => {
    return modules.filter(
      (module) => !formData.moduleAccess.some((ma) => ma.moduleId === module.id)
    );
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

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Personal Info */}
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="Enter first name"
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
                placeholder="Enter last name"
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
                placeholder="Enter email"
                value={formData.emailAddress}
                onChange={(e) =>
                  setFormData({ ...formData, emailAddress: e.target.value })
                }
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">Contact Number</Label>
              <Input
                id="contact"
                placeholder="Enter contact number"
                value={formData.contactNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setFormData({ ...formData, contactNumber: value });
                }}
                maxLength={10}
                minLength={10}
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">
                Password {!sendMail && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                autoComplete="new-password"
                required={!sendMail}
              />
            </div>

            {/* Dates */}
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Popover>
                <DatePicker
                  className="w-full h-10 rounded-md border px-3"
                  style={{ width: "100%" }}
                  value={dateOfBirth ? dayjs(dateOfBirth) : null}
                  onChange={(date) =>
                    setDateOfBirth(date ? date.toDate() : undefined)
                  }
                  disabledDate={(current) =>
                    current && current > dayjs().endOf("day")
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
                  className="w-full h-10 rounded-md border px-3"
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
                  {roles.map((role) => (
                    <SelectItem key={role.role} value={role.role}>
                      <span className="text-lg">{formatText(role.role)}</span>{" "}
                      <span className="text-gray-500 text-xs">
                        {formatText(role.scope)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={
                  formData.departmentId ? formData.departmentId.toString() : ""
                }
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

            {/* Send Mail Checkbox */}
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="sendMail"
                checked={sendMail}
                onCheckedChange={(checked) => setSendMail(Boolean(checked))}
              />
              <Label htmlFor="sendMail">Send email with credentials</Label>
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

            {/* Add Module Section */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-2">
                <Label>Select Module</Label>
                <Select
                  value={selectedModule ? selectedModule.toString() : ""}
                  onValueChange={(value) => setSelectedModule(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a module" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableModules().map((module) => (
                      <SelectItem key={module.id} value={module.id.toString()}>
                        <span className="font-medium capitalize">
                          {module.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" onClick={addModule}>
                Add Module
              </Button>
            </div>

            {/* Added Modules */}
            {formData.moduleAccess.length > 0 && (
              <div className="border rounded-md p-4">
                <h3 className="font-medium mb-3">Added Modules</h3>
                <div className="space-y-4">
                  {formData.moduleAccess.map((moduleAccess) => {
                    const module = modules.find(
                      (m) => m.id === moduleAccess.moduleId
                    );
                    return (
                      <div
                        key={moduleAccess.moduleId}
                        className="border rounded p-3 relative"
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 h-6 w-6 p-0"
                          onClick={() => removeModule(moduleAccess.moduleId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>

                        <div className="font-medium mb-2">
                          {module?.name || moduleAccess.moduleName}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {/* View Permission */}
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`${moduleAccess.moduleId}-canView`}
                              checked={moduleAccess.canView}
                              onCheckedChange={(checked) =>
                                handleModuleAccessChange(
                                  moduleAccess.moduleId,
                                  "canView",
                                  Boolean(checked)
                                )
                              }
                            />
                            <Label htmlFor={`${moduleAccess.moduleId}-canView`}>
                              View
                            </Label>
                          </div>

                          {/* Create Permission */}
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`${moduleAccess.moduleId}-canCreate`}
                              checked={moduleAccess.canCreate}
                              onCheckedChange={(checked) =>
                                handleModuleAccessChange(
                                  moduleAccess.moduleId,
                                  "canCreate",
                                  Boolean(checked)
                                )
                              }
                            />
                            <Label
                              htmlFor={`${moduleAccess.moduleId}-canCreate`}
                            >
                              Create
                            </Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertCircle className="h-3 w-3 text-amber-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Required for Edit/Delete permissions</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>

                          {/* Edit Permission */}
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`${moduleAccess.moduleId}-canEdit`}
                              checked={moduleAccess.canEdit}
                              onCheckedChange={(checked) =>
                                handleModuleAccessChange(
                                  moduleAccess.moduleId,
                                  "canEdit",
                                  Boolean(checked)
                                )
                              }
                              disabled={!moduleAccess.canCreate}
                              className={
                                !moduleAccess.canCreate ? "opacity-50" : ""
                              }
                            />
                            <Label
                              htmlFor={`${moduleAccess.moduleId}-canEdit`}
                              className={
                                !moduleAccess.canCreate ? "text-gray-500" : ""
                              }
                            >
                              Edit
                            </Label>
                            {!moduleAccess.canCreate && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertCircle className="h-3 w-3 text-amber-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Requires Create permission</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>

                          {/* Delete Permission */}
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`${moduleAccess.moduleId}-canDelete`}
                              checked={moduleAccess.canDelete}
                              onCheckedChange={(checked) =>
                                handleModuleAccessChange(
                                  moduleAccess.moduleId,
                                  "canDelete",
                                  Boolean(checked)
                                )
                              }
                              disabled={!moduleAccess.canCreate}
                              className={
                                !moduleAccess.canCreate ? "opacity-50" : ""
                              }
                            />
                            <Label
                              htmlFor={`${moduleAccess.moduleId}-canDelete`}
                              className={
                                !moduleAccess.canCreate ? "text-gray-500" : ""
                              }
                            >
                              Delete
                            </Label>
                            {!moduleAccess.canCreate && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertCircle className="h-3 w-3 text-amber-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Requires Create permission</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
