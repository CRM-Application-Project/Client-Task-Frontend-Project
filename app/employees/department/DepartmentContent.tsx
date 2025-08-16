"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Department,
  getDepartments,
  deleteDepartment,
} from "@/app/services/data.service";
import { useToast } from "@/hooks/use-toast";
import CreateDepartmentModal from "./CreateDepartmentModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import UpdateDepartmentModal from "./UpdateDepartmentModal";

export default function DepartmentsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<number | null>(
    null
  );
  const pageSize = 10;
  const { toast } = useToast();

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await getDepartments();
      if (response.isSuccess) {
        setDepartments(response.data);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to fetch departments",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while fetching departments",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleDeleteDepartment = async () => {
    if (!departmentToDelete) return;

    try {
      setLoading(true);
      const response = await deleteDepartment(departmentToDelete);

      if (response.isSuccess) {
        toast({
          title: "Success",
          description: "Department deleted successfully",
        });
        setDeleteDialogOpen(false);
        fetchDepartments();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to delete department",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while deleting department",
      });
    } finally {
      setLoading(false);
      setDepartmentToDelete(null);
    }
  };

  const filteredDepartments = useMemo(() => {
    return departments.filter((dept) =>
      dept.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, departments]);

  const totalPages = Math.ceil(filteredDepartments.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDepartments.slice(start, start + pageSize);
  }, [page, filteredDepartments]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Departments</h1>
      </div>
      <div className="flex items-center gap-4 justify-between">
        <Input
          placeholder="Search departments..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
        <CreateDepartmentModal onSuccess={fetchDepartments} />
      </div>
      <div className="rounded-sm border shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-20 font-medium text-gray-700">
                ID
              </TableHead>
              <TableHead className="font-medium text-gray-700">Name</TableHead>
              <TableHead className="font-medium text-gray-700">
                Created At
              </TableHead>
              <TableHead className="font-medium text-gray-700">
                Updated At
              </TableHead>
              <TableHead className="font-medium text-gray-700">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-10" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                </TableRow>
              ))
            ) : paginatedData.length > 0 ? (
              paginatedData.map((dept) => (
                <TableRow key={dept.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{dept.id}</TableCell>
                  <TableCell className="font-medium text-blue-600">
                    {dept.name}
                  </TableCell>
                  <TableCell>{formatDate(dept.createdAt)}</TableCell>
                  <TableCell>{formatDate(dept.updatedAt)}</TableCell>
                  <TableCell className="flex gap-2">
                    <UpdateDepartmentModal
                      department={dept}
                      onSuccess={fetchDepartments}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDepartmentToDelete(dept.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-gray-500"
                >
                  No departments found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              department.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDepartment}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Showing {(page - 1) * pageSize + 1} to{" "}
          {Math.min(page * pageSize, filteredDepartments.length)} of{" "}
          {filteredDepartments.length} departments
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages || loading || totalPages === 0}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
