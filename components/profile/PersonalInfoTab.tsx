"use client";
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Upload, User, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { UpdateUserRequest } from '@/lib/data';
import { updateUserProfile } from '@/app/services/data.service';


interface StoredUserData {
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
        }

        if (imagePreview) {
          setProfileImage(imagePreview);
          setImagePreview(null);
        }
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
      <div className="flex items-center gap-6">
        <div className="relative group">
          <Avatar className="h-20 w-20 border-2 border-gray-200 bg-gray-50">
            <AvatarImage src={imagePreview || profileImage || undefined} alt="Profile" />
            <AvatarFallback className="bg-gray-100 text-gray-400">
              <User className="h-10 w-10" />
            </AvatarFallback>
          </Avatar>
          
          {/* Delete overlay on hover when image exists */}
          {hasImage && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                 onClick={handleImageDelete}>
              <Trash2 className="h-6 w-6 text-white" />
            </div>
          )}
        </div>
        
        {/* Upload button - only show when no image */}
        {!hasImage && (
          <label className="cursor-pointer">
            <Button
              type="button"
              size="sm"
              className="bg-[#3b3b3b] hover:bg-[#3b3b3b]/90 text-white rounded-md px-4 py-2"
              asChild
            >
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </span>
            </Button>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        )}
      </div>

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
                      className="h-10 border-gray-200 focus:border-[#3D2C8D] focus:ring-1 focus:ring-[#3D2C8D] rounded-md"
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
                      className="h-10 border-gray-200 focus:border-[#3D2C8D] focus:ring-1 focus:ring-[#3D2C8D] rounded-md"
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
                      className="h-10 border-gray-200  rounded-md"
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
                      className="h-10 border-gray-200  rounded-md"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Third Row: Birthday - Optional */}
          {/* <FormField
            control={form.control}
            name="birthday"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-gray-700 font-medium">Birthday Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-10 w-full justify-start text-left font-normal border-gray-200 hover:border-[#3D2C8D] rounded-md",
                          !field.value && "text-gray-400"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "dd-MM-yyyy")
                        ) : (
                          <span>dd-MM-yyyy</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          /> */}

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <Button 
              type="submit" 
              className="bg-[#3b3b3b] hover:bg-[#3b3b3b]/90 text-white rounded-md px-8 py-2 h-10"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}