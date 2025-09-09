"use client";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LeadStatus, LeadSource, LeadPriority } from "../../lib/leads";
import { useToast } from "@/hooks/use-toast";
import { updateLead, fetchLeadStages, getAssignDropdown } from "@/app/services/data.service";
import { useCountryCodes } from "@/hooks/useCountryCodes";
import { LeadStage } from "@/lib/data";

// Updated Lead interface to match the new structure
interface Lead {
  leadId: string;
  leadStatus: string;
  leadSource: string;
  leadAddedBy: string;
  leadAssignedTo: string | null;
  companyName: string | null;
  companyEmailAddress: string;
  customerMobileNumber: string;
  customerEmailAddress: string;
  customerName: string;
  leadPriority: LeadPriority;
  leadLabel: string;
  leadReference: string;
  leadAddress: string;
  comment: string;
  leadFollowUp: string;
  nextFollowUpDate: string | null;
  createdAt: string;
  updatedAt: string;
  assignedToName?: string;
}


const formSchema = z.object({
  customerName: z
    .string()
    .min(1, "Name is required")
    .regex(
      /^[A-Za-z\s.'-]+$/,
      "Name must only contain letters and valid symbols"
    ),
  customerEmailAddress: z.string().email("Invalid email address"),
  customerMobileNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(12, "Phone number cannot exceed 12 digits")
    .regex(/^\d+$/, "Phone number must contain only digits"),
  companyEmailAddress: z
    .string()
    .email("Invalid company email address")
    .optional()
    .or(z.literal("")),
  leadAddress: z.string().optional().or(z.literal("")),
  leadStatus: z.string().min(1, "Status is required"),
  leadPriority: z.string().min(1, "Priority is required"),
  leadSource: z.string().min(1, "Source is required"),
  leadAssignedTo: z.string().optional().or(z.literal("")),
  leadLabel: z.string().optional().or(z.literal("")),
  leadReference: z.string().optional().or(z.literal("")),
  comment: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;
type CountryCode = {
  name: string;
  code: string;
};
interface AssignDropdown {
  id: string;
  label: string;
}
interface EditLeadModalProps {
  countryCodes: CountryCode[];
  loadingCountryCodes: boolean;
  isOpen: boolean;
  onClose: () => void;
  onUpdateLead: (lead: Lead) => void;
  lead: Lead | null;
  leadStages: LeadStage[]; // Add leadStages prop
}

const EditLeadModal: React.FC<EditLeadModalProps> = ({
  countryCodes,
  loadingCountryCodes,
  isOpen,
  onClose,
  onUpdateLead,
  lead,
  leadStages, // Receive leadStages as prop
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedCode, setSelectedCode] = useState("+91");

  const [stages, setStages] = useState<LeadStage[]>([]);
  const [loadingStages, setLoadingStages] = useState(false);
  const [assignees, setAssignees] = useState<AssignDropdown[]>([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);

  // Fetch lead stages if not provided via props
  useEffect(() => {
    const fetchStages = async () => {
      if (leadStages && leadStages.length > 0) {
        setStages(leadStages);
        return;
      }

      setLoadingStages(true);
      try {
        const response = await fetchLeadStages();
        if (response.isSuccess && response.data) {
          setStages(response.data);
        } else {
          console.error("Failed to fetch lead stages:", response.message);
          // Fallback to empty array
          setStages([]);
        }
      } catch (error) {
        console.error("Error fetching lead stages:", error);
        setStages([]);
      } finally {
        setLoadingStages(false);
      }
    };

    if (isOpen) {
      fetchStages();
    }
  }, [isOpen, leadStages]);

  // Fetch assignees when modal opens
  useEffect(() => {
    const fetchAssignees = async () => {
      if (!isOpen) return;

      setLoadingAssignees(true);
      try {
        const response = await getAssignDropdown();
        if (response.isSuccess && response.data) {
          setAssignees(response.data);
        } else {
          console.error("Failed to fetch assignees:", response.message);
          setAssignees([]);
        }
      } catch (error) {
        console.error("Error fetching assignees:", error);
        setAssignees([]);
      } finally {
        setLoadingAssignees(false);
      }
    };

    if (isOpen) {
      fetchAssignees();
    }
  }, [isOpen]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      customerName: lead?.customerName || "",
      customerEmailAddress: lead?.customerEmailAddress || "",
      customerMobileNumber: lead?.customerMobileNumber || "",
      companyEmailAddress: lead?.companyEmailAddress || "",
      leadAddress: lead?.leadAddress || "",
      leadStatus: lead?.leadStatus || "",
      leadPriority: lead?.leadPriority || "",
      leadSource: lead?.leadSource || "",
      leadAssignedTo: lead?.leadAssignedTo || "",
      leadLabel: lead?.leadLabel || "",
      leadReference: lead?.leadReference || "",
      comment: lead?.comment || "",
    },
  });

  // Watch all form fields to detect changes
  const formValues = form.watch();

  // Check if form has changes compared to initial lead data
  useEffect(() => {
    if (!lead) return;

    const initialValues = {
      customerName: lead.customerName,
      customerEmailAddress: lead.customerEmailAddress,
      customerMobileNumber: lead.customerMobileNumber,
      companyEmailAddress: lead.companyEmailAddress || "",
      leadAddress: lead.leadAddress || "",
      leadStatus: lead.leadStatus,
      leadPriority: lead.leadPriority || "",
      leadSource: lead.leadSource,
      leadAssignedTo: lead.leadAssignedTo || "",
      leadLabel: lead.leadLabel || "",
      leadReference: lead.leadReference || "",
      comment: lead.comment || "",
    };

    const hasFormChanged = Object.keys(initialValues).some(
      (key) =>
        formValues[key as keyof FormData] !==
        initialValues[key as keyof typeof initialValues]
    );

    setHasChanges(hasFormChanged);
  }, [formValues, lead]);

  useEffect(() => {
  if (lead && countryCodes.length > 0) {
    const { code, number } = parsePhoneNumber(
      lead.customerMobileNumber,
      countryCodes
    );

    // Find the assignee ID from the assignees list based on lead.leadAssignedTo
    let assignedToId = "";
    if (lead.leadAssignedTo && assignees.length > 0) {
      const assignee = assignees.find(a => a.label === lead.leadAssignedTo || a.id === lead.leadAssignedTo);
      assignedToId = assignee?.id || "";
    }

    form.reset({
      customerName: lead.customerName,
      customerEmailAddress: lead.customerEmailAddress,
      customerMobileNumber: number,
      companyEmailAddress: lead.companyEmailAddress,
      leadAddress: lead.leadAddress,
      leadStatus: lead.leadStatus,
      leadPriority: lead.leadPriority , // Ensure priority is set
      leadSource: lead.leadSource,
      leadAssignedTo: assignedToId,
      leadLabel: lead.leadLabel || "",
      leadReference: lead.leadReference || "",
      comment: lead.comment || "",
    });

    setSelectedCode(code);
  }
}, [lead, form, countryCodes, assignees]);

  const parsePhoneNumber = (
    phone: string,
    countryCodes: { code: string }[]
  ) => {
    if (!phone) return { code: "+91", number: "" };

    const sortedCodes = [...countryCodes].sort(
      (a, b) => b.code.length - a.code.length
    );

    // find the longest matching code from your list
    const matched = countryCodes.find((c) => phone.startsWith(c.code));

    if (matched) {
      return {
        code: matched.code,
        number: phone.slice(matched.code.length),
      };
    }

    // fallback: treat entire number as local
    return { code: "+91", number: phone };
  };

  const onSubmit = async (data: FormData) => {
  if (!lead) return;

  setIsSubmitting(true);

  try {
    // Prepend country code to phone number
    const phoneWithCode = `${selectedCode}${data.customerMobileNumber.replace(
      /^\+\d+/,
      ""
    )}`;

    // Find the selected assignee label
    const selectedAssignee = assignees.find(a => a.id === data.leadAssignedTo);
    const assigneeLabel = selectedAssignee?.label || "";

    const payload = {
      leadId: lead.leadId,
      customerName: data.customerName,
      customerEmailAddress: data.customerEmailAddress,
      customerMobileNumber: phoneWithCode,
      companyEmailAddress: data.companyEmailAddress || "",
      leadAddress: data.leadAddress || "",
      leadStatus: data.leadStatus as LeadStatus,
      leadPriority: data.leadPriority as LeadPriority, // Include priority
      leadSource: data.leadSource as LeadSource,
      leadAddedBy: lead.leadAddedBy,
      leadAssignedTo: data.leadAssignedTo || null,
      leadLabel: data.leadLabel || "",
      leadReference: data.leadReference || "",
      comment: data.comment || "",
    };

      const response = await updateLead(payload);

      if (response.isSuccess) {
        // Create the updated lead object
        const updatedLead: Lead = {
          ...lead,
          customerName: data.customerName,
          customerEmailAddress: data.customerEmailAddress,
          customerMobileNumber: phoneWithCode,
          companyEmailAddress: data.companyEmailAddress || "",
          leadAddress: data.leadAddress || "",
          leadStatus: data.leadStatus as LeadStatus,
          leadPriority: data.leadPriority as LeadPriority,
          leadSource: data.leadSource as LeadSource,
          leadAssignedTo: data.leadAssignedTo || null,
          assignedToName: assigneeLabel || undefined,
          leadLabel: data.leadLabel || "",
          leadReference: data.leadReference || "",
          comment: data.comment || "",
          updatedAt: new Date().toISOString(),
        };

        form.reset({
          ...data,
          customerMobileNumber: getPhoneWithoutCode(phoneWithCode),
        });
        setSelectedCode(selectedCode);

        // Close modal first
        onClose();

        // Update local state immediately
        onUpdateLead(updatedLead);

        // Show success toast
        toast({
          title: "Lead updated",
          description:
            response.message ||
            "Lead information has been successfully updated.",
        });
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to update lead",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error updating lead:", error);
      toast({
        title: "Error",
        description:
          error.message || "An error occurred while updating the lead.",
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

  // Extract phone number without country code for display
  const getPhoneWithoutCode = (phone: string) => {
    if (!phone) return "";
    const codeMatch = phone.match(/^(\+\d+)(.*)/);
    return codeMatch ? codeMatch[2] : phone;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>Edit Lead</DialogTitle>
          <DialogDescription>
            Update the lead information below.
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
                      <Input
                        placeholder="customer@example.com"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          form.trigger("customerEmailAddress");
                        }}
                      />
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
                    <div className="flex">
                      <Select
                        value={selectedCode}
                        onValueChange={setSelectedCode}
                      >
                        <SelectTrigger className="w-[80px] mr-2">
                          <SelectValue placeholder="+91" />
                        </SelectTrigger>
                        <SelectContent className="w-[240px]">
                          {countryCodes.map((code) => (
                            <SelectItem key={code.code} value={code.code}>
                              {code.code} &nbsp; {code.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormControl>
                        <Input
                          placeholder="1234567890"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            field.onChange(value);
                            form.trigger("customerMobileNumber");
                          }}
                          maxLength={10}
                          minLength={10}
                        />
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
                    <FormLabel>Company Email (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="company@example.com"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          if (e.target.value)
                            form.trigger("companyEmailAddress");
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="leadAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Street, City, State, ZIP"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="leadAssignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {loadingAssignees ? (
                          <SelectItem value="loading" disabled>
                            Loading assignees...
                          </SelectItem>
                        ) : assignees.length > 0 ? (
                          assignees.map((assignee) => (
                            <SelectItem
                              key={assignee.id}
                              value={assignee.id}
                            >
                              {assignee.label}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-assignees" disabled>
                            No assignees available
                          </SelectItem>
                        )}
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
                    <FormLabel>Lead Label (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Lead label" {...field} />
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
                    <FormLabel>Lead Reference (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Lead reference" {...field} />
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
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {loadingStages ? (
                          <SelectItem value="loading" disabled>
                            Loading stages...
                          </SelectItem>
                        ) : stages.length > 0 ? (
                          stages.map((stage) => (
                            <SelectItem
                              key={stage.leadStageId}
                              value={stage.leadStageName}
                            >
                              {stage.leadStageName}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="loading" disabled>
                            No stages available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
  control={form.control}
  name="leadPriority"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Priority</FormLabel>
      <Select onValueChange={field.onChange} value={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="LOW">Low</SelectItem>
          <SelectItem value="MEDIUM">Medium</SelectItem>
          <SelectItem value="HIGH">High</SelectItem>
          <SelectItem value="URGENT">Urgent</SelectItem>
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
                    <FormLabel>Source</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="WEBSITE">Website</SelectItem>
                        <SelectItem value="REFERRAL">Referral</SelectItem>
                        <SelectItem value="SOCIAL_MEDIA">
                          Social Media
                        </SelectItem>
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

            </div>

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comments (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional comments..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting || !hasChanges || !form.formState.isValid
                }
                className={`bg-brand-primary text-text-white hover:bg-brand-primary/90 ${
                  isSubmitting || !hasChanges || !form.formState.isValid
                    ? "btn-disabled"
                    : ""
                }`}
              >
                {isSubmitting ? "Updating..." : "Update Lead"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditLeadModal;