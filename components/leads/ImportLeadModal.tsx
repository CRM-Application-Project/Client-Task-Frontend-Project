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
import { getAllLeads, importLead, getAssignDropdown } from "@/app/services/data.service";

interface ImportLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportLeads: (leads: any[]) => void;
}

const ImportLeadModal: React.FC<ImportLeadModalProps> = ({
  isOpen,
  onClose,
  onImportLeads,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState("NEW");
  const [source, setSource] = useState("ONLINE");
  const [user, setUser] = useState("");
  const [users, setUsers] = useState<{id: string, label: string}[]>([]);
  const [label, setLabel] = useState("");
  const [date, setDate] = useState("");
  const [emailAutomation, setEmailAutomation] = useState(false);
  const [whatsappAutomation, setWhatsappAutomation] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getAssignDropdown();
        if (response.isSuccess && response.data.length > 0) {
          setUsers(response.data);
          setUser(response.data[0].id); // Set the first user as default
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({
          title: "Error",
          description: "Failed to load user list",
          variant: "destructive",
        });
      }
    };

    if (isOpen) {
      fetchUsers();
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
      const response = await importLead(selectedFile, status, user);
      if (response.isSuccess) {
        toast({
          title: "Success",
          description: "Leads imported successfully",
          variant: "default",
        });
        try {
          const leadsResponse = await getAllLeads();
          if (leadsResponse.isSuccess) {
            onImportLeads(leadsResponse.data);
          }
        } catch (fetchError) {
          console.error("Error fetching leads:", fetchError);
          toast({
            title: "Warning",
            description: "Leads imported but couldn't refresh the list",
            variant: "default",
          });
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
    const csvContent =
      "Name,Email,Phone,Company,Location,Status,Priority,Source,Assigned To\n" +
      "John Doe,john@example.com,+1 (555) 123-4567,Acme Inc,New York,NEW,MEDIUM,WEBSITE,Sarah Johnson\n" +
      "Jane Smith,jane@example.com,+1 (555) 987-6543,Globex Corp,Chicago,NEW,HIGH,REFERRAL,Michael Brown";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads_import_sample.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
  <Label htmlFor="status">Status</Label>
  <select
    id="status"
    value={status}
    onChange={(e) => setStatus(e.target.value as LeadStatus)}
    className="w-full p-2 border rounded-md text-sm"
  >
    <option value="NEW">New</option>
    <option value="CONTACTED">Contacted</option>
    <option value="QUALIFIED">Qualified</option>
    <option value="PROPOSAL">Proposal</option>
    <option value="DEMO">Demo</option>
    <option value="NEGOTIATIONS">Negotiations</option>
    <option value="CLOSED_WON">Closed - Won</option>
    <option value="CLOSED_LOST">Closed - Lost</option>
  </select>
</div>


            <div>
              <Label htmlFor="source">Source</Label>
              <select
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full p-2 border rounded-md text-sm"
              >
                <option value="ONLINE">Online</option>
                <option value="REFERRAL">Referral</option>
                <option value="WEBSITE">Website</option>
                <option value="SOCIAL">Social</option>
              </select>
            </div>

            <div>
              <Label htmlFor="user">User</Label>
              <select
                id="user"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className="w-full p-2 border rounded-md text-sm"
                disabled={users.length === 0}
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="label">Label (Optional)</Label>
              <select
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full p-2 border rounded-md text-sm"
              >
                <option value="">Select...</option>
                <option value="HOT">Hot</option>
                <option value="COLD">Cold</option>
                <option value="VIP">VIP</option>
              </select>
            </div>

            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div>
              <Label>Automation</Label>
              <div className="flex items-center space-x-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="email-automation"
                    checked={emailAutomation}
                    onChange={(e) => setEmailAutomation(e.target.checked)}
                    className="mr-1"
                  />
                  <Label htmlFor="email-automation" className="text-sm">
                    Email
                  </Label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="whatsapp-automation"
                    checked={whatsappAutomation}
                    onChange={(e) => setWhatsappAutomation(e.target.checked)}
                    className="mr-1"
                  />
                  <Label htmlFor="whatsapp-automation" className="text-sm">
                    WhatsApp
                  </Label>
                </div>
              </div>
            </div>
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
            disabled={!selectedFile || importing || users.length === 0}
            className="h-9 px-3 text-sm"
          >
            {importing ? "Importing..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportLeadModal;