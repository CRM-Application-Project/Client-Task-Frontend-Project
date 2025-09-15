"use client";

import React, { useEffect, useState } from "react";
import {
  User,
  updateUser,
  getDepartments,
  UpdateUserPayload,
  getRoleScopeDropdown,
  RoleScope,
} from "@/app/services/data.service";
import { useToast } from "@/hooks/use-toast";
import { DatePicker, Select as AntdSelect } from "antd";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import dayjs, { Dayjs } from "dayjs";

interface UpdateStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: User | null;
  departments: { id: number; name: string }[];
}

export const UpdateStaffModal = ({
  isOpen,
  onClose,
  onSuccess,
  user,
}: UpdateStaffModalProps) => {
  const [initialData, setInitialData] = useState({
    firstName: "",
    lastName: "",
    emailAddress: "",
    contactNumber: "",
    userRole: "",
    userScope: "",
    dateOfBirth: "",
    dateOfJoin: "",
    departmentId: 0,
    isActive: true,
  });

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    emailAddress: "",
    contactNumber: "",
    userRole: "",
    dateOfBirth: "",
     userScope: "", 
    dateOfJoin: "",
    departmentId: 0,
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [departments, setDepartments] = useState<
    { id: number; name: string }[]
  >([]);
  const { toast } = useToast();
  const [roleScopes, setRoleScopes] = useState<RoleScope[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
    emailAddress?: string;
    contactNumber?: string;
    departmentId?: string;
  }>({});

  // Helper function to find the matching role-scope combination
  const findMatchingRoleScope = (userRole: string) => {
    return roleScopes.find(rs => rs.role === userRole);
  };

  // Helper function to get the display value for the select
  const getRoleDisplayValue = (userRole: string) => {
    const matchingRoleScope = findMatchingRoleScope(userRole);
    return matchingRoleScope ? `${matchingRoleScope.role}-${matchingRoleScope.scope}` : userRole;
  };

useEffect(() => {
  if (user && roleScopes.length > 0) {
    // Find the first scope for the user's role
    const foundScope = roleScopes.find(rs => rs.role === user.userRole)?.scope || "";

    const userData = {
      firstName: user.firstName,
      lastName: user.lastName,
      emailAddress: user.emailAddress,
      contactNumber: user.contactNumber,
      userRole: user.userRole,
      userScope: foundScope, // <-- use found scope if userScope is missing
      dateOfBirth: user.dateOfBirth,
      dateOfJoin: user.dateOfJoin || "",
      departmentId: user.departmentId,
      isActive: user.isActive,
    };

    setInitialData(userData);
    setFormData(userData);
    setIsFormDirty(false);
  }
}, [user, roleScopes]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await getDepartments();
        if (res.isSuccess) {
          setDepartments(res.data);
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: res.message || "Failed to fetch departments",
          });
        }
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description:
            error.message || "An error occurred while fetching departments",
        });
      }
    };
    fetchDepartments();
  }, []);

  useEffect(() => {
    const fetchRoleScopes = async () => {
      try {
        const res = await getRoleScopeDropdown();
        if (res.isSuccess) {
          setRoleScopes(res.data);
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: res.message || "Failed to fetch roles",
          });
        }
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description:
            error.message || "An error occurred while fetching roles",
        });
      }
    };
    fetchRoleScopes();
  }, []);
// derive the full value that matches one of the <SelectItem> values
const selectedRoleScopeValue = React.useMemo(() => {
  if (!formData.userRole || !formData.userScope || roleScopes.length === 0) return "";
  return `${formData.userRole}-${formData.userScope}`;
}, [formData.userRole, formData.userScope, roleScopes]);



  // Check if form is dirty whenever formData changes
  useEffect(() => {
    const isDirty = Object.keys(formData).some((key) => {
      return (
        formData[key as keyof typeof formData] !==
        initialData[key as keyof typeof initialData]
      );
    });
    setIsFormDirty(isDirty);
  }, [formData, initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });

    // Validate required fields
    if (name === 'firstName' || name === 'lastName' || name === 'emailAddress'|| name === 'contactNumber') {
      setFieldErrors(prev => ({
        ...prev,
        [name]: !value.trim() ? 'This field is required' : undefined
      }));
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError("");
      setFieldErrors({});
    }
  }, [isOpen]);

  const handleDateChange = (
    fieldName: string,
    date: Dayjs | null,
    dateString: string | string[]
  ) => {
    const dateValue = Array.isArray(dateString) ? dateString[0] : dateString;

    setFormData({
      ...formData,
      [fieldName]: dateValue,
    });
  };

  const handleSelectChange = (fieldName: string, value: string | number) => {
    setFormData({
      ...formData,
      [fieldName]: value,
    });

    // Validate department selection
    if (fieldName === 'departmentId') {
      setFieldErrors(prev => ({
        ...prev,
        departmentId: !value ? 'This field is required' : undefined
      }));
    }
  };

  const handleContactNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value.replace(/\D/g, "");
    setFormData({ ...formData, contactNumber: value });

    // Validate contact number field
    setFieldErrors(prev => ({
      ...prev,
      contactNumber: !value.trim() ? 'This field is required' : undefined
    }));
  };

  // Handle role change - extract just the role part for backend
  const handleRoleChange = (value: string) => {
    // Value comes as "ROLE-SCOPE", we need to extract just the role
    const role = value.split('-')[0];
    setFormData({ 
      ...formData, 
      userRole: role 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!user) return;

      // Validate required fields
      const errors: typeof fieldErrors = {};
      if (!formData.firstName?.trim()) {
        errors.firstName = 'This field is required';
      }
      if (!formData.lastName?.trim()) {
        errors.lastName = 'This field is required';
      }
      if (!formData.emailAddress?.trim()) {
        errors.emailAddress = 'This field is required';
      }
     
      if (!formData.contactNumber) {
        errors.contactNumber = 'This field is required';
      }
      if (!formData.departmentId) {
        errors.departmentId = 'This field is required';
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setError("Please fill in all required fields");
        return;
      }

      // Create an object with only the changed fields
      const changedData: UpdateUserPayload = {};
      
      // Only include fields that have actually changed
      if (formData.firstName !== initialData.firstName) {
        changedData.firstName = formData.firstName;
      }
      if (formData.lastName !== initialData.lastName) {
        changedData.lastName = formData.lastName;
      }
      if (formData.emailAddress !== initialData.emailAddress) {
        changedData.emailAddress = formData.emailAddress;
      }
      if (formData.contactNumber !== initialData.contactNumber) {
        changedData.contactNumber = formData.contactNumber;
      }
       if (formData.userRole !== initialData.userRole) {
  changedData.userRole = formData.userRole;
}
      if (formData.dateOfBirth !== initialData.dateOfBirth) {
        changedData.dateOfBirth = formData.dateOfBirth;
      }
      if (formData.dateOfJoin !== initialData.dateOfJoin) {
        changedData.dateOfJoin = formData.dateOfJoin;
      }
      if (formData.departmentId !== initialData.departmentId) {
        changedData.departmentId = formData.departmentId;
      }
      if (formData.isActive !== initialData.isActive) {
        changedData.isActive = formData.isActive;
      }

      // Check if there are any changes
      if (Object.keys(changedData).length === 0) {
        toast({
          title: "No Changes",
          description: "No changes were made to update",
        });
        return;
      }

      console.log("Sending only changed data:", changedData);

      const response = await updateUser(user.userId, changedData);
      if (response.isSuccess) {
        toast({
          title: "Success",
          description: "User updated successfully",
        });
        onSuccess();
        onClose();
      } else {
        setError(response.message || "Failed to update user");
      }
    } catch (err:any) {
      setError(err.message || "An error occurred while updating the user");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatText = (text: string) => {
    return text
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
        >
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-start justify-between">
              <h3
                className="text-lg leading-6 font-medium text-gray-900"
                id="modal-headline"
              >
                Update Staff Member
              </h3>
              <button
                onClick={onClose}
                className="ml-4 bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <span className="sr-only">Close</span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="px-4 pt-2 pb-4 sm:p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* First Name */}
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`block w-full shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 border rounded-md p-2 ${
                      fieldErrors.firstName ? 'border-red-500' : 'border-gray-200'
                    }`}
                    required
                  />
                  {fieldErrors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.firstName}</p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`block w-full shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 border rounded-md p-2 ${
                      fieldErrors.lastName ? 'border-red-500' : 'border-gray-200'
                    }`}
                    required
                  />
                  {fieldErrors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.lastName}</p>
                  )}
                </div>

                {/* Email */}
                <div className="sm:col-span-2">
                  <label
                    htmlFor="emailAddress"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="emailAddress"
                    name="emailAddress"
                    value={formData.emailAddress}
                    onChange={handleChange}
                    className={`block w-full shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 border rounded-md p-2 ${
                      fieldErrors.emailAddress ? 'border-red-500' : 'border-gray-200'
                    }`}
                    required
                  />
                  {fieldErrors.emailAddress && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.emailAddress}</p>
                  )}
                </div>

                {/* Contact */}
               <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="contactNumber" className="text-sm font-medium text-gray-700">Contact Number *</Label>
                  <Input
                    type="tel"
                    id="contactNumber"
                    name="contactNumber"
                    placeholder="Enter contact number"
                    value={formData.contactNumber}
                    onChange={handleContactNumberChange}
                    maxLength={10}
                    minLength={10}
                    className={fieldErrors.contactNumber ? 'border-red-500' : ''}
                  />
                  {fieldErrors.contactNumber && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.contactNumber}</p>
                  )}
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <DatePicker
                    className="w-full"
                    value={
                      formData.dateOfBirth ? dayjs(formData.dateOfBirth) : null
                    }
                    onChange={(
                      date: Dayjs | null,
                      dateString: string | string[]
                    ) => handleDateChange("dateOfBirth", date, dateString)}
                    disabledDate={(current) => {
                      if (current && current > dayjs().endOf("day")) {
                        return true;
                      }
                      const fifteenYearsAgo = dayjs().subtract(15, "year");
                      return current && current > fifteenYearsAgo;
                    }}
                    defaultPickerValue={dayjs().subtract(15, "year")}
                  />
                </div>

                {/* Date of Joining */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Joining
                  </label>
                  <DatePicker
                    className="w-full"
                    value={
                      formData.dateOfJoin ? dayjs(formData.dateOfJoin) : null
                    }
                    onChange={(
                      date: Dayjs | null,
                      dateString: string | string[]
                    ) => handleDateChange("dateOfJoin", date, dateString)}
                    disabledDate={(current) =>
                      current && current > dayjs().endOf("day")
                    }
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department *
                  </label>
                  <AntdSelect
                    className="w-full"
                    value={formData.departmentId}
                    onChange={(value) =>
                      handleSelectChange("departmentId", value)
                    }
                    options={departments.map((dept) => ({
                      value: dept.id,
                      label: dept.name,
                    }))}
                    placeholder="Select Department"
                    status={fieldErrors.departmentId ? 'error' : ''}
                  />
                  {fieldErrors.departmentId && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.departmentId}</p>
                  )}
                </div>

                {/* Role */}
                <div>
                  <Label className="block text-sm font-medium text-gray-600 mb-1">User Role</Label>
         <Select
  value={selectedRoleScopeValue || undefined}
  onValueChange={(value) => {
    const [role, scope] = value.split("-");
    setFormData(prev => ({
      ...prev,
      userRole: role,
      userScope: scope,
    }));
  }}
>
  <SelectTrigger>
    <SelectValue placeholder="Select role" />
  </SelectTrigger>
  <SelectContent>
    {roleScopes.map((rs) => (
      <SelectItem
        key={`${rs.role}-${rs.scope}`}
        value={`${rs.role}-${rs.scope}`}
      >
        {rs.role} – {rs.scope}
      </SelectItem>
    ))}
  </SelectContent>
</Select>


                </div>

                {/* Active */}
                <div className="sm:col-span-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                      className="h-4 w-4 text-black focus:ring-black border-gray-200 rounded"
                    />
                    <label
                      htmlFor="isActive"
                      className="ml-2 block text-sm text-gray-700"
                    >
                      Active User
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex justify-center py-2 px-4 border border-gray-200 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !isFormDirty}
                  className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-text-white ${
                    loading || !isFormDirty
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-brand-primary hover:bg-brand-primary/90"
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary`}
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    "Update Staff"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};