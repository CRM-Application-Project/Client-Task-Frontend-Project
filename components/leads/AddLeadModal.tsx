"use client";
import React, { useEffect, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AssignDropdown, createLead, getAllLeads, getAssignDropdown } from '@/app/services/data.service';
import { useCountryCodes } from '@/hooks/useCountryCodes';
import { CreateLeadRequest } from '@/lib/data';


const formSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmailAddress: z.string().email('Invalid email address'),
  customerMobileNumber: z.string().min(1, 'Mobile number is required'),
  companyEmailAddress: z.string().email('Invalid company email address'),
  leadStatus: z.string().min(1, 'Lead status is required'),
  leadSource: z.string().min(1, 'Lead source is required'),
  leadAddedBy: z.string().min(1, 'Lead added by is required'),
  leadLabel: z.string().min(1, 'Lead label is required'),
  leadReference: z.string().min(1, 'Lead reference is required'),
  leadAddress: z.string().min(1, 'Lead address is required'),
  comment: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLead: (lead: any) => void; // Update this type according to your needs
}

const AddLeadModal: React.FC<AddLeadModalProps> = ({ isOpen, onClose, onAddLead }) => {
  const { toast } = useToast();
  const { codes, loading } = useCountryCodes();
  const [selectedCode, setSelectedCode] = useState("+91"); 
  const [phone, setPhone] = useState("");
    const [assignees, setAssignees] = useState<AssignDropdown[]>([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: '',
      customerEmailAddress: '',
      customerMobileNumber: '',
      companyEmailAddress: '',
      leadStatus: '',
      leadSource: '',
      leadAddedBy: '',
      leadLabel: '',
      leadReference: '',
      leadAddress: '',
      comment: '',
    },
  });

const onSubmit = async (data: FormData) => {
    try {
      const leadData: CreateLeadRequest = {
        leadStatus: data.leadStatus as LeadStatus,
        leadSource: data.leadSource as LeadSource,
        leadAddedBy: data.leadAddedBy,
customerMobileNumber: `${selectedCode}${data.customerMobileNumber}`,
        companyEmailAddress: data.companyEmailAddress,
        customerName: data.customerName,
        customerEmailAddress: data.customerEmailAddress,
        leadLabel: data.leadLabel,
        leadReference: data.leadReference,
        leadAddress: data.leadAddress,
        comment: data.comment || '',
      };

      const response = await createLead(leadData);

      if (response.isSuccess) {
        toast({
          title: "Success",
          description: "Lead created successfully",
          variant: "default",
        });
        
       
        const allLeadsResponse = await getAllLeads();
        if (allLeadsResponse.isSuccess) {
          onAddLead(allLeadsResponse.data);
        }
        
        form.reset();
        onClose();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to create lead",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while creating the lead",
        variant: "destructive",
      });
      console.error("Error creating lead:", error);
    }
  };

   useEffect(() => {
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
  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new lead to your CRM.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter customer name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerEmailAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Email</FormLabel>
                    <FormControl>
                      <Input placeholder="customer@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerMobileNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <div className="flex gap-2">
                      <Select 
                        value={selectedCode} 
                        onValueChange={setSelectedCode}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {loading ? (
                            <SelectItem value="loading">Loading...</SelectItem>
                          ) : (
                            codes.map((c) => (
                              <SelectItem key={c.code} value={c.code}>
                                {c.name} ({c.code})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormControl>
                        <Input placeholder="1234567890" {...field} />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyEmailAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Email</FormLabel>
                    <FormControl>
                      <Input placeholder="contact@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="leadStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NEW">New</SelectItem>
                        <SelectItem value="CONTACTED">Contacted</SelectItem>
                        <SelectItem value="QUALIFIED">Qualified</SelectItem>
                        <SelectItem value="PROPOSAL">Proposal</SelectItem>
                        <SelectItem value="DEMO">Demo</SelectItem>
                        <SelectItem value="NEGOTIATIONS">Negotiations</SelectItem>
                        <SelectItem value="CLOSED_WON">Closed Won</SelectItem>
                        <SelectItem value="CLOSED_LOST">Closed Lost</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="leadSource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Source</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="WEBSITE">Website</SelectItem>
                        <SelectItem value="REFERRAL">Referral</SelectItem>
                        <SelectItem value="SOCIAL_MEDIA">Social Media</SelectItem>
                        <SelectItem value="EMAIL">Email</SelectItem>
                        <SelectItem value="PHONE">Phone</SelectItem>
                        <SelectItem value="EVENT">Event</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

               <FormField
                control={form.control}
                name="leadAddedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={loadingAssignees}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingAssignees ? "Loading assignees..." : "Select assignee"} />
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


              <FormField
                control={form.control}
                name="leadLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Label</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter lead label" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="leadReference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Reference</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter reference number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="leadAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter address" {...field} />
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
                  <FormLabel>Comment</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter any additional comments..."
                      className="min-h-[100px]"
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
              <Button type="submit">Add Lead</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddLeadModal;