"use client";

import { useEffect, useState } from "react";
import {
  User,
  updateUser,
  getDepartments,
  UpdateUserPayload,
} from "@/app/services/data.service";
import { useToast } from "@/hooks/use-toast";
import { DatePicker, Select } from "antd";
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

  useEffect(() => {
    if (user) {
      const userData = {
        firstName: user.firstName,
        lastName: user.lastName,
        emailAddress: user.emailAddress,
        contactNumber: user.contactNumber,
        userRole: user.userRole,
        dateOfBirth: user.dateOfBirth,
        dateOfJoin: user.dateOfJoin || "",
        departmentId: user.departmentId,
        isActive: user.isActive,
      };

      setInitialData(userData);
      setFormData(userData);
      setIsFormDirty(false);
    }
  }, [user]);

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
  };

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
  };

  const handleContactNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value.replace(/\D/g, "");
    setFormData({ ...formData, contactNumber: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!user) return;

      if (!formData.firstName || !formData.lastName || !formData.emailAddress) {
        setError("Please fill in all required fields");
        return;
      }

      // Create an object with only the changed fields
      const changedData: UpdateUserPayload = (
        Object.keys(formData) as Array<keyof typeof formData>
      ).reduce((acc, key) => {
        if (formData[key] !== initialData[key]) {
          acc[key] = formData[key] as any;
        }
        return acc;
      }, {} as UpdateUserPayload);

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
    } catch (err) {
      setError("An error occurred while updating the user");
      console.error(err);
    } finally {
      setLoading(false);
    }
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
                    className="block w-full shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 border-gray-300 rounded-md p-2 border"
                    required
                  />
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
                    className="block w-full shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 border-gray-300 rounded-md p-2 border"
                    required
                  />
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
                    className="block w-full shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 border-gray-300 rounded-md p-2 border"
                    required
                  />
                </div>

                {/* Contact */}
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="contactNumber">Contact Number</Label>
                  <Input
                    type="tel"
                    id="contactNumber"
                    name="contactNumber"
                    placeholder="Enter contact number"
                    value={formData.contactNumber}
                    onChange={handleContactNumberChange}
                    maxLength={10}
                    minLength={10}
                  />
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
                    disabledDate={(current) =>
                      current && current > dayjs().endOf("day")
                    }
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
                  <Select
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
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <Select
                    className="w-full"
                    value={formData.userRole}
                    onChange={(value) => handleSelectChange("userRole", value)}
                    options={[
                      { value: "ADMIN", label: "Admin" },
                      { value: "TESTER_QA", label: "Tester/QA" },
                      { value: "SALES_EXECUTIVE", label: "Sales Executive" },
                      { value: "PROJECT_MANAGER", label: "Project Manager" },
                      { value: "SALES_MANAGER", label: "Sales Manager" },
                      { value: "SUPER_ADMIN", label: "Super Admin" },
                      { value: "TEAM_LEAD", label: "Team Lead" },
                      { value: "DEVELOPER", label: "Developer" },
                      { value: "HR", label: "HR" },
                    ]}
                    placeholder="Select Role"
                  />
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
                      className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
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
                  className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !isFormDirty}
                  className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                    loading || !isFormDirty
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gray-900 hover:bg-gray-800"
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
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
