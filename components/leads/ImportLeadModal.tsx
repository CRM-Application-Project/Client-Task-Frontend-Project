"use client";
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, CheckCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { importLead } from "@/app/services/data.service";

interface ImportLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportLeads: (leads: any[]) => void;
}

interface UserData {
  firstName: string;
  lastName: string;
  userRole: string;
}

const ImportLeadModal: React.FC<ImportLeadModalProps> = ({
  isOpen,
  onClose,
  onImportLeads,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [status] = useState("NEW LEAD"); // Default status set to "NEW"
  const [user, setUser] = useState(""); // User from localStorage
  const { toast } = useToast();

  useEffect(() => {
    // Get user data from localStorage
    const userDataString = localStorage.getItem("user");
    if (userDataString) {
      try {
        const userData: UserData = JSON.parse(userDataString);
        // Set user as "FirstName LastName"
        setUser(`${userData.firstName} ${userData.lastName}`);
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
        toast({
          title: "Error",
          description: "Failed to load user data",
          variant: "destructive",
        });
      }
    }
  }, [isOpen, toast]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !user) return;
    setImporting(true);
    
    try {
      const response = await importLead(
        selectedFile, 
        status, 
        user // Pass the user name from localStorage
      );
      
      if (response.isSuccess) {
        toast({
          title: "Success",
          description: "Leads imported successfully",
          variant: "default",
        });
        
        if (response.data && Array.isArray(response.data)) {
          onImportLeads(response.data);
        } else {
          console.warn("No imported leads data returned from API");
          onImportLeads([]);
        }
        
        handleClose();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to import leads",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error importing leads:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while importing leads",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setImporting(false);
    onClose();
  };

  const downloadSampleFormat = () => {
    // Create a temporary link element to trigger the download
    const link = document.createElement("a");
    link.href = "/Leads.xlsx"; // Path to the file in public folder
    link.download = "Leads.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base font-semibold">
            Import Leads
          </DialogTitle>
          <DialogDescription className="text-sm">
            Upload a CSV file to import multiple leads at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            {!selectedFile ? (
              <div className="space-y-2">
                <Upload className="h-6 w-6 text-gray-400 mx-auto" />
                <div className="text-sm text-gray-600">
                  <Label
                    htmlFor="file-upload"
                    className="cursor-pointer text-blue-600 hover:text-blue-500"
                  >
                    Click to upload
                  </Label>
                  <span> or drag and drop</span>
                </div>
                <p className="text-xs text-gray-500">CSV files up to 10MB</p>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center">
                <FileText className="h-5 w-5 text-green-600" />
                <span className="text-sm">{selectedFile.name}</span>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            )}
          </div>

          {/* CSV Format Hint */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>
              <strong>CSV Format:</strong>
            </p>
            <p>
              Name, Email, Phone, Company, Location, Status, Priority, Source,
              Assigned To
            </p>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="gap-1 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={downloadSampleFormat}
            className="mr-auto h-9 px-3 text-sm"
          >
            <Download className="h-4 w-4 mr-1" />
            Download Format
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={importing}
            className="h-9 px-3 text-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!selectedFile || importing || !user}
 className={`h-9 px-3 text-sm ${
    (!selectedFile || importing || !user) ? "btn-disabled" : ""
  }`}          >
            {importing ? "Importing..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportLeadModal;