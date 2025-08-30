"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, X, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addFollowUp } from "@/app/services/data.service";

const formSchema = z.object({
  nextFollowupDate: z.string().min(1, "Next followup date is required"),
  followUpType: z.string().min(1, "Follow-up type is required"),
  comment: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;
interface Leads {
  leadId: string;
  leadStatus: string;
  leadSource: string;
  leadAddedBy: string;
  leadAssignedTo: string;
  customerMobileNumber: string;
  companyEmailAddress: string;
  customerName: string;
  customerEmailAddress: string;
  leadAddress: string;
  comment?: string;
  leadLabel?: string;
  leadReference?: string;
  leadPriority: LeadPriority;
  company?: string;
  createdAt: string;
  updatedAt: string;
  // Additional properties for display
  assignedToName?: string; // For display purposes
}
interface AddFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Leads | null;
  onAddFollowUp: (leadId: string, followUp: any) => void;
}

const AddFollowUpModal: React.FC<AddFollowUpModalProps> = ({
  isOpen,
  onClose,
  lead,
  onAddFollowUp,
}) => {
  const [attachments, setAttachments] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nextFollowupDate: "",
      followUpType: "CALL",
      comment: "",
    },
  });

  // Watch form fields to determine if button should be enabled
  const nextFollowupDate = form.watch("nextFollowupDate");
  const followUpType = form.watch("followUpType");
  
  // Check if required fields are filled
  const isFormValid = nextFollowupDate && followUpType;

  const onSubmit = async (data: FormData) => {
    if (!lead) return;

    setIsLoading(true);

    try {
      const payload = {
        leadId: lead.leadId,
        nextFollowUpDate: data.nextFollowupDate,
        followUpType: data.followUpType,
        comment: data.comment || "",
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
          attachments: attachments.map((file) => file.name),
          completed: false,
          createdAt: new Date(),
        };

        onAddFollowUp(lead.leadId, followUp);
        handleClose();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to schedule follow-up",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error scheduling follow-up:", error);
      toast({
        title: "Error",
        description:
          error.message ||
          "An unexpected error occurred while scheduling follow-up",
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
      setAttachments((prev) => [...prev, ...files]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...files]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Helper to format current datetime for the input
  const getCurrentDateTime = () => {
    const now = new Date();
    // Convert to local datetime string in the format YYYY-MM-DDTHH:MM
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[90vh]  bg-white overflow-y-auto p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Schedule New Follow-up
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nextFollowupDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-sm font-medium text-gray-700">
                      Next Follow-up Date *
                    </FormLabel>
                    <div className="relative">
                      <FormControl>
                        <input
                          type="datetime-local"
                          {...field}
                          className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                          min={getCurrentDateTime()}
                        />
                      </FormControl>
                    </div>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="followUpType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-sm font-medium text-gray-700">
                      Follow-up Type *
                    </FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                      >
                        <option value="CALL">Call</option>
                        <option value="EMAIL">Email</option>
                        <option value="MEETING">Meeting</option>
                        <option value="WHATSAPP">WhatsApp</option>
                        <option value="VISIT">Visit</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any additional notes about this follow-up..."
                      className="min-h-[100px] text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="px-4 h-9 text-sm"
                disabled={isLoading}
              >
                Cancel
              </Button>
           <Button
  type="submit"
  className={`px-4 h-9 text-text-white text-sm bg-brand-primary hover:bg-brand-primary/90 ${
    (isLoading || !isFormValid) ? "btn-disabled" : ""
  }`}
  disabled={isLoading || !isFormValid}
>
                {isLoading ? (
                  <span className="flex items-center">
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
                    Scheduling...
                  </span>
                ) : (
                  "Schedule Follow-up"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddFollowUpModal;