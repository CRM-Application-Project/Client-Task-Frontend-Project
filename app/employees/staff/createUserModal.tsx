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

interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  contactNumber?: string;
  userRole?: string;
  departmentId?: string;
  password?: string;
  dateOfBirth?: string;
  dateOfJoin?: string;
  moduleAccess?: string;
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
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
    {}
  );
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [isFormValid, setIsFormValid] = useState(false);

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
    setIsFormValid(validateForm());
  }, [formData, dateOfBirth, dateOfJoin, sendMail]);

  const [dateFieldFocused, setDateFieldFocused] = useState({
    dateOfBirth: false,
    dateOfJoin: false,
  });

  useEffect(() => {
    if (!dateFieldFocused.dateOfBirth && touchedFields.dateOfBirth) {
      const error = validateField("dateOfBirth", dateOfBirth);
      setValidationErrors((prev) => ({ ...prev, dateOfBirth: error }));
    }
  }, [dateOfBirth, touchedFields.dateOfBirth, dateFieldFocused.dateOfBirth]);

  useEffect(() => {
    if (!dateFieldFocused.dateOfJoin && touchedFields.dateOfJoin) {
      const error = validateField("dateOfJoin", dateOfJoin);
      setValidationErrors((prev) => ({ ...prev, dateOfJoin: error }));
    }
  }, [dateOfJoin, touchedFields.dateOfJoin, dateFieldFocused.dateOfJoin]);

  // Update handleDateChange to handle focus state
  const handleDateChange = (field: string, date: dayjs.Dayjs | null) => {
    const dateValue = date ? date.toDate() : undefined;

    if (field === "dateOfBirth") {
      setDateOfBirth(dateValue);
    } else if (field === "dateOfJoin") {
      setDateOfJoin(dateValue);
    }

    // Mark field as touched
    setTouchedFields((prev) => ({ ...prev, [field]: true }));

    // Validate immediately when date changes
    const error = validateField(field, dateValue);
    setValidationErrors((prev) => ({ ...prev, [field]: error }));
  };

  // Add handlers for date picker focus/blur
  const handleDateFocus = (field: string) => {
    setDateFieldFocused((prev) => ({ ...prev, [field]: true }));
  };

  const handleDateBlur = (field: string) => {
    setDateFieldFocused((prev) => ({ ...prev, [field]: false }));
    setTouchedFields((prev) => ({ ...prev, [field]: true }));

    // Validate the field
    let value;
    if (field === "dateOfBirth") value = dateOfBirth;
    else if (field === "dateOfJoin") value = dateOfJoin;

    const error = validateField(field, value);
    setValidationErrors((prev) => ({ ...prev, [field]: error }));
  };

  // Validation functions
  const validateField = (name: string, value: any): string | undefined => {
    switch (name) {
      case "firstName":
        if (!value || value.trim() === "") return "First name is required";
        if (value.length < 2) return "First name must be at least 2 characters";
        break;
      case "lastName":
        if (!value || value.trim() === "") return "Last name is required";
        // if (value.length < 2) return "Last name must be at least 2 characters";
        break;
      case "emailAddress":
        if (!value || value.trim() === "") return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          return "Please enter a valid email address";
        break;
      case "contactNumber":
        if (!value || value.trim() === "") return "Contact number is required";
        if (!/^\d{10}$/.test(value))
          return "Contact number must be exactly 10 digits";
        break;
      case "userRole":
        if (!value || value.trim() === "") return "User role is required";
        break;
      case "departmentId":
        if (!value || value === 0) return "Department is required";
        break;
      case "password":
        if (!sendMail && (!value || value.trim() === ""))
          return "Password is required when not sending email";
        if (!sendMail && value.length < 8)
          return "Password must be at least 8 characters";
        break;
      case "dateOfBirth":
        if (!value) return "Date of birth is required";
        if (value > new Date()) return "Date of birth cannot be in the future";
        // Check if user is at least 15 years old
        const fifteenYearsAgo = new Date();
        fifteenYearsAgo.setFullYear(fifteenYearsAgo.getFullYear() - 15);
        if (value > fifteenYearsAgo)
          return "User must be at least 15 years old";
        break;
      case "dateOfJoin":
        if (!value) return "Date of join is required";
        if (value > new Date()) return "Date of join cannot be in the future";
        break;
      case "moduleAccess":
        if (formData.moduleAccess.length === 0)
          return "At least one module access is required";
        break;
      default:
        return undefined;
    }
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    errors.firstName = validateField("firstName", formData.firstName);
    errors.lastName = validateField("lastName", formData.lastName);
    errors.emailAddress = validateField("emailAddress", formData.emailAddress);
    errors.contactNumber = validateField(
      "contactNumber",
      formData.contactNumber
    );
    errors.userRole = validateField("userRole", formData.userRole);
    errors.departmentId = validateField("departmentId", formData.departmentId);
    errors.password = validateField("password", formData.password);
    errors.dateOfBirth = validateField("dateOfBirth", dateOfBirth);
    errors.dateOfJoin = validateField("dateOfJoin", dateOfJoin);
    errors.moduleAccess = validateField("moduleAccess", formData.moduleAccess);

    setValidationErrors(errors);

    return !Object.values(errors).some((error) => error !== undefined);
  };

  const handleBlur = (fieldName: string) => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));

    // Validate the field that was just blurred
    let error: string | undefined;

    if (fieldName === "dateOfBirth") {
      error = validateField("dateOfBirth", dateOfBirth);
    } else if (fieldName === "dateOfJoin") {
      error = validateField("dateOfJoin", dateOfJoin);
    } else if (fieldName === "moduleAccess") {
      error = validateField("moduleAccess", formData.moduleAccess);
    } else {
      error = validateField(
        fieldName,
        formData[fieldName as keyof typeof formData]
      );
    }

    setValidationErrors((prev) => ({ ...prev, [fieldName]: error }));
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
      setTouchedFields({});
      setValidationErrors({});
    }
  }, [isOpen, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched to show all errors
    const allFields = [
      "firstName",
      "lastName",
      "emailAddress",
      "contactNumber",
      "userRole",
      "departmentId",
      "password",
      "dateOfBirth",
      "dateOfJoin",
      "moduleAccess",
    ];

    const touchedAll: Record<string, boolean> = {};
    allFields.forEach((field) => {
      touchedAll[field] = true;
    });
    setTouchedFields(touchedAll);

    // Validate the entire form
    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please Fill all the fields in the form",
      });
      return;
    }

    setLoading(true);

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

    // Validate module access if it's been touched
    if (touchedFields.moduleAccess) {
      const error = validateField("moduleAccess", formData.moduleAccess);
      setValidationErrors((prev) => ({ ...prev, moduleAccess: error }));
    }
  };

  const addModule = () => {
    if (!selectedModule) {
      setValidationErrors((prev) => ({
        ...prev,
        moduleAccess: "Please select a module to add",
      }));
      return;
    }

    const module = modules.find((m) => m.id === selectedModule);
    if (!module) return;

    // Check if module already exists
    if (formData.moduleAccess.some((ma) => ma.moduleId === selectedModule)) {
      setValidationErrors((prev) => ({
        ...prev,
        moduleAccess: "Module already added",
      }));
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

    // Clear module access error if we've added one
    if (validationErrors.moduleAccess) {
      setValidationErrors((prev) => ({ ...prev, moduleAccess: undefined }));
    }
  };

  const removeModule = (moduleId: number) => {
    setFormData((prev) => ({
      ...prev,
      moduleAccess: prev.moduleAccess.filter((ma) => ma.moduleId !== moduleId),
    }));

    // Validate module access if it's been touched
    if (touchedFields.moduleAccess) {
      const error = validateField("moduleAccess", formData.moduleAccess);
      setValidationErrors((prev) => ({ ...prev, moduleAccess: error }));
    }
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
                onBlur={() => handleBlur("firstName")}
                required
                className={
                  touchedFields.firstName && validationErrors.firstName
                    ? "border-red-500"
                    : ""
                }
              />
              {touchedFields.firstName && validationErrors.firstName && (
                <p className="text-red-500 text-xs">
                  {validationErrors.firstName}
                </p>
              )}
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
                onBlur={() => handleBlur("lastName")}
                required
                className={
                  touchedFields.lastName && validationErrors.lastName
                    ? "border-red-500"
                    : ""
                }
              />
              {touchedFields.lastName && validationErrors.lastName && (
                <p className="text-red-500 text-xs">
                  {validationErrors.lastName}
                </p>
              )}
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
                onBlur={() => handleBlur("emailAddress")}
                autoComplete="email"
                required
                className={
                  touchedFields.emailAddress && validationErrors.emailAddress
                    ? "border-red-500"
                    : ""
                }
              />
              {touchedFields.emailAddress && validationErrors.emailAddress && (
                <p className="text-red-500 text-xs">
                  {validationErrors.emailAddress}
                </p>
              )}
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
                onBlur={() => handleBlur("contactNumber")}
                maxLength={10}
                minLength={10}
                required
                className={
                  touchedFields.contactNumber && validationErrors.contactNumber
                    ? "border-red-500"
                    : ""
                }
              />
              {touchedFields.contactNumber &&
                validationErrors.contactNumber && (
                  <p className="text-red-500 text-xs">
                    {validationErrors.contactNumber}
                  </p>
                )}
            </div>
            {/* Password Field */}
            {/* <div className="space-y-2">
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
                onBlur={() => handleBlur("password")}
                autoComplete="new-password"
                required={!sendMail}
                className={
                  touchedFields.password && validationErrors.password
                    ? "border-red-500"
                    : ""
                }
              />
              {touchedFields.password && validationErrors.password && (
                <p className="text-red-500 text-xs">
                  {validationErrors.password}
                </p>
              )}
            </div> */}
            {/* Dropdowns */}
            <div className="space-y-2">
              <Label>User Role</Label>
              <Select
                value={formData.userRole}
                onValueChange={(value) =>
                  setFormData({ ...formData, userRole: value })
                }
                onOpenChange={(open) => {
                  if (!open) handleBlur("userRole");
                }}
              >
                <SelectTrigger
                  className={
                    touchedFields.userRole && validationErrors.userRole
                      ? "border-red-500"
                      : ""
                  }
                >
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
              {touchedFields.userRole && validationErrors.userRole && (
                <p className="text-red-500 text-xs">
                  {validationErrors.userRole}
                </p>
              )}
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
                onOpenChange={(open) => {
                  if (!open) handleBlur("departmentId");
                }}
              >
                <SelectTrigger
                  className={
                    touchedFields.departmentId && validationErrors.departmentId
                      ? "border-red-500"
                      : ""
                  }
                >
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
              {touchedFields.departmentId && validationErrors.departmentId && (
                <p className="text-red-500 text-xs">
                  {validationErrors.departmentId}
                </p>
              )}
            </div>

            {/* Dates */}
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <DatePicker
                className={`w-full h-10 rounded-md border px-3 ${
                  touchedFields.dateOfBirth && validationErrors.dateOfBirth
                    ? "border-red-500"
                    : ""
                }`}
                style={{ width: "100%" }}
                value={dateOfBirth ? dayjs(dateOfBirth) : null}
                onChange={(date) => handleDateChange("dateOfBirth", date)}
                onFocus={() => handleDateFocus("dateOfBirth")}
                onBlur={() => handleDateBlur("dateOfBirth")}
                disabledDate={(current) => {
                  if (current && current > dayjs().endOf("day")) {
                    return true;
                  }
                  const fifteenYearsAgo = dayjs().subtract(15, "year");
                  return current && current > fifteenYearsAgo;
                }}
                format="YYYY-MM-DD"
                getPopupContainer={(trigger) => trigger.parentElement!}
                defaultPickerValue={dayjs().subtract(15, "year")}
              />
              {touchedFields.dateOfBirth && validationErrors.dateOfBirth && (
                <p className="text-red-500 text-xs">
                  {validationErrors.dateOfBirth}
                </p>
              )}
            </div>

            {/* Date of Join */}
            <div className="space-y-2">
              <Label>Date of Join</Label>
              <DatePicker
                className={`w-full h-10 rounded-md border px-3 ${
                  touchedFields.dateOfJoin && validationErrors.dateOfJoin
                    ? "border-red-500"
                    : ""
                }`}
                style={{ width: "100%" }}
                value={dateOfJoin ? dayjs(dateOfJoin) : null}
                onChange={(date) => handleDateChange("dateOfJoin", date)}
                onFocus={() => handleDateFocus("dateOfJoin")}
                onBlur={() => handleDateBlur("dateOfJoin")}
                format="YYYY-MM-DD"
                getPopupContainer={(trigger) => trigger.parentElement!}
              />
              {touchedFields.dateOfJoin && validationErrors.dateOfJoin && (
                <p className="text-red-500 text-xs">
                  {validationErrors.dateOfJoin}
                </p>
              )}
            </div>

            {/* Send Mail Checkbox */}
            {/* <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="sendMail"
                checked={sendMail}
                onCheckedChange={(checked) => setSendMail(Boolean(checked))}
              />
              <Label htmlFor="sendMail">Send email with credentials</Label>
            </div> */}
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
                          {formatText(module.name)}
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
                          {formatText(module?.name || moduleAccess.moduleName)}
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

            {touchedFields.moduleAccess && validationErrors.moduleAccess && (
              <p className="text-red-500 text-xs">
                {validationErrors.moduleAccess}
              </p>
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
            <Button
              type="submit"
              disabled={loading || !isFormValid}
              className={!isFormValid ? "btn-disabled" : ""}
            >
              {loading ? "Creating..." : "Create Staff User"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
