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
import { updateLead } from "@/app/services/data.service";
import { useCountryCodes } from "@/hooks/useCountryCodes";

// Updated Lead interface to match the new structure
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
  leadPriority?: LeadPriority;
  company?: string;
  createdAt: string;
  updatedAt: string;
  // Additional properties for display
  assignedToName?: string;
}

const formSchema = z.object({
  customerName: z
    .string()
    .min(1, "Name is required")
    .regex(/^[A-Za-z\s.'-]+$/, "Name must only contain letters and valid symbols"),
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
  leadLabel: z.string().optional().or(z.literal("")),
  leadReference: z.string().optional().or(z.literal("")),
  comment: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateLead: (lead: Lead) => void;
  lead: Lead | null;
}

const EditLeadModal: React.FC<EditLeadModalProps> = ({
  isOpen,
  onClose,
  onUpdateLead,
  lead,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedCode, setSelectedCode] = useState("+91");
  const { codes: countryCodes, loading: loadingCountryCodes } =
    useCountryCodes();

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

      form.reset({
        customerName: lead.customerName,
        customerEmailAddress: lead.customerEmailAddress,
        customerMobileNumber: number,
        companyEmailAddress: lead.companyEmailAddress,
        leadAddress: lead.leadAddress,
        leadStatus: lead.leadStatus,
        leadPriority: lead.leadPriority,
        leadSource: lead.leadSource,
        leadLabel: lead.leadLabel || "",
        leadReference: lead.leadReference || "",
        comment: lead.comment || "",
      });

      setSelectedCode(code);
    }
  }, [lead, form, countryCodes]);

  // ✅ Correctly extracts country code + local number
  const parsePhoneNumber = (
    phone: string,
    countryCodes: { code: string }[]
  ) => {
    if (!phone) return { code: "+91", number: "" };

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

      const payload = {
        leadId: lead.leadId,
        customerName: data.customerName,
        customerEmailAddress: data.customerEmailAddress,
        customerMobileNumber: phoneWithCode,
        companyEmailAddress: data.companyEmailAddress || "",
        leadAddress: data.leadAddress || "",
        leadStatus: data.leadStatus as LeadStatus,
        leadPriority: data.leadPriority as LeadPriority,
        leadSource: data.leadSource as LeadSource,
        leadAddedBy: lead.leadAddedBy, // Keep the original assigned to value
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
          description: "Lead information has been successfully updated.",
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

              {/* Display Assigned To as read-only */}
              <FormItem>
                <FormLabel>Assigned To</FormLabel>
                <FormControl>
                  <Input
                    value={lead?.assignedToName || lead?.leadAddedBy || ""}
                    readOnly
                    disabled
                    className="bg-gray-100"
                  />
                </FormControl>
              </FormItem>

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
                        <SelectItem value="NEW LEAD">New Lead</SelectItem>
                        <SelectItem value="CONTACTED">Contacted</SelectItem>
                        <SelectItem value="QUALIFIED">Qualified</SelectItem>
                        <SelectItem value="PROPOSAL">Proposal</SelectItem>
                        <SelectItem value="DEMO">Demo</SelectItem>
                        <SelectItem value="NEGOTIATIONS">
                          Negotiations
                        </SelectItem>
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
