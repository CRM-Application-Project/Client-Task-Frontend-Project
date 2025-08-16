"use client";
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';
import { Lead } from '../../lib/leads';
import { useToast } from '@/hooks/use-toast';
import { addFollowUp } from '@/app/services/data.service';

const formSchema = z.object({
  nextFollowupDate: z.string().min(1, 'Next followup date is required'),
  followUpType: z.string().min(1, 'Follow-up type is required'),
  comment: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onAddFollowUp: (leadId: string, followUp: any) => void;
}

const AddFollowUpModal: React.FC<AddFollowUpModalProps> = ({ 
  isOpen, 
  onClose, 
  lead, 
  onAddFollowUp 
}) => {
  const [attachments, setAttachments] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nextFollowupDate: '',
      followUpType: 'CALL',
      comment: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!lead) return;
    
    setIsLoading(true);
    
    try {
      const payload = {
        leadId: lead.id,
        nextFollowUpDate: data.nextFollowupDate,
        followUpType: data.followUpType,
        comment: data.comment || '',
      };

      const response = await addFollowUp(payload);
      
      if (response.isSuccess) {
        toast({
          title: "Success",
          description: "Follow-up has been successfully scheduled.",
          variant: "default",
        });
        
        const followUp = {
          id: Date.now().toString(),
          nextFollowupDate: data.nextFollowupDate,
          followUpType: data.followUpType,
          comment: data.comment,
          attachments: attachments.map(file => file.name),
          completed: false,
          createdAt: new Date(),
        };

        onAddFollowUp(lead.id, followUp);
        handleClose();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to schedule follow-up",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error scheduling follow-up:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while scheduling follow-up",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setAttachments([]);
    onClose();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      setAttachments(prev => [...prev, ...files]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...files]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[500px] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between pb-2">
          <DialogTitle className="text-base font-medium text-gray-900">
            Add Lead Followup
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nextFollowupDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Next Followup Date:
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="datetime-local" 
                      {...field}
                      className="mt-1 h-8"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="followUpType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Follow-up Type:
                  </FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="mt-1 block w-full h-8 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                    >
                      <option value="CALL">Call</option>
                      <option value="EMAIL">Email</option>
                      <option value="MEETING">Meeting</option>
                      <option value="MESSAGE">Message</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Comment/message:
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter Message"
                      className="min-h-[80px] mt-1 resize-none text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel className="text-sm font-medium text-gray-700 mb-2 block">
                Attachment: (Optional)
              </FormLabel>
              
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors relative ${
                  dragActive 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
                style={{ cursor: 'pointer' }}
              >
                <Upload className="mx-auto h-6 w-6 text-gray-400 mb-2 pointer-events-none" />
                <p className="text-sm text-gray-600 font-medium mb-1 pointer-events-none">
                  Drop Files here or click to upload
                </p>
                <p className="text-xs text-gray-500 mb-1 pointer-events-none">
                  Allowed IMAGES, VIDEOS, PDF, DOCS, EXCEL, PPT, TEXT
                </p>
                <p className="text-xs text-gray-400 pointer-events-none">
                  max size of 5 MB
                </p>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.gif,.mp4,.mov,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                />
              </div>

              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm text-gray-700 truncate flex-1">
                        {file.name} ({formatFileSize(file.size)})
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                        className="h-6 w-6 p-0 hover:bg-gray-200"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                type="submit" 
                className="px-6 h-9 text-white text-sm"
                style={{ backgroundColor: '#636363' }}
                disabled={isLoading}
              >
                {isLoading ? "Submitting..." : "Submit"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                className="px-6 h-9 text-sm"
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddFollowUpModal;