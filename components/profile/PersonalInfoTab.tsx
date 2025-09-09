"use client";
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon, Upload, User, Trash2, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { UpdateUserRequest } from '@/lib/data';
import { updateUserProfile } from '@/app/services/data.service';

export interface StoredUserData {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber: string | null;
}

const personalInfoSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  emailAddress: z.string().email('Please enter a valid email address'),
  phoneNumber: z.string().min(1, 'Phone number is required').nullable(),
  birthday: z.date().optional(),
});

type PersonalInfoData = z.infer<typeof personalInfoSchema>;

export function PersonalInfoTab() {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const initialFormValues = useRef<PersonalInfoData | null>(null);
  const { toast } = useToast();

  // Get initial user data from localStorage
  const getStoredUserData = (): StoredUserData | null => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  };

  const storedUser = getStoredUserData();

  const form = useForm<PersonalInfoData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: storedUser?.firstName || '',
      lastName: storedUser?.lastName || '',
      emailAddress: storedUser?.emailAddress || '',
      phoneNumber: storedUser?.phoneNumber || '',
      birthday: undefined,
    },
  });

  // Store initial form values on mount
  useEffect(() => {
    if (form.formState.defaultValues && !initialFormValues.current) {
      initialFormValues.current = { 
        firstName: form.formState.defaultValues.firstName || '',
        lastName: form.formState.defaultValues.lastName || '',
        emailAddress: form.formState.defaultValues.emailAddress || '',
        phoneNumber: form.formState.defaultValues.phoneNumber || '',
        birthday: form.formState.defaultValues.birthday,
      };
    }
  }, [form.formState.defaultValues]);

  // Watch for form changes
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (!initialFormValues.current) return;
      
      // Get current form values with proper fallbacks
      const currentValues: PersonalInfoData = {
        firstName: values.firstName || '',
        lastName: values.lastName || '',
        emailAddress: values.emailAddress || '',
        phoneNumber: values.phoneNumber || '',
        birthday: values.birthday,
      };
      
      // Check if any field has changed
      const hasFormChanges = Object.keys(currentValues).some(key => {
        if (key === 'birthday') return false; // Skip birthday field for now
        
        const formValue = currentValues[key as keyof PersonalInfoData];
        const initialValue = initialFormValues.current![key as keyof PersonalInfoData];
        
        // Handle null/undefined comparisons
        if (formValue === null || formValue === undefined) {
          return initialValue !== null && initialValue !== undefined;
        }
        
        return formValue !== initialValue;
      });
      
      // Check if image has changed
      const hasImageChanges = imagePreview !== null;
      
      setHasChanges(hasFormChanges || hasImageChanges);
    });
    
    return () => subscription.unsubscribe();
  }, [form, imagePreview]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageDelete = () => {
    setProfileImage(null);
    setImagePreview(null);
  };

  const onSubmit = async (data: PersonalInfoData) => {
    try {
      setIsSubmitting(true);
      const userId = storedUser?.id;
      
      if (!userId) {
        throw new Error('User ID not found');
      }

      const payload: UpdateUserRequest = {
        firstName: data.firstName,
        lastName: data.lastName,
        emailAddress: data.emailAddress,
        contactNumber: data.phoneNumber || undefined,
      };

      const response = await updateUserProfile(userId, payload);

      if (response.isSuccess) {
        // Update localStorage with new user data
        if (storedUser) {
          const updatedUser = {
            ...storedUser,
            firstName: data.firstName,
            lastName: data.lastName,
            emailAddress: data.emailAddress,
            phoneNumber: data.phoneNumber,
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          
          // Update initial values to new values after successful save
          initialFormValues.current = { ...data };
        }

        if (imagePreview) {
          setProfileImage(imagePreview);
          setImagePreview(null);
        }
        
        // Reset changes flag
        setHasChanges(false);
        
        toast({
          title: "Profile Updated",
          description: "Your personal information has been saved successfully.",
          variant: "default",
        });
      } else {
        throw new Error(response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update profile',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasImage = !!(imagePreview || profileImage);

  return (
    <div className="space-y-8">
      {/* Profile Picture Section */}
      <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
        <div className="relative group">
          <Avatar className="h-24 w-24 border-2 border-white shadow-md">
            <AvatarImage src={imagePreview || profileImage || undefined} alt="Profile" />
            <AvatarFallback className="bg-indigo-100 text-indigo-600">
              <User className="h-10 w-10" />
            </AvatarFallback>
          </Avatar>
          
          <label className="absolute -bottom-2 -right-2 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full cursor-pointer shadow-md">
            <Camera className="h-4 w-4" />
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
          
          {/* Delete button when image exists */}
          {hasImage && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 bg-red-100 hover:bg-red-200 text-red-600 h-8 w-8 rounded-full shadow-md"
              onClick={handleImageDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="text-center sm:text-left">
          <h3 className="font-medium text-gray-900">Profile Photo</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">
            We recommend an image of at least 400x400px. JPG, PNG or GIF formats.
          </p>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Personal Information</h3>
        
        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* First Row: First Name & Last Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">First Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Enter first name"
                        className="h-11 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">Last Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Enter last name"
                        className="h-11 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Second Row: Email & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="emailAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">Email</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="email"
                        placeholder="Enter email"
                        className="h-11 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">Phone</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        placeholder="Enter phone number"
                        className="h-11 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Button */}
<div className="flex justify-end pt-4">
  <Button
    type="submit"
    disabled={isSubmitting || !hasChanges}
    className={`
      bg-brand-primary 
      text-text-white 
      rounded-lg 
      px-6 
      py-3 
      h-11 
      text-base 
      font-medium
      ${(isSubmitting || !hasChanges) 
        ? "btn-disabled opacity-60 hover:bg-brand-primary" 
        : "hover:bg-brand-primary/90 cursor-pointer"
      }
    `}
  >
    {isSubmitting ? "Saving..." : "Save Changes"}
  </Button>
</div>


          </form>
        </Form>
      </div>
    </div>
  );
}