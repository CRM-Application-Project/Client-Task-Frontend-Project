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
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const formSchema = z.object({
  sortBy: z.string().min(1, 'Please select a sort field'),
  sortOrder: z.enum(['asc', 'desc']),
});

type FormData = z.infer<typeof formSchema>;

interface LeadSortingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  currentSort?: { sortBy: string; sortOrder: 'asc' | 'desc' };
}

const LeadSortingModal: React.FC<LeadSortingModalProps> = ({ 
  isOpen, 
  onClose, 
  onApplySort,
  currentSort
}) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sortBy: currentSort?.sortBy || '',
      sortOrder: currentSort?.sortOrder || 'asc',
    },
  });

  React.useEffect(() => {
    if (currentSort) {
      form.reset(currentSort);
    }
  }, [currentSort, form]);

  const onSubmit = (data: FormData) => {
    onApplySort(data.sortBy, data.sortOrder);
    onClose();
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'company', label: 'Company' },
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' },
    { value: 'source', label: 'Source' },
    { value: 'assignedTo', label: 'Assigned To' },
    { value: 'createdAt', label: 'Created Date' },
    { value: 'updatedAt', label: 'Updated Date' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sort Leads</DialogTitle>
          <DialogDescription>
            Choose how you want to sort the leads
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="sortBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort By</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select field to sort by" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sortOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort Order</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="asc" id="asc" />
                        <Label htmlFor="asc">Ascending (A-Z, Low-High)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="desc" id="desc" />
                        <Label htmlFor="desc">Descending (Z-A, High-Low)</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit">Apply Sort</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default LeadSortingModal;