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
import { Lead } from '../../lib/leads';

const formSchema = z.object({
  assignedTo: z.string().min(1, 'Please select an assignee'),
});

type FormData = z.infer<typeof formSchema>;

interface ChangeAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onChangeAssign: (leadId: string, assignedTo: string) => void;
}

const ChangeAssignModal: React.FC<ChangeAssignModalProps> = ({ 
  isOpen, 
  onClose, 
  lead, 
  onChangeAssign 
}) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assignedTo: lead?.assignedTo || '',
    },
  });

  React.useEffect(() => {
    if (lead) {
      form.reset({ assignedTo: lead.assignedTo });
    }
  }, [lead, form]);

  const onSubmit = (data: FormData) => {
    if (!lead) return;

    onChangeAssign(lead.id, data.assignedTo);
    onClose();
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  // Sample team members - in a real app, this would come from an API
  const teamMembers = [
    'John Smith',
    'Jane Doe',
    'Mike Johnson',
    'Sarah Wilson',
    'Alex Brown',
    'Emily Davis',
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Assignment</DialogTitle>
          <DialogDescription>
            Reassign {lead?.name} to a different team member
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign To</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member} value={member}>
                          {member}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit">Update Assignment</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeAssignModal;