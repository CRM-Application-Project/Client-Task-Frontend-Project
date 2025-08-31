"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Key, CheckCircle, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { changePassword } from "../services/data.service";
import { z } from "zod";

// Password regex: at least 8 characters, uppercase, lowercase, number, and special character
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[*@#$%^&+=!])[A-Za-z\d*@#$%^&+=!]{8,16}$/;

// Define the validation schema
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(1, "New password is required")
      .regex(PASSWORD_REGEX, {
        message:
          "Password must be at least 8 characters long, contain uppercase, lowercase, number, and special character",
      }),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

// Define types for the API request/response
interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

interface ChangePasswordResponse {
  success: boolean;
  message?: string;
}

export default function ResetPasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const router = useRouter();

  const validateForm = () => {
    try {
      changePasswordSchema.parse({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path) {
            newErrors[err.path[0]] = err.message;
          }
        });
        setErrors(newErrors);

        // Show the first error in toast
        if (error.errors.length > 0) {
          toast({
            title: "Validation Error",
            description: error.errors[0].message,
            variant: "destructive",
          });
        }
      }
      return false;
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate form using Zod schema
    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    try {
      const userId = localStorage.getItem("userId");

      if (!userId) {
        toast({
          title: "Error",
          description: "User not found. Please log in again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Call the change password API
      const response = await changePassword(userId, {
        oldPassword: currentPassword,
        newPassword: newPassword,
      });

      if (response) {
        toast({
          title: "Password Reset Successful",
          description: "Your password has been updated successfully",
        });
        setIsSuccess(true);

        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        toast({
          title: "Error",
          description: response || "Failed to change password",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Password change error:", error);
      toast({
        title: "Error",
        description:
          error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Left Side - Image */}
      <div className="lg:w-1/2 relative hidden lg:block animate-slide-in-left">
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50">
          <Image
            src="/login.jpeg"
            alt="CRM Background"
            layout="fill"
            objectFit="cover"
            quality={100}
            priority
          />
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 bg-primary/10" />
      </div>

      {/* Right Side - Reset Password Form */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-12 animate-slide-in-right">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Branding */}
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                {isSuccess ? "Password Reset!" : "Change Your Password"}
              </h2>
              <p className="text-muted-foreground">
                {isSuccess
                  ? "Your password has been updated successfully. Redirecting to login..."
                  : "Please enter your current and new password below"}
              </p>
            </div>
          </div>

          {!isSuccess ? (
            <Card className="border border-border shadow-elevated animate-scale-in">
              <CardContent className="p-8">
                <form onSubmit={handleResetPassword} className="space-y-6">
                  {/* Current Password Field */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="currentPassword"
                      className="text-sm font-medium text-foreground"
                    >
                      Current Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="Enter your current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        className="h-12 pr-12 bg-background border-input focus:border-primary transition-all duration-200"
                        onCopy={(e) => e.preventDefault()}
                        onPaste={(e) => e.preventDefault()}
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {errors.currentPassword && (
                      <p className="text-sm text-destructive">
                        {errors.currentPassword}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="newPassword"
                      className="text-sm font-medium text-foreground"
                    >
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Enter your new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={8}
                        className="h-12 pr-12 bg-background border-input focus:border-primary transition-all duration-200"
                        onCopy={(e) => e.preventDefault()}
                        onPaste={(e) => e.preventDefault()}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {errors.newPassword && (
                      <p className="text-sm text-destructive">
                        {errors.newPassword}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-sm font-medium text-foreground"
                    >
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={8}
                        className="h-12 pr-12 bg-background border-input focus:border-primary transition-all duration-200"
                        onCopy={(e) => e.preventDefault()}
                        onPaste={(e) => e.preventDefault()}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-brand-primary hover:bg-brand-primary/90 text-text-white font-semibold transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 shadow-subtle"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin"></div>
                        Updating...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        Change Password
                      </div>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center p-8 animate-fade-in">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-foreground">
                Password updated successfully
              </h3>
              <p className="mt-2 text-muted-foreground">
                You'll be redirected to the login page shortly.
              </p>
              <div className="mt-6">
                <Button
                  onClick={() => router.push("/login")}
                  className="inline-flex items-center rounded-md bg-brand-primary px-3 py-2 text-sm font-semibold text-text-white shadow-sm hover:bg-brand-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
                >
                  Go back to login
                </Button>
              </div>
            </div>
          )}

          {/* Additional Links */}
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Remember your password?{" "}
              <button
                onClick={() => router.push("/login")}
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Sign in
              </button>
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap justify-center gap-2 pt-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-secondary rounded-full text-xs text-secondary-foreground">
                <Key className="h-3 w-3" />
                Secure Reset
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-secondary rounded-full text-xs text-secondary-foreground">
                <Shield className="h-3 w-3" />
                Encrypted
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
