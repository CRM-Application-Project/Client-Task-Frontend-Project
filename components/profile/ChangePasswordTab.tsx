"use client";
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { changePassword } from '@/app/services/data.service';

// Password pattern regex
const PASSWORD_REGEX = /^(?=.*[0-9])(?=.*[A-Z])(?=.*[a-z])(?=.*[@#$%^&+=!]).{8,}$/;

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(1, 'New password is required')
    .regex(PASSWORD_REGEX, {
      message: 'Password must be at least 8 characters long, contain uppercase, lowercase, number, and special character'
    }),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
})
.refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})
.refine((data) => data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"],
});

type ChangePasswordData = z.infer<typeof changePasswordSchema>;

export function ChangePasswordTab() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<ChangePasswordData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  });

  const newPassword = form.watch('newPassword');
  const currentPassword = form.watch('currentPassword');

  // Function to prevent paste operation
  const handlePastePrevention = (e: React.ClipboardEvent) => {
    e.preventDefault();
    toast({
      title: "Action not allowed",
      description: "Pasting is disabled for password fields",
      variant: "destructive",
    });
  };

  // Function to prevent copy/cut operations
  const handleCopyCutPrevention = (e: React.ClipboardEvent) => {
    e.preventDefault();
    toast({
      title: "Action not allowed",
      description: "Copying is disabled for password fields",
      variant: "destructive",
    });
  };

  const onSubmit = async (data: ChangePasswordData) => {
    try {
      setIsSubmitting(true);
      const userId = localStorage.getItem('userId');
      
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      const response = await changePassword(userId, {
        oldPassword: data.currentPassword,
        newPassword: data.newPassword
      });

      if (response.isSuccess) {
        toast({
          title: "Password Updated",
          description: "Your password has been changed successfully.",
          variant: "default",
        });
        form.reset();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to change password",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred while changing password",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-4xl mx-auto">
      {/* Left Side - Form */}
      <Card className="p-6 flex-1">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">Change Password</h2>
            
            {/* Current Password */}
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">Current Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        {...field} 
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="Enter current password"
                        className="h-10 border-gray-200 focus:border-[#3D2C8D] focus:ring-1 focus:ring-[#3D2C8D] rounded-md pr-10"
                        onPaste={handlePastePrevention}
                        onCopy={handleCopyCutPrevention}
                        onCut={handleCopyCutPrevention}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* New Password */}
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        {...field} 
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        className="h-10 border-gray-200 focus:border-[#3D2C8D] focus:ring-1 focus:ring-[#3D2C8D] rounded-md pr-10"
                        onChange={(e) => {
                          field.onChange(e);
                          if (form.getValues('confirmPassword')) {
                            form.trigger('confirmPassword');
                          }
                        }}
                        onPaste={handlePastePrevention}
                        onCopy={handleCopyCutPrevention}
                        onCut={handleCopyCutPrevention}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirm Password */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        {...field} 
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        className="h-10 border-gray-200 focus:border-[#3D2C8D] focus:ring-1 focus:ring-[#3D2C8D] rounded-md pr-10"
                        onChange={(e) => {
                          field.onChange(e);
                          if (form.getValues('newPassword')) {
                            form.trigger('confirmPassword');
                          }
                        }}
                        onPaste={handlePastePrevention}
                        onCopy={handleCopyCutPrevention}
                        onCut={handleCopyCutPrevention}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password Requirements Card - Now placed below the form fields */}
            <Card className="p-4 bg-muted/50 md:hidden">
              <h3 className="text-sm font-medium mb-2">Password Requirements:</h3>
              <ul className="text-xs space-y-1">
                <li className={`flex items-center ${newPassword?.length >= 8 ? 'text-green-500' : 'text-gray-500'}`}>
                  <span>• At least 8 characters long</span>
                </li>
                <li className={`flex items-center ${/[A-Z]/.test(newPassword) ? 'text-green-500' : 'text-gray-500'}`}>
                  <span>• At least one uppercase letter (A-Z)</span>
                </li>
                <li className={`flex items-center ${/[a-z]/.test(newPassword) ? 'text-green-500' : 'text-gray-500'}`}>
                  <span>• At least one lowercase letter (a-z)</span>
                </li>
                <li className={`flex items-center ${/[0-9]/.test(newPassword) ? 'text-green-500' : 'text-gray-500'}`}>
                  <span>• At least one number (0-9)</span>
                </li>
                <li className={`flex items-center ${/[@#$%^&+=!]/.test(newPassword) ? 'text-green-500' : 'text-gray-500'}`}>
                  <span>• At least one special character (@#$%^&+=!)</span>
                </li>
                <li className={`flex items-center ${currentPassword && newPassword && currentPassword !== newPassword ? 'text-green-500' : 'text-gray-500'}`}>
                  <span>• Different from current password</span>
                </li>
              </ul>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <Button 
                type="submit" 
                className="bg-[#3b3b3b] hover:bg-[#3b3b3b]/90 text-white rounded-md px-8 py-2 h-10"
                disabled={!form.formState.isValid || isSubmitting}
              >
                {isSubmitting ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </form>
        </Form>
      </Card>

      {/* Right Side - Requirements (hidden on mobile, shown on md and above) */}
      <Card className="p-6 flex-1 max-w-md hidden md:block">
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">Password Requirements</h2>
          
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Your password must contain:</h3>
            <ul className="text-sm space-y-3">
              <li className={`flex items-start ${newPassword?.length >= 8 ? 'text-green-500' : 'text-gray-500'}`}>
                <span className="mr-2">•</span>
                <span>At least 8 characters long</span>
              </li>
              <li className={`flex items-start ${/[A-Z]/.test(newPassword) ? 'text-green-500' : 'text-gray-500'}`}>
                <span className="mr-2">•</span>
                <span>At least one uppercase letter (A-Z)</span>
              </li>
              <li className={`flex items-start ${/[a-z]/.test(newPassword) ? 'text-green-500' : 'text-gray-500'}`}>
                <span className="mr-2">•</span>
                <span>At least one lowercase letter (a-z)</span>
              </li>
              <li className={`flex items-start ${/[0-9]/.test(newPassword) ? 'text-green-500' : 'text-gray-500'}`}>
                <span className="mr-2">•</span>
                <span>At least one number (0-9)</span>
              </li>
              <li className={`flex items-start ${/[@#$%^&+=!]/.test(newPassword) ? 'text-green-500' : 'text-gray-500'}`}>
                <span className="mr-2">•</span>
                <span>At least one special character (@#$%^&+=!)</span>
              </li>
              <li className={`flex items-start ${currentPassword && newPassword && currentPassword !== newPassword ? 'text-green-500' : 'text-gray-500'}`}>
                <span className="mr-2">•</span>
                <span>Different from current password</span>
              </li>
            </ul>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-medium">Tips for a strong password:</h3>
            <ul className="text-sm space-y-3 text-gray-600">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Use a mix of letters, numbers, and symbols</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Avoid common words or phrases</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Don't use personal information</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Consider using a passphrase</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Type your password manually (copy/paste disabled)</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}