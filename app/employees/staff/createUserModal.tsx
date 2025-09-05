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

  // ===== Regex patterns (aligned with Register form expectations) =====
  const NAME_REGEX = /^[A-Za-z][A-Za-z\s'.-]{0,49}$/; // letters, spaces, apostrophes, periods, dashes; starts with a letter; up to 50 chars
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
  const PHONE_REGEX = /^\d{10}$/; // exactly 10 digits

  const formatText = (text: string) => {
    return text
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Recompute overall validity on any relevant change
  useEffect(() => {
    setIsFormValid(validateForm());
  }, [formData, dateOfBirth, dateOfJoin, sendMail]);

  const [dateFieldFocused, setDateFieldFocused] = useState({
    dateOfBirth: false,
    dateOfJoin: false,
  });

  // ===== Live validation for dates =====
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

  // ===== Shared live-change handler for text/select fields =====
  const setField = (name: keyof typeof formData, raw: string | number) => {
    let value: any = raw;

    if (name === "firstName" || name === "lastName") {
      // Trim left spaces only; allow internal multiple spaces but validate by regex
      value = String(raw).replace(/^\s+/, "");
    }

    if (name === "contactNumber") {
      value = String(raw).replace(/\D/g, "").slice(0, 10); // keep 10 digits max
    }

    if (name === "departmentId") {
      value = typeof raw === "string" ? parseInt(raw) || 0 : raw;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    setTouchedFields((prev) => ({ ...prev, [name]: true }));

    // live-validate this single field immediately
    const error =
      name === "departmentId"
        ? validateField(name, Number(value))
        : validateField(name as string, value);
    setValidationErrors((prev) => ({ ...prev, [name]: error }));
  };

  // ===== Date handlers (already live) =====
  const handleDateChange = (field: string, date: dayjs.Dayjs | null) => {
    const dateValue = date ? date.toDate() : undefined;
    if (field === "dateOfBirth") setDateOfBirth(dateValue);
    if (field === "dateOfJoin") setDateOfJoin(dateValue);

    setTouchedFields((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, dateValue);
    setValidationErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleDateFocus = (field: string) => {
    setDateFieldFocused((prev) => ({ ...prev, [field]: true }));
  };

  const handleDateBlur = (field: string) => {
    setDateFieldFocused((prev) => ({ ...prev, [field]: false }));
    setTouchedFields((prev) => ({ ...prev, [field]: true }));

    let value;
    if (field === "dateOfBirth") value = dateOfBirth;
    else if (field === "dateOfJoin") value = dateOfJoin;

    const error = validateField(field, value);
    setValidationErrors((prev) => ({ ...prev, [field]: error }));
  };

  // ===== Validation rules =====
  const validateField = (name: string, value: any): string | undefined => {
    switch (name) {
      case "firstName": {
        if (!value || String(value).trim() === "")
          return "First name is required";
        const v = String(value).trim();
        if (v.length < 2) return "First name must be at least 2 characters";
        if (!NAME_REGEX.test(v))
          return "Only letters, spaces, apostrophes, periods, and dashes";
        break;
      }
      case "lastName": {
        if (!value || String(value).trim() === "")
          return "Last name is required";
        const v = String(value).trim();
        if (!NAME_REGEX.test(v))
          return "Only letters, spaces, apostrophes, periods, and dashes";
        break;
      }
      case "emailAddress": {
        if (!value || String(value).trim() === "") return "Email is required";
        if (!EMAIL_REGEX.test(String(value)))
          return "Please enter a valid email address";
        break;
      }
      case "contactNumber": {
        if (!value || String(value).trim() === "")
          return "Contact number is required";
        if (!PHONE_REGEX.test(String(value)))
          return "Contact number must be exactly 10 digits";
        break;
      }
      case "userRole": {
        if (!value || String(value).trim() === "")
          return "User role is required";
        break;
      }
      case "departmentId": {
        if (!value || Number(value) === 0) return "Department is required";
        break;
      }
      case "password": {
        if (!sendMail && (!value || String(value).trim() === ""))
          return "Password is required when not sending email";
        if (!sendMail && String(value).length < 8)
          return "Password must be at least 8 characters";
        break;
      }
      case "dateOfBirth": {
        if (!value) return "Date of birth is required";
        if (value > new Date()) return "Date of birth cannot be in the future";
        const fifteenYearsAgo = new Date();
        fifteenYearsAgo.setFullYear(fifteenYearsAgo.getFullYear() - 15);
        if (value > fifteenYearsAgo)
          return "User must be at least 15 years old";
        break;
      }
      case "dateOfJoin": {
        if (!value) return "Date of join is required";
        // Allow future join dates if desired; uncomment to block future dates
        // if (value > new Date()) return "Date of join cannot be in the future";
        break;
      }
      case "moduleAccess": {
        if (formData.moduleAccess.length === 0)
          return "At least one module access is required";
        break;
      }
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

    let error: string | undefined;

    if (fieldName === "dateOfBirth") {
      error = validateField("dateOfBirth", dateOfBirth);
    } else if (fieldName === "dateOfJoin") {
      error = validateField("dateOfJoin", dateOfJoin);
    } else if (fieldName === "moduleAccess") {
      error = validateField("moduleAccess", formData.moduleAccess);
    } else {
      error = validateField(fieldName, (formData as any)[fieldName]);
    }

    setValidationErrors((prev) => ({ ...prev, [fieldName]: error }));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
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

        const deptRes = await getDepartments();
        if (deptRes.isSuccess) {
          setDepartments(deptRes.data);
          setFormData((prev) => ({ ...prev, departmentId: 0 }));
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to fetch departments",
          });
        }

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
          return { ...module, [field]: value };
        }
        return module;
      });

      return { ...prev, moduleAccess: updatedModuleAccess };
    });

    // mark as touched and validate live
    setTouchedFields((prev) => ({ ...prev, moduleAccess: true }));
    const error = validateField("moduleAccess", formData.moduleAccess);
    setValidationErrors((prev) => ({ ...prev, moduleAccess: error }));
  };

  const addModule = () => {
    if (!selectedModule) {
      setTouchedFields((prev) => ({ ...prev, moduleAccess: true }));
      setValidationErrors((prev) => ({
        ...prev,
        moduleAccess: "Please select a module to add",
      }));
      return;
    }

    const module = modules.find((m) => m.id === selectedModule);
    if (!module) return;

    if (formData.moduleAccess.some((ma) => ma.moduleId === selectedModule)) {
      setTouchedFields((prev) => ({ ...prev, moduleAccess: true }));
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

    // Clear error after adding
    setTouchedFields((prev) => ({ ...prev, moduleAccess: true }));
    const error = validateField("moduleAccess", formData.moduleAccess);
    setValidationErrors((prev) => ({ ...prev, moduleAccess: error }));
  };

  const removeModule = (moduleId: number) => {
    setFormData((prev) => ({
      ...prev,
      moduleAccess: prev.moduleAccess.filter((ma) => ma.moduleId !== moduleId),
    }));

    setTouchedFields((prev) => ({ ...prev, moduleAccess: true }));
    const error = validateField("moduleAccess", formData.moduleAccess);
    setValidationErrors((prev) => ({ ...prev, moduleAccess: error }));
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
                onChange={(e) => setField("firstName", e.target.value)}
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
                onChange={(e) => setField("lastName", e.target.value)}
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
                onChange={(e) => setField("emailAddress", e.target.value)}
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
                onChange={(e) => setField("contactNumber", e.target.value)}
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
            {/* Password is optional when sendMail = true */}
            {/* <div className="space-y-2">
              <Label htmlFor="password">
                Password {!sendMail && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={(e) => setField("password", e.target.value)}
                onBlur={() => handleBlur("password")}
                autoComplete="new-password"
                required={!sendMail}
                className={touchedFields.password && validationErrors.password ? "border-red-500" : ""}
              />
              {touchedFields.password && validationErrors.password && (
                <p className="text-red-500 text-xs">{validationErrors.password}</p>
              )}
            </div> */}
            {/* Dropdowns */}
            <div className="space-y-2">
              <Label>User Role</Label>
              <Select
                value={formData.userRole}
                onValueChange={(value) => setField("userRole", value)}
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
                onValueChange={(value) => setField("departmentId", value)}
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
         {/* Date of Birth */}
<div className="space-y-2">
  <Label>Date of Birth</Label>
  <DatePicker
    className={`w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
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
      if (current && current > dayjs().endOf("day")) return true;
      const fifteenYearsAgo = dayjs().subtract(15, "year");
      return current && current > fifteenYearsAgo;
    }}
    format="YYYY-MM-DD"
    getPopupContainer={(trigger) => trigger.parentElement!}
    defaultPickerValue={dayjs().subtract(15, "year")}
    placeholder="Select date of birth"
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
    className={`w-full h-10 rounded-md border border-input bg-background  px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
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
    placeholder="Select date of join"
  />
  {touchedFields.dateOfJoin && validationErrors.dateOfJoin && (
    <p className="text-red-500 text-xs">
      {validationErrors.dateOfJoin}
    </p>
  )}
</div>

            {/* Send Mail Checkbox (optional UI) */}
            {/* <div className="flex items-center space-x-2 pt-6">
              <Checkbox id="sendMail" checked={sendMail} onCheckedChange={(checked) => setSendMail(Boolean(checked))} />
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
              <Button
                type="button"
                onClick={addModule}
                className="bg-brand-primary text-text-white hover:bg-brand-primary/90"
              >
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
                            />
                            <Label htmlFor={`${moduleAccess.moduleId}-canEdit`}>
                              Edit
                            </Label>
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
                            />
                            <Label
                              htmlFor={`${moduleAccess.moduleId}-canDelete`}
                            >
                              Delete
                            </Label>
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
              className={`bg-brand-primary text-text-white hover:bg-brand-primary/90 ${
                !isFormValid ? "btn-disabled" : ""
              }`}
            >
              {loading ? "Creating..." : "Create Staff User"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
