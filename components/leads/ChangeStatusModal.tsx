"use client";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LeadStatus } from "../../lib/leads";
import { changeLeadStatus } from "@/app/services/data.service";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  status: z.string().min(1, "Please select a status"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;
interface Lead {
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

interface ChangeStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onChangeStatus: (leadId: string, status: LeadStatus, notes?: string) => void;
}

const ChangeStatusModal: React.FC<ChangeStatusModalProps> = ({
  isOpen,
  onClose,
  lead,
  onChangeStatus,
}) => {
  const { toast } = useToast();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: lead?.leadStatus || "",
      notes: "",
    },
  });

  // Watch the status field to determine if button should be enabled
  const status = form.watch("status");

  // Check if a valid status is selected
  const isFormValid = status && status.length > 0;

  React.useEffect(() => {
    if (lead) {
      form.reset({
        status: lead.leadStatus,
        notes: "",
      });
    }
  }, [lead, form]);

  const onSubmit = async (data: FormData) => {
    if (!lead) return;

    try {
      const payload = {
        leadId: lead.leadId,
        leadStatus: data.status,
        message: data.notes,
      };

      const response = await changeLeadStatus(payload);

      if (response.isSuccess) {
        onChangeStatus(lead.leadId, data.status as LeadStatus, data.notes);
        toast({
          title: "Status updated",
          description: "Lead status has been successfully updated.",
        });
      } else {
        throw new Error(response.message || "Failed to update lead status");
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update lead status",
        variant: "destructive",
      });
    } finally {
      form.reset();
      onClose();
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const statusOptions = [
    {
      value: "NEW",
      label: "New",
      description: "Newly created lead",
      color: "text-gray-800",
    },
    {
      value: "CONTACTED",
      label: "Contacted",
      description: "Initial contact made",
      color: "text-gray-800",
    },
    {
      value: "QUALIFIED",
      label: "Qualified",
      description: "Lead qualified as potential customer",
      color: "text-gray-800",
    },
    {
      value: "PROPOSAL",
      label: "Proposal",
      description: "Proposal sent to lead",
      color: "text-gray-800",
    },
    {
      value: "DEMO",
      label: "Demo",
      description: "Demo scheduled or completed",
      color: "text-gray-800",
    },
    {
      value: "NEGOTIATIONS",
      label: "Negotiations",
      description: "In negotiation phase",
      color: "text-gray-800",
    },
    {
      value: "CLOSED_WON",
      label: "Closed Won",
      description: "Successfully converted to customer",
      color: "text-gray-800",
    },
    {
      value: "CLOSED_LOST",
      label: "Closed Lost",
      description: "Lead did not convert",
      color: "text-gray-800",
    },
  ];

  const getCurrentStatus = () => {
    return statusOptions.find((option) => option.value === lead?.leadStatus);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md md:max-w-lg rounded-lg">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-semibold">
            Update Lead Status
          </DialogTitle>
          <DialogDescription className="flex flex-col gap-2 mt-2">
            <span>
              Change the status for{" "}
              <span className="font-medium">{lead?.customerName}</span>
            </span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5 py-2"
          >
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Select New Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 w-full">
                        <SelectValue placeholder="Choose a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-72">
                      {statusOptions.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="py-3"
                        >
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              {option.label}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {option.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">
                    Message<span className="text-red-600">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a note or message"
                      className="min-h-[80px]"
                      {...field}
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0 flex flex-col-reverse sm:flex-row mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="h-11 flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className={`h-11 flex-1 ${!isFormValid ? "btn-disabled" : ""}`}
                disabled={!isFormValid}
              >
                Update Status
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeStatusModal;
