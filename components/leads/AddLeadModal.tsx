"use client";
import React, { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createLead } from "@/app/services/data.service";
import { useCountryCodes } from "@/hooks/useCountryCodes";
import { LeadStage } from "@/lib/data";

// Enhanced validation schema with better phone validation
const formSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerEmailAddress: z.string().email("Invalid email address"),
  customerMobileNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(10, "Phone number cannot exceed 10 digits")
    .regex(/^\d+$/, "Phone number must contain only digits"),
  companyEmailAddress: z
    .string()
    .email("Invalid company email address")
    .optional()
    .or(z.literal("")),
  leadStatus: z.string().min(1, "Lead status is required"),
  leadSource: z.string().min(1, "Lead source is required"),
  leadAddedBy: z.string().min(1, "Lead added by is required"),
  leadLabel: z.string().optional().or(z.literal("")),
  leadReference: z.string().optional().or(z.literal("")),
  leadAddress: z.string().optional().or(z.literal("")),
  comment: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLead: (lead: any) => void;
  onNewLeadCreated: (apiLeadData: any) => void;
  leadStages: LeadStage[];
  // New prop to indicate if opened from a specific stage
  restrictToFirstStage?: boolean;
  // Optional prop to set a specific stage
  presetStageId?: string;
}

interface UserData {
  firstName: string;
  lastName: string;
  userRole: string;
}

const AddLeadModal: React.FC<AddLeadModalProps> = ({
  isOpen,
  onClose,
  onAddLead,
  onNewLeadCreated,
  leadStages,
  restrictToFirstStage = false,
  presetStageId,
}) => {
  const { toast } = useToast();
  const { codes, loading } = useCountryCodes();
  const [selectedCode, setSelectedCode] = useState("+91");
  const [user, setUser] = useState<UserData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Find the "New" stage or use the first available stage
 const findDefaultStage = () => {
  if (!leadStages || leadStages.length === 0) return null;

  // Sort by priority and return the first stage
  const sortedStages = [...leadStages].sort(
    (a, b) => a.leadStagePriority - b.leadStagePriority
  );

  return sortedStages[0];
};


  const defaultStage = findDefaultStage();
  const defaultStageName = defaultStage ? defaultStage.leadStageName : "";

  // Get available stages based on restrictions
  const getAvailableStages = () => {
    if (restrictToFirstStage || presetStageId) {
      // For restricted mode, only return the default stage
      return defaultStage ? [defaultStage] : [];
    }
    
    // Normal behavior - filter out CLOSED WON and CLOSED LOST statuses
    return leadStages.filter(
      (stage) =>
        !["CLOSED WON", "CLOSED LOST"].includes(stage.leadStageName.toUpperCase())
    );
  };

  const availableStages = getAvailableStages();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      customerName: "",
      customerEmailAddress: "",
      customerMobileNumber: "",
      companyEmailAddress: "",
      leadStatus: defaultStageName,
      leadSource: "",
      leadAddedBy: "",
      leadLabel: "",
      leadReference: "",
      leadAddress: "",
      comment: "",
    },
  });

  // Watch all form fields to detect changes
  const formValues = form.watch();

  // Check if form has changes compared to initial values
  useEffect(() => {
    const initialValues = {
      customerName: "",
      customerEmailAddress: "",
      customerMobileNumber: "",
      companyEmailAddress: "",
      leadStatus: defaultStageName,
      leadSource: "",
      leadAddedBy: "",
      leadLabel: "",
      leadReference: "",
      leadAddress: "",
      comment: "",
    };

    const hasFormChanged = Object.keys(initialValues).some(
      (key) =>
        formValues[key as keyof FormData] !==
        initialValues[key as keyof typeof initialValues]
    );

    setHasChanges(hasFormChanged);
  }, [formValues, defaultStageName]);

  // Load user data on component mount
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData) as UserData;
        setUser(parsedUser);
      } catch (error) {
        console.error("Failed to parse user data:", error);
      }
    }
  }, []);

  // Set leadAddedBy when modal opens and user data is available
  useEffect(() => {
    if (isOpen && user) {
      const fullName = `${user.firstName} ${user.lastName}`;
      form.setValue("leadAddedBy", fullName);
    }
  }, [isOpen, user, form]);

  // Set the default stage when modal opens
  useEffect(() => {
    if (isOpen && defaultStageName) {
      form.setValue("leadStatus", defaultStageName);
    }
  }, [isOpen, defaultStageName, form]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      const leadData: CreateLeadRequest = {
        leadStatus: data.leadStatus as LeadStatus,
        leadSource: data.leadSource as LeadSource,
        leadAddedBy: data.leadAddedBy,
        customerMobileNumber: `${selectedCode.replace(
          "+",
          ""
        )}${data.customerMobileNumber.trim()}`,
        companyEmailAddress: data.companyEmailAddress ?? "",
        customerName: data.customerName,
        customerEmailAddress: data.customerEmailAddress,
        leadLabel: data.leadLabel ?? "",
        leadReference: data.leadReference ?? "",
        leadAddress: data.leadAddress ?? "",
        comment: data.comment || "",
      };

      console.log("Creating lead with data:", leadData);
      const response = await createLead(leadData);
      console.log("API response:", response);

      if (response.isSuccess) {
        toast({
          title: "Success",
          description: "Lead created successfully",
          variant: "default",
        });
        onAddLead(data);
        // Reset form and close modal first
        form.reset({
          ...form.formState.defaultValues,
          leadStatus: defaultStageName,
        });
        onClose();

        // Call the callback with the API response data
        if (response.data) {
          console.log("Calling onNewLeadCreated with:", response.data);
          onNewLeadCreated(response.data);
        } else {
          console.error("No data in API response:", response);
        }
      } else {
        console.error("API returned error:", response);
        toast({
          title: "Error",
          description: response.message || "Failed to create lead",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error creating lead:", error);
      toast({
        title: "Error",
        description:
          error.message || "An error occurred while creating the lead",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset({
      ...form.formState.defaultValues,
      leadStatus: defaultStageName,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new lead to your CRM.
            {restrictToFirstStage && " This lead will be added to the initial stage."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>
                      Customer Name <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter customer name"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value.replace(
                            /[^a-zA-Z\s]/g,
                            ""
                          );
                          field.onChange(value);
                          form.trigger("customerName");
                        }}
                      />
                    </FormControl>
                    {fieldState.error && <FormMessage />}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerEmailAddress"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>
                      Customer Email <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter customer email address"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          form.trigger("customerEmailAddress");
                        }}
                      />
                    </FormControl>
                    {fieldState.error && <FormMessage />}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerMobileNumber"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>
                      Mobile Number <span className="text-red-500">*</span>
                    </FormLabel>
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
                        <Input
                          placeholder="Enter mobile number"
                          {...field}
                          maxLength={10}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            field.onChange(value);
                            form.trigger("customerMobileNumber");
                          }}
                        />
                      </FormControl>
                    </div>
                    {fieldState.error && <FormMessage />}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyEmailAddress"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Company Email (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter company email address"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          if (e.target.value)
                            form.trigger("companyEmailAddress");
                        }}
                      />
                    </FormControl>
                    {fieldState.error && <FormMessage />}
                  </FormItem>
                )}
              />

              {/* Lead Status field - always disabled with default value */}
              <FormField
                control={form.control}
                name="leadStatus"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>
                      Lead Status <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        value={field.value}
                        disabled
                        className="bg-gray-100 cursor-not-allowed"
                      />
                    </FormControl>
                    {fieldState.error && <FormMessage />}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="leadSource"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>
                      Lead Source <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.trigger("leadSource");
                      }}
                      defaultValue={field.value}
                    >
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
                    {fieldState.error && <FormMessage />}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="leadAddedBy"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>
                      Added By <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Lead added by"
                        {...field}
                        disabled
                        className="bg-gray-100"
                      />
                    </FormControl>
                    {fieldState.error && <FormMessage />}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="leadLabel"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Lead Label (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter lead label"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          form.trigger("leadLabel");
                        }}
                      />
                    </FormControl>
                    {fieldState.error && <FormMessage />}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="leadReference"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Lead Reference (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter reference number"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          form.trigger("leadReference");
                        }}
                      />
                    </FormControl>
                    {fieldState.error && <FormMessage />}
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="leadAddress"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Address (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter address"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        form.trigger("leadAddress");
                      }}
                    />
                  </FormControl>
                  {fieldState.error && <FormMessage />}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comment"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Comment (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any additional comments..."
                      className="min-h-[100px]"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        form.trigger("comment");
                      }}
                    />
                  </FormControl>
                  {fieldState.error && <FormMessage />}
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting || !hasChanges || !form.formState.isValid
                }
                className={`${
                  isSubmitting || !hasChanges || !form.formState.isValid
                    ? "btn-disabled"
                    : ""
                }`}
              >
                {isSubmitting ? "Creating..." : "Add Lead"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddLeadModal;