"use client";
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Lead, LeadStatus } from '../../lib/leads';
import { updateLead } from '@/app/services/data.service';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  status: z.string().min(1, 'Please select a status'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

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
  onChangeStatus 
}) => {
  const { toast } = useToast();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: lead?.status || '',
      notes: '',
    },
  });

  React.useEffect(() => {
    if (lead) {
      form.reset({ 
        status: lead.status,
        notes: '',
      });
    }
  }, [lead, form]);

  const onSubmit = async (data: FormData) => {
    if (!lead) return;

    try {
      const payload = {
        leadId: lead.id,
        leadStatus: data.status,
        leadSource: lead.source,
        leadAddedBy: lead.assignedTo,
        customerMobileNumber: lead.phone,
        companyEmailAddress: lead.company,
        customerName: lead.name,
        customerEmailAddress: lead.email,
        leadAddress: lead.location || '',
        leadLabel: lead.leadLabel || '', // Add default or actual value
        leadReference: lead.leadReference || '', // Add default or actual value
        comment: data.notes || '', // Use notes as comment
      };

      const response = await updateLead(payload);
      
      if (response.isSuccess) {
        onChangeStatus(lead.id, data.status as LeadStatus, data.notes);
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
        description: error instanceof Error ? error.message : "Failed to update lead status",
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
    { value: 'NEW', label: 'New', description: 'Newly created lead' },
    { value: 'CONTACTED', label: 'Contacted', description: 'Initial contact made' },
    { value: 'QUALIFIED', label: 'Qualified', description: 'Lead qualified as potential customer' },
    { value: 'PROPOSAL', label: 'Proposal', description: 'Proposal sent to lead' },
    { value: 'DEMO', label: 'Demo', description: 'Demo scheduled or completed' },
    { value: 'NEGOTIATIONS', label: 'Negotiations', description: 'In negotiation phase' },
    { value: 'CLOSED_WON', label: 'Closed Won', description: 'Successfully converted to customer' },
    { value: 'CLOSED_LOST', label: 'Closed Lost', description: 'Lead did not convert' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Lead Status</DialogTitle>
          <DialogDescription>
            Update the status for {lead?.name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select new status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs text-gray-500">{option.description}</div>
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
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add notes about this status change..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit">Update Status</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeStatusModal;