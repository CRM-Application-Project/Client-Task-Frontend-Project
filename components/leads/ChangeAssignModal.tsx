"use client";
import React, { useEffect } from "react";
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

import { useToast } from "@/hooks/use-toast";
import {
  leadTransfer,
  getAssignDropdown,
  AssignDropdown,
} from "@/app/services/data.service";

const formSchema = z.object({
  transferToId: z.string().min(1, "Please select an assignee"),
  transferToLabel: z.string().optional(), // Will be set programmatically
});

type FormData = z.infer<typeof formSchema>;

interface ChangeAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onChangeAssign: (
    leadId: string,
    assignedToId: string,
    assignedToLabel: string
  ) => void;
}

const ChangeAssignModal: React.FC<ChangeAssignModalProps> = ({
  isOpen,
  onClose,
  lead,
  onChangeAssign,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [assignees, setAssignees] = React.useState<AssignDropdown[]>([]);
  const [loadingAssignees, setLoadingAssignees] = React.useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transferToId: "",
      transferToLabel: "",
    },
  });

  // Watch the transferToId field to determine if button should be enabled
  const transferToId = form.watch("transferToId");
  
  // Check if a valid assignee is selected and lead is not temporary
  const isTemporaryLead = lead ? lead.leadId.startsWith('temp-') : false;
  const isFormValid = transferToId && transferToId.length > 0 && !isTemporaryLead;

  // Fetch assignees when modal opens
  React.useEffect(() => {
    const fetchAssignees = async () => {
      if (!isOpen) return;

      setLoadingAssignees(true);
      try {
        const response = await getAssignDropdown();
        if (response.isSuccess && response.data) {
          setAssignees(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch assignees:", error);
        toast({
          title: "Error",
          description: "Failed to load assignees",
          variant: "destructive",
        });
      } finally {
        setLoadingAssignees(false);
      }
    };

    fetchAssignees();
  }, [isOpen, toast]);

  // Reset form when lead changes
  React.useEffect(() => {
    if (lead) {
      const currentAssignee = assignees.find(
        (a) => a.label === lead.leadAssignedTo
      );
      form.reset({
        transferToId: currentAssignee?.id || "",
        transferToLabel: lead.leadAssignedTo || "",
      });
    }
  }, [lead, assignees, form]);

  const onSubmit = async (data: FormData) => {
    if (!lead) return;

    // Check if this is a temporary lead ID
    if (lead.leadId.startsWith('temp-')) {
      toast({
        title: "Cannot Transfer",
        description: "Please wait for the lead to be fully created before transferring",
        variant: "destructive",
      });
      return;
    }

    const selectedAssignee = assignees.find((a) => a.id === data.transferToId);
    if (!selectedAssignee) {
      toast({
        title: "Error",
        description: "Selected assignee not found",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await leadTransfer({
        leadId: lead.leadId,
        transferTo: selectedAssignee.label,
      });

      if (response.isSuccess) {
        toast({
          title: "Success",
          description: "Lead has been transferred successfully",
          variant: "default",
        });

        // Call the parent with both ID and label
        onChangeAssign(
          lead.leadId,
          selectedAssignee.id,
          selectedAssignee.label
        );
        onClose();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to transfer lead",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error transferring lead:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while transferring the lead",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Transfer Lead</DialogTitle>
          <DialogDescription>
            Transfer {lead?.customerName} to a different team member
            {isTemporaryLead && (
              <div className="mt-2 text-amber-600 text-sm">
                Note: Please wait for the lead to be fully saved before transferring.
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="transferToId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transfer To</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Update the label when selection changes
                      const selected = assignees.find((a) => a.id === value);
                      form.setValue("transferToLabel", selected?.label || "");
                    }}
                    value={field.value}
                    disabled={isSubmitting || loadingAssignees || isTemporaryLead}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingAssignees
                              ? "Loading assignees..."
                              : isTemporaryLead
                              ? "Lead not ready for transfer"
                              : "Select team member"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {assignees.map((assignee) => (
                        <SelectItem key={assignee.id} value={assignee.id}>
                          {assignee.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || loadingAssignees || !isFormValid}
                className={`${
                  (isSubmitting || loadingAssignees || !isFormValid) ? "btn-disabled" : "background-gray-600 hover:bg-gray-700 text-white"
                }`}
                title={isTemporaryLead ? "Cannot transfer lead until it's fully created" : ""}
              >
                {isSubmitting ? "Transferring..." : "Transfer Lead"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeAssignModal;