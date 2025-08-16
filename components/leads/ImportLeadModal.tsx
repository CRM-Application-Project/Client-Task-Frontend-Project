"use client";
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, CheckCircle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { importLead } from '@/app/services/data.service';

interface ImportLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportLeads: (leads: any[]) => void;
}

const ImportLeadModal: React.FC<ImportLeadModalProps> = ({ 
  isOpen, 
  onClose, 
  onImportLeads 
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState('NEW');
  const [source, setSource] = useState('ONLINE');
  const [user, setUser] = useState('Umesh G');
  const [label, setLabel] = useState('');
  const [date, setDate] = useState('');
  const [emailAutomation, setEmailAutomation] = useState(false);
  const [whatsappAutomation, setWhatsappAutomation] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    
    try {
      const response = await importLead(selectedFile, status, user);
      
      if (response.isSuccess) {
        toast({
          title: "Success",
          description: "Leads imported successfully",
          variant: "default",
        });
        
        // If you want to update the UI with the imported leads,
        // you might need to fetch the leads again or use the response data
        // For now, we'll call the onImportLeads callback with empty array
        // since the API response structure isn't shown to include the leads
        onImportLeads([]);
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
    // Create a sample CSV content
    const csvContent = "Name,Email,Phone,Company,Location,Status,Priority,Source,Assigned To\n" +
      "John Doe,john@example.com,+1 (555) 123-4567,Acme Inc,New York,NEW,MEDIUM,WEBSITE,Sarah Johnson\n" +
      "Jane Smith,jane@example.com,+1 (555) 987-6543,Globex Corp,Chicago,NEW,HIGH,REFERRAL,Michael Brown";
    
    // Create a blob and download it
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads_import_sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Leads</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple leads at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            {!selectedFile ? (
              <div className="space-y-2">
                <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                <div className="text-sm text-gray-600">
                  <Label htmlFor="file-upload" className="cursor-pointer text-blue-600 hover:text-blue-500">
                    Click to upload
                  </Label>
                  <span> or drag and drop</span>
                </div>
                <p className="text-xs text-gray-500">CSV files up to 10MB</p>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center">
                <FileText className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-900">{selectedFile.name}</span>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="LOST">Lost</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="source">Source</Label>
              <select
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="ONLINE">Online</option>
                <option value="REFERRAL">Referral</option>
                <option value="WEBSITE">Website</option>
                <option value="SOCIAL">Social</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="user">User</Label>
              <select
                id="user"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="Umesh G">Umesh G</option>
                <option value="John Doe">John Doe</option>
                <option value="Jane Smith">Jane Smith</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="label">Label (Optional)</Label>
              <select
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Select...</option>
                <option value="HOT">Hot</option>
                <option value="COLD">Cold</option>
                <option value="VIP">VIP</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Automation</Label>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="email-automation"
                    checked={emailAutomation}
                    onChange={(e) => setEmailAutomation(e.target.checked)}
                    className="mr-2"
                  />
                  <Label htmlFor="email-automation">Email</Label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="whatsapp-automation"
                    checked={whatsappAutomation}
                    onChange={(e) => setWhatsappAutomation(e.target.checked)}
                    className="mr-2"
                  />
                  <Label htmlFor="whatsapp-automation">WhatsApp</Label>
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>CSV Format:</strong></p>
            <p>Name, Email, Phone, Company, Location, Status, Priority, Source, Assigned To</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={downloadSampleFormat}
            className="mr-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Format
          </Button>
          <Button type="button" variant="outline" onClick={handleClose} disabled={importing}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!selectedFile || importing}
          >
            {importing ? 'Importing...' : 'Import Leads'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportLeadModal;