"use client";

import { useState, useEffect } from "react";
import {
  getUsers,
  User,
  toggleUserStatus,
  getModuleDropdown,
  grantModuleAccess,
  updateModuleAccess,
  removeModuleAccess,
  GrantModuleAccessPayload,
  UpdateModuleAccessPayload,
  getDepartments,
  Department,
} from "@/app/services/data.service";
import { CreateStaffModal } from "./createUserModal";
import { UpdateStaffModal } from "./updateUserModal";
import { useToast } from "@/hooks/use-toast";
import {
  Pencil,
  Trash2,
  Plus,
  Search,
  CircleCheck,
  CircleX,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Select, Checkbox, Button, Tooltip } from "antd";
import { PlusOutlined } from "@ant-design/icons";

export default function StaffPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [departments, setDepartments] = useState<
    { id: number; name: string }[]
  >([]);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [availableModules, setAvailableModules] = useState<
    { id: number; name: string }[]
  >([]);
  const [selectedModuleToGrant, setSelectedModuleToGrant] = useState<
    number | null
  >(null);
  const [moduleAccessLoading, setModuleAccessLoading] = useState<
    Record<string, boolean>
  >({});
  const [isEditingModule, setIsEditingModule] = useState<string | null>(null);
  const [editPermissions, setEditPermissions] = useState({
    canView: false,
    canEdit: false,
    canDelete: false,
    canCreate: false,
  });
  const [newModulePermissions, setNewModulePermissions] = useState({
    canView: true,
    canEdit: false,
    canDelete: false,
    canCreate: false,
  });
  const { toast } = useToast();
  const [togglingUsers, setTogglingUsers] = useState<Record<string, boolean>>(
    {}
  );
  const [getAllDepartments, setGetAllDepartments] = useState<Department[]>([]);

  const fetchDepartments = async () => {
    try {
      const response = await getDepartments();
      if (response.isSuccess) {
        setGetAllDepartments(response.data);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to fetch departments",
        });
      }
    } catch (error: any) {
      console.error("Error fetching departments:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch departments",
      });
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAvailableModules();
    fetchDepartments();
  }, []);

  interface FormatUserRoleFn {
    (role: string | null | undefined): string | null;
  }

  const formatUserRole: FormatUserRoleFn = (role) => {
    if (!role) return null;
    return (role as string)
      .toLowerCase()
      .split("_")
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await getUsers();
      if (response.isSuccess) {
        setUsers(response.data);
        // const uniqueDepartments = Array.from(
        //   new Set(
        //     response.data.map((user) => ({
        //       id: user.departmentId,
        //       name: user.departmentName,
        //       role: user.userRole,
        //     }))
        //   )
        // );
        // setDepartments(uniqueDepartments);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to fetch users",
        });
      }
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch users",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableModules = async () => {
    try {
      const response = await getModuleDropdown();
      if (response.isSuccess) {
        setAvailableModules(response.data);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to fetch available modules",
        });
      }
    } catch (error) {
      console.error("Error fetching modules:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch available modules",
      });
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAvailableModules();
  }, []);

  const toggleRow = (userId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    toast({
      title: "Success",
      description: "Staff member created successfully",
    });
    fetchUsers();
  };

  const handleUpdateSuccess = () => {
    setIsUpdateModalOpen(false);
    toast({
      title: "Success",
      description: "Staff member updated successfully",
    });
    fetchUsers();
  };

  const handleEditClick = (user: User, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUser(user);
    setIsUpdateModalOpen(true);
  };

  // tighten toggle → clear editing/grant state when disabling
  const handleToggleStatus = async (userId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const currentUser = users.find((u) => u.userId === userId);
    if (!currentUser) return;
    const wasActive = currentUser.isActive;

    try {
      setTogglingUsers((p) => ({ ...p, [userId]: true }));
      const response = await toggleUserStatus(userId);
      if (response.isSuccess) {
        setUsers((prev) =>
          prev.map((u) =>
            u.userId === userId ? { ...u, isActive: !u.isActive } : u
          )
        );
        // if we just turned the user OFF, nuke any editing/grant UI state
        if (wasActive) {
          setIsEditingModule(null);
          setSelectedModuleToGrant(null);
        }
        toast({
          title: "Success",
          description: "User status updated successfully",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to update user status",
        });
      }
    } catch (error: any) {
      console.error("Error toggling user status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update user status",
      });
    } finally {
      setTogglingUsers((p) => ({ ...p, [userId]: false }));
    }
  };

  const handleGrantModuleAccess = async (userId: string) => {
    const u = users.find((x) => x.userId === userId);
    if (!u?.isActive) {
      toast({
        variant: "destructive",
        title: "Inactive user",
        description: "Activate the user to grant modules",
      });
      return;
    }

    if (!selectedModuleToGrant) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a module first",
      });
      return;
    }

    try {
      setModuleAccessLoading((prev) => ({
        ...prev,
        [`grant-${userId}`]: true,
      }));
      const payload: GrantModuleAccessPayload = {
        moduleAccess: [
          {
            moduleId: selectedModuleToGrant,
            canView: newModulePermissions.canView,
            canEdit: newModulePermissions.canEdit,
            canDelete: newModulePermissions.canDelete,
            canCreate: newModulePermissions.canCreate,
          },
        ],
      };

      const response = await grantModuleAccess(userId, payload);
      if (response.isSuccess) {
        fetchUsers();
        setSelectedModuleToGrant(null);
        // Reset permissions after granting
        setNewModulePermissions({
          canView: true,
          canEdit: false,
          canDelete: false,
          canCreate: false,
        });
        toast({
          title: "Success",
          description: "Module access granted successfully",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to grant module access",
        });
      }
    } catch (error) {
      console.error("Error granting module access:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to grant module access",
      });
    } finally {
      setModuleAccessLoading((prev) => ({
        ...prev,
        [`grant-${userId}`]: false,
      }));
    }
  };

  const handleUpdateModuleAccess = async (moduleAccessId: string) => {
    try {
      setModuleAccessLoading((prev) => ({
        ...prev,
        [`update-${moduleAccessId}`]: true,
      }));
      const payload: UpdateModuleAccessPayload = {
        canView: editPermissions.canView,
        canEdit: editPermissions.canEdit,
        canDelete: editPermissions.canDelete,
        canCreate: editPermissions.canCreate,
      };

      const response = await updateModuleAccess(moduleAccessId, payload);
      if (response.isSuccess) {
        fetchUsers();
        setIsEditingModule(null);
        toast({
          title: "Success",
          description: "Module permissions updated successfully",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description:
            response.message || "Failed to update module permissions",
        });
      }
    } catch (error) {
      console.error("Error updating module access:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update module permissions",
      });
    } finally {
      setModuleAccessLoading((prev) => ({
        ...prev,
        [`update-${moduleAccessId}`]: false,
      }));
    }
  };

  const handleRemoveModuleAccess = async (moduleAccessId: string) => {
    try {
      setModuleAccessLoading((prev) => ({
        ...prev,
        [`remove-${moduleAccessId}`]: true,
      }));
      const response = await removeModuleAccess(moduleAccessId);
      if (response.isSuccess) {
        fetchUsers();
        toast({
          title: "Success",
          description: "Module access removed successfully",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to remove module access",
        });
      }
    } catch (error) {
      console.error("Error removing module access:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove module access",
      });
    } finally {
      setModuleAccessLoading((prev) => ({
        ...prev,
        [`remove-${moduleAccessId}`]: false,
      }));
    }
  };

  const startEditingModule = (module: any, isActive: boolean) => {
    if (!isActive) {
      toast({
        variant: "destructive",
        title: "Inactive user",
        description: "Activate the user to edit module permissions",
      });
      return;
    }
    setIsEditingModule(module.id.toString());
    setEditPermissions({
      canView: module.canView,
      canEdit: module.canEdit,
      canDelete: module.canDelete,
      canCreate: module.canCreate,
    });
  };

  const cancelEditing = () => {
    setIsEditingModule(null);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.emailAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.departmentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.userRole?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (isActive: boolean) => {
    return isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getAvailableModulesForUser = (user: User) => {
    if (!user.modules || user.modules.length === 0) return availableModules;
    return availableModules.filter(
      (module) =>
        !user.modules.some((userModule) => userModule.moduleId === module.id)
    );
  };

  const handlePermissionChange = (permissionType: string, checked: boolean) => {
    setEditPermissions((prev) => ({
      ...prev,
      [permissionType]: checked,
    }));
  };

  // Apply the same logic for new module permissions
  const handleNewPermissionChange = (
    permissionType: string,
    checked: boolean
  ) => {
    setNewModulePermissions((prev) => ({
      ...prev,
      [permissionType]: checked,
    }));
  };

  // Update the Checkbox.Group to use the new handler
  const handleNewPermissionGroupChange = (checkedValues: any[]) => {
    const newPermissions = {
      canView: checkedValues.includes("canView"),
      canEdit: checkedValues.includes("canEdit"),
      canDelete: checkedValues.includes("canDelete"),
      canCreate: checkedValues.includes("canCreate"),
    };

    // Validate the permissions
    if (
      (newPermissions.canEdit || newPermissions.canDelete) &&
      !newPermissions.canCreate
    ) {
      newPermissions.canCreate = true;
      toast({
        title: "Permission Dependency",
        description: "Create permission is required for edit/delete operations",
        variant: "default",
      });
    }

    setNewModulePermissions(newPermissions);
  };

  return (
    <>
      <CreateStaffModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
        departments={departments}
      />

      <UpdateStaffModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        onSuccess={handleUpdateSuccess}
        user={selectedUser}
        departments={departments}
      />

      <div className="flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Staff Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your staff members and their module permissions
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-grow max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by name, email or department..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white transition-all duration-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Tooltip
              title={
                getAllDepartments.length === 0
                  ? "No departments available. Please add departments first."
                  : ""
              }
              placement="top"
            >
              <button
                onClick={() => setIsCreateModalOpen(true)}
                disabled={getAllDepartments.length === 0}
                className={`flex items-center justify-center gap-2 px-4 py-2 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md ${
                  getAllDepartments.length === 0
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-brand-primary hover:bg-brand-primary/90"
                }`}
              >
                <Plus className="h-4 w-4" />
                Add Staff
              </button>
            </Tooltip>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Join Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <>
                        <tr
                          key={user.userId}
                          className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                          onClick={() => toggleRow(user.userId)}
                        >
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center shadow-inner">
                                <span className="text-blue-600 font-medium">
                                  {user.firstName[0].toUpperCase()}
                                  {user.lastName[0].toUpperCase()}
                                </span>
                              </div>
                              <div className="ml-2">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {user.contactNumber}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {user.emailAddress}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <div className="text-sm text-gray-900">
                              {user.departmentName}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatUserRole(user.userRole) || "N/A"}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {user.dateOfJoin
                                ? formatDate(user.dateOfJoin)
                                : "-"}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                                  user.isActive
                                )}`}
                              >
                                {user.isActive ? "Active" : "Inactive"}
                              </span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={user.isActive}
                                  onChange={() =>
                                    handleToggleStatus(user.userId)
                                  }
                                  disabled={togglingUsers[user.userId]}
                                  className="sr-only peer"
                                />
                                <div
                                  className={`w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1.5px] after:left-[1.5px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${
                                    user.isActive
                                      ? "peer-checked:bg-brand-primary"
                                      : "bg-gray-400"
                                  } ${
                                    togglingUsers[user.userId]
                                      ? "opacity-50 cursor-not-allowed"
                                      : ""
                                  }`}
                                >
                                  {togglingUsers[user.userId] && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <svg
                                        className="animate-spin h-3 w-3 text-white"
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
                                    </div>
                                  )}
                                </div>
                              </label>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              className={`text-blue-600 hover:text-blue-900 mr-3 flex items-center gap-1 p-1 rounded transition-colors
    ${
      !user.isActive
        ? "opacity-40 cursor-not-allowed pointer-events-none"
        : "hover:bg-blue-50"
    }`}
                              onClick={(e) =>
                                user.isActive && handleEditClick(user, e)
                              }
                              disabled={!user.isActive}
                              title={
                                user.isActive ? "Edit" : "Activate user to edit"
                              }
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="hidden sm:inline">Edit</span>
                            </button>
                          </td>
                        </tr>
                        <AnimatePresence>
                          {expandedRows[user.userId] && (
                            <motion.tr
                              initial={{ opacity: 0, height: 0 }}
                              animate={{
                                opacity: 1,
                                height: "auto",
                                transition: {
                                  opacity: { duration: 0.2 },
                                  height: { duration: 0.3 },
                                },
                              }}
                              exit={{
                                opacity: 0,
                                height: 0,
                                transition: {
                                  opacity: { duration: 0.1 },
                                  height: { duration: 0.2 },
                                },
                              }}
                              className="bg-gray-50"
                            >
                              <td colSpan={7} className="px-6 py-4">
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{
                                    opacity: 1,
                                    y: 0,
                                    transition: { delay: 0.2, duration: 0.2 },
                                  }}
                                  exit={{
                                    opacity: 0,
                                    y: -10,
                                    transition: { duration: 0.1 },
                                  }}
                                  className="space-y-6"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs">
                                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date of Birth
                                      </p>
                                      <p className="text-sm font-medium mt-1">
                                        {user.dateOfBirth
                                          ? formatDate(user.dateOfBirth)
                                          : "-"}
                                      </p>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs">
                                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Password Updated
                                      </p>
                                      <p className="text-sm font-medium mt-1">
                                        {user.isPasswordUpdated ? (
                                          <span className="text-green-600">
                                            Yes
                                          </span>
                                        ) : (
                                          <span className="text-amber-600">
                                            No
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs">
                                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Created At
                                      </p>
                                      <p className="text-sm font-medium mt-1">
                                        {formatDate(user.createdAt)}
                                      </p>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs">
                                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Updated At
                                      </p>
                                      <p className="text-sm font-medium mt-1">
                                        {formatDate(user.updatedAt)}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Premium Module Access Table */}
                                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
                                      <h4 className="font-medium text-gray-800 flex items-center">
                                        Module Access
                                        <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                          {user.modules.length} module(s)
                                        </span>
                                      </h4>
                                    </div>

                                    {user.modules.length > 0 ? (
                                      <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                          <thead className="bg-gray-50">
                                            <tr>
                                              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Module
                                              </th>
                                              <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Permissions
                                              </th>
                                              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-200">
                                            {user.modules.map((module) => (
                                              <tr
                                                key={`${user.userId}-${module.moduleId}`}
                                                className="hover:bg-gray-50 transition-colors"
                                              >
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                  <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-9 w-9 rounded-md bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                                                      <span className="text-blue-600 font-medium text-sm">
                                                        {module.moduleName[0]}
                                                      </span>
                                                    </div>
                                                    <div className="ml-4">
                                                      <div className="text-sm font-medium text-gray-900 capitalize">
                                                        {formatUserRole(
                                                          module.moduleName
                                                        )}
                                                      </div>
                                                      <div className="text-xs text-gray-500">
                                                        Granted on{" "}
                                                        {formatDate(
                                                          module.createdAt
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                  {isEditingModule ===
                                                  module.id.toString() ? (
                                                    <div className="flex justify-center space-x-4">
                                                      <div className="flex flex-col items-center">
                                                        <label className="inline-flex items-center">
                                                          <input
                                                            type="checkbox"
                                                            checked={
                                                              editPermissions.canView
                                                            }
                                                            onChange={(e) =>
                                                              handlePermissionChange(
                                                                "canView",
                                                                e.target.checked
                                                              )
                                                            }
                                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                          />
                                                          <span className="ml-2 text-sm text-gray-700">
                                                            View
                                                          </span>
                                                        </label>
                                                      </div>

                                                      <div className="flex flex-col items-center">
                                                        <label className="inline-flex items-center">
                                                          <input
                                                            type="checkbox"
                                                            checked={
                                                              editPermissions.canCreate
                                                            }
                                                            onChange={(e) =>
                                                              handlePermissionChange(
                                                                "canCreate",
                                                                e.target.checked
                                                              )
                                                            }
                                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                          />
                                                          <span className="ml-2 text-sm text-gray-700">
                                                            Create
                                                          </span>
                                                        </label>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                          Required for
                                                          Edit/Delete
                                                        </div>
                                                      </div>

                                                      <div className="flex flex-col items-center">
                                                        <label className="inline-flex items-center">
                                                          <input
                                                            type="checkbox"
                                                            checked={
                                                              editPermissions.canEdit
                                                            }
                                                            onChange={(e) =>
                                                              handlePermissionChange(
                                                                "canEdit",
                                                                e.target.checked
                                                              )
                                                            }
                                                            disabled={
                                                              !editPermissions.canCreate
                                                            }
                                                            className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                                                              !editPermissions.canCreate
                                                                ? "opacity-50 cursor-not-allowed"
                                                                : ""
                                                            }`}
                                                          />
                                                          <span
                                                            className={`ml-2 text-sm ${
                                                              !editPermissions.canCreate
                                                                ? "text-gray-500"
                                                                : "text-gray-700"
                                                            }`}
                                                          >
                                                            Edit
                                                          </span>
                                                        </label>
                                                        {!editPermissions.canCreate && (
                                                          <Tooltip title="Requires Create permission">
                                                            <AlertCircle className="h-3 w-3 text-amber-500 mt-1" />
                                                          </Tooltip>
                                                        )}
                                                      </div>

                                                      <div className="flex flex-col items-center">
                                                        <label className="inline-flex items-center">
                                                          <input
                                                            type="checkbox"
                                                            checked={
                                                              editPermissions.canDelete
                                                            }
                                                            onChange={(e) =>
                                                              handlePermissionChange(
                                                                "canDelete",
                                                                e.target.checked
                                                              )
                                                            }
                                                            disabled={
                                                              !editPermissions.canCreate
                                                            }
                                                            className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                                                              !editPermissions.canCreate
                                                                ? "opacity-50 cursor-not-allowed"
                                                                : ""
                                                            }`}
                                                          />
                                                          <span
                                                            className={`ml-2 text-sm ${
                                                              !editPermissions.canCreate
                                                                ? "text-gray-500"
                                                                : "text-gray-700"
                                                            }`}
                                                          >
                                                            Delete
                                                          </span>
                                                        </label>
                                                        {!editPermissions.canCreate && (
                                                          <Tooltip title="Requires Create permission">
                                                            <AlertCircle className="h-3 w-3 text-amber-500 mt-1" />
                                                          </Tooltip>
                                                        )}
                                                      </div>
                                                    </div>
                                                  ) : (
                                                    <div className="flex justify-center space-x-6">
                                                      <span
                                                        className={`inline-flex items-center px-2.5 py-0.5 gap-1 rounded-full text-xs font-medium ${
                                                          module.canView
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-gray-100 text-gray-800"
                                                        }`}
                                                      >
                                                        {module.canView
                                                          ? "Can view"
                                                          : "No view"}
                                                        {module.canView ? (
                                                          <CircleCheck className="h-4 w-4 text-green-500" />
                                                        ) : (
                                                          <CircleX className="h-4 w-4 text-gray-500" />
                                                        )}
                                                      </span>

                                                      <span
                                                        className={`inline-flex items-center px-2.5 py-0.5 gap-1 rounded-full text-xs font-medium ${
                                                          module.canEdit
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-gray-100 text-gray-800"
                                                        }`}
                                                      >
                                                        {module.canEdit
                                                          ? "Can edit"
                                                          : "No edit"}
                                                        {module.canEdit ? (
                                                          <CircleCheck className="h-4 w-4 text-green-500" />
                                                        ) : (
                                                          <CircleX className="h-4 w-4 text-gray-500" />
                                                        )}
                                                      </span>

                                                      <span
                                                        className={`inline-flex items-center px-2.5 py-0.5 gap-1 rounded-full text-xs font-medium ${
                                                          module.canDelete
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-gray-100 text-gray-800"
                                                        }`}
                                                      >
                                                        {module.canDelete
                                                          ? "Can delete"
                                                          : "No delete"}
                                                        {module.canDelete ? (
                                                          <CircleCheck className="h-4 w-4 text-green-500" />
                                                        ) : (
                                                          <CircleX className="h-4 w-4 text-gray-500" />
                                                        )}
                                                      </span>

                                                      <span
                                                        className={`inline-flex items-center px-2.5 py-0.5 gap-1 rounded-full text-xs font-medium ${
                                                          module.canCreate
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-gray-100 text-gray-800"
                                                        }`}
                                                      >
                                                        {module.canCreate
                                                          ? "Can create"
                                                          : "No create"}
                                                        {module.canCreate ? (
                                                          <CircleCheck className="h-4 w-4 text-green-500" />
                                                        ) : (
                                                          <CircleX className="h-4 w-4 text-gray-500" />
                                                        )}
                                                      </span>
                                                    </div>
                                                  )}
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                  {isEditingModule ===
                                                  module.id.toString() ? (
                                                    <div className="flex justify-end space-x-2">
                                                      <button
                                                        onClick={cancelEditing}
                                                        className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                      >
                                                        Cancel
                                                      </button>
                                                      <button
                                                        onClick={() =>
                                                          handleUpdateModuleAccess(
                                                            module.id.toString()
                                                          )
                                                        }
                                                        disabled={
                                                          moduleAccessLoading[
                                                            `update-${module.id}`
                                                          ]
                                                        }
                                                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-text-white bg-brand-primary hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50"
                                                      >
                                                        {moduleAccessLoading[
                                                          `update-${module.id}`
                                                        ]
                                                          ? "Saving..."
                                                          : "Save Changes"}
                                                      </button>
                                                    </div>
                                                  ) : (
                                                    <div className="flex justify-end space-x-2">
                                                      <button
                                                        onClick={() =>
                                                          startEditingModule(
                                                            module,
                                                            user.isActive
                                                          )
                                                        }
                                                        className={`inline-flex items-center p-1.5 border rounded-full
    ${
      user.isActive
        ? "border-gray-300 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
        : "opacity-40 cursor-not-allowed pointer-events-none"
    }`}
                                                        disabled={
                                                          !user.isActive
                                                        }
                                                        title={
                                                          user.isActive
                                                            ? "Edit permissions"
                                                            : "Activate user to edit"
                                                        }
                                                      >
                                                        <Pencil className="h-4 w-4" />
                                                      </button>
                                                      <button
                                                        onClick={() =>
                                                          user.isActive &&
                                                          handleRemoveModuleAccess(
                                                            module.id.toString()
                                                          )
                                                        }
                                                        disabled={
                                                          !user.isActive ||
                                                          moduleAccessLoading[
                                                            `remove-${module.id}`
                                                          ]
                                                        }
                                                        aria-disabled={
                                                          !user.isActive ||
                                                          moduleAccessLoading[
                                                            `remove-${module.id}`
                                                          ]
                                                        }
                                                        className={`inline-flex items-center p-1.5 border rounded-full transition-colors
    ${
      !user.isActive
        ? "opacity-40 cursor-not-allowed pointer-events-none border-gray-200 text-gray-300"
        : "border-gray-300 text-gray-500 hover:text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
    }`}
                                                        title={
                                                          user.isActive
                                                            ? "Remove access"
                                                            : "Activate user to modify modules"
                                                        }
                                                      >
                                                        {moduleAccessLoading[
                                                          `remove-${module.id}`
                                                        ] ? (
                                                          <svg
                                                            className="animate-spin h-4 w-4 text-gray-400"
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
                                                            />
                                                            <path
                                                              className="opacity-75"
                                                              fill="currentColor"
                                                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                            />
                                                          </svg>
                                                        ) : (
                                                          <Trash2 className="h-4 w-4" />
                                                        )}
                                                      </button>
                                                    </div>
                                                  )}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <div className="px-5 py-8 text-center">
                                        <div className="text-gray-400 mb-2">
                                          <svg
                                            className="mx-auto h-12 w-12"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={1}
                                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            />
                                          </svg>
                                        </div>
                                        <h5 className="text-gray-500 font-medium">
                                          No module access granted
                                        </h5>
                                        <p className="text-gray-400 text-sm mt-1">
                                          Grant access to modules below
                                        </p>
                                      </div>
                                    )}

                                    {/* Grant New Module Access Section */}
                                    {getAvailableModulesForUser(user).length >
                                      0 && (
                                      <div className="px-5 py-4 border-t border-gray-200 bg-gray-50">
                                        <h5 className="text-sm font-medium text-gray-700 mb-3">
                                          Grant New Module Access
                                        </h5>

                                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                                          {/* Module Select */}
                                          <div className="flex-grow">
                                            <Select
                                              showSearch
                                              placeholder="Select a module..."
                                              value={
                                                selectedModuleToGrant ||
                                                undefined
                                              }
                                              onChange={(value) => {
                                                setSelectedModuleToGrant(value);
                                                setNewModulePermissions({
                                                  canView: true,
                                                  canEdit: false,
                                                  canDelete: false,
                                                  canCreate: false,
                                                });
                                              }}
                                              className="w-full"
                                              optionFilterProp="label"
                                              filterOption={(input, option) =>
                                                (option?.label as string)
                                                  .toLowerCase()
                                                  .includes(input.toLowerCase())
                                              }
                                              options={getAvailableModulesForUser(
                                                user
                                              ).map((module) => ({
                                                value: module.id,
                                                label: formatUserRole(
                                                  module.name
                                                ),
                                              }))}
                                            />
                                          </div>

                                          {/* Permissions */}
                                          {selectedModuleToGrant && (
                                            <div className="w-full sm:w-auto">
                                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Permissions
                                              </label>
                                              <div className="flex flex-wrap gap-4">
                                                <div className="flex items-center">
                                                  <Checkbox
                                                    checked={
                                                      newModulePermissions.canView
                                                    }
                                                    onChange={(e) =>
                                                      handleNewPermissionChange(
                                                        "canView",
                                                        e.target.checked
                                                      )
                                                    }
                                                  >
                                                    View
                                                  </Checkbox>
                                                </div>

                                                <div className="flex items-center">
                                                  <Checkbox
                                                    checked={
                                                      newModulePermissions.canCreate
                                                    }
                                                    onChange={(e) =>
                                                      handleNewPermissionChange(
                                                        "canCreate",
                                                        e.target.checked
                                                      )
                                                    }
                                                  >
                                                    Create
                                                  </Checkbox>
                                                  <Tooltip title="Required for Edit/Delete permissions">
                                                    <AlertCircle className="h-3 w-3 text-amber-500 ml-1" />
                                                  </Tooltip>
                                                </div>

                                                <div className="flex items-center">
                                                  <Checkbox
                                                    checked={
                                                      newModulePermissions.canEdit
                                                    }
                                                    onChange={(e) =>
                                                      handleNewPermissionChange(
                                                        "canEdit",
                                                        e.target.checked
                                                      )
                                                    }
                                                    disabled={
                                                      !newModulePermissions.canCreate
                                                    }
                                                    className={
                                                      !newModulePermissions.canCreate
                                                        ? "opacity-50"
                                                        : ""
                                                    }
                                                  >
                                                    Edit
                                                  </Checkbox>
                                                </div>

                                                <div className="flex items-center">
                                                  <Checkbox
                                                    checked={
                                                      newModulePermissions.canDelete
                                                    }
                                                    onChange={(e) =>
                                                      handleNewPermissionChange(
                                                        "canDelete",
                                                        e.target.checked
                                                      )
                                                    }
                                                    disabled={
                                                      !newModulePermissions.canCreate
                                                    }
                                                    className={
                                                      !newModulePermissions.canCreate
                                                        ? "opacity-50"
                                                        : ""
                                                    }
                                                  >
                                                    Delete
                                                  </Checkbox>
                                                </div>
                                              </div>

                                              {!newModulePermissions.canCreate &&
                                                (newModulePermissions.canEdit ||
                                                  newModulePermissions.canDelete) && (
                                                  <div className="mt-2 text-xs text-amber-600 flex items-center">
                                                    <AlertCircle className="h-3 w-3 mr-1" />
                                                    Enable Create permission to
                                                    use Edit/Delete
                                                  </div>
                                                )}
                                            </div>
                                          )}

                                          {/* Grant Button */}
                                          <Button
                                            type="primary"
                                            icon={<PlusOutlined />}
                                            loading={
                                              moduleAccessLoading[
                                                `grant-${user.userId}`
                                              ]
                                            }
                                            onClick={() =>
                                              handleGrantModuleAccess(
                                                user.userId
                                              )
                                            }
                                            disabled={!selectedModuleToGrant}
                                            className="w-full sm:w-auto disabled:opacity-70 disabled:cursor-not-allowed"
                                            style={{
                                              background: selectedModuleToGrant
                                                ? "var(--brand-primary)"
                                                : "#9ca3af",
                                              borderColor: selectedModuleToGrant
                                                ? "var(--brand-primary)"
                                                : "#9ca3af",
                                              color: "#fff",
                                            }}
                                          >
                                            Grant Access
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center">
                        <div className="text-gray-400 mb-3">
                          <svg
                            className="mx-auto h-12 w-12"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1}
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                        </div>
                        <h5 className="text-gray-500 font-medium">
                          No staff members found
                        </h5>
                        <p className="text-gray-400 text-sm mt-1">
                          {searchTerm
                            ? "Try a different search term"
                            : "Add a new staff member to get started"}
                        </p>
                        {!searchTerm && (
                          <Tooltip
                            title={
                              getAllDepartments.length === 0
                                ? "No departments available. Please add departments first."
                                : ""
                            }
                            placement="top"
                          >
                            <button
                              onClick={() => setIsCreateModalOpen(true)}
                              disabled={getAllDepartments.length === 0}
                              className={`flex items-center justify-center gap-2 px-4 py-2 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md ${
                                getAllDepartments.length === 0
                                  ? "bg-gray-400 cursor-not-allowed"
                                  : "bg-brand-primary hover:bg-brand-primary/90"
                              }`}
                            >
                              <Plus className="h-4 w-4" />
                              Add Staff
                            </button>
                          </Tooltip>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
