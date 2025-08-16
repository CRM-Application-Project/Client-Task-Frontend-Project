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
import { Upload, FileText, CheckCircle } from 'lucide-react';

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    
    // Simulate file processing
    setTimeout(() => {
      // Mock imported leads data
      const mockImportedLeads = [
        {
          name: 'Imported Lead 1',
          email: 'imported1@example.com',
          phone: '+1 (555) 111-1111',
          company: 'Imported Company 1',
          location: 'Imported City 1',
          status: 'NEW',
          priority: 'MEDIUM',
          source: 'IMPORT',
          assignedTo: 'John Smith',
        },
        {
          name: 'Imported Lead 2',
          email: 'imported2@example.com',
          phone: '+1 (555) 222-2222',
          company: 'Imported Company 2',
          location: 'Imported City 2',
          status: 'NEW',
          priority: 'LOW',
          source: 'IMPORT',
          assignedTo: 'Jane Doe',
        },
      ];

      onImportLeads(mockImportedLeads);
      setImporting(false);
      setSelectedFile(null);
      onClose();
    }, 2000);
  };

  const handleClose = () => {
    setSelectedFile(null);
    setImporting(false);
    onClose();
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

          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>CSV Format:</strong></p>
            <p>Name, Email, Phone, Company, Location, Status, Priority, Source, Assigned To</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
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