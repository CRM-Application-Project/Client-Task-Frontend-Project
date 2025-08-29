"use client";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Eye,
  EyeOff,
  LogIn,
  Building2,
  Users,
  TrendingUp,
  Shield,
  ArrowLeft,
  Mail,
  CheckCircle,
  Lock,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  generateOtp,
  loginUser,
  resetPassword,
  verifyOtp,
  verifyUser,
} from "../services/data.service";
import { useDispatch } from "react-redux";
import { loginSuccess } from "@/hooks/userSlice";
import { z } from "zod";

// -------------------- Validation Constants --------------------
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
// Password: >=8, lowercase, uppercase, number, special char (same semantics as your register page)
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

// -------------------- Zod Schema (reset flow) --------------------
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

interface VerifyUserResponse {
  isSuccess: boolean;
  message: string;
  data: {
    tenantToken: string | null;
    accessRegion: string;
    deviceType: string;
    requiresCompany: boolean;
  };
}

interface UserModuleAccess {
  id: number;
  moduleId: number;
  moduleName: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProfileResponse {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber: string | null;
  password: string;
  userRole: string;
  isPasswordUpdated: boolean;
  userModuleAccessList: UserModuleAccess[];
}

interface LoginResponse {
  isSuccess: boolean;
  message: string;
  data: {
    profileResponse: ProfileResponse;
    authTokenResponse: {
      token: string | null;
      refreshToken: string | null;
    };
  };
}

export default function LoginPage() {
  // -------------------- Local State --------------------
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [requiresCompany, setRequiresCompany] = useState(false);
  const [showCompanyField, setShowCompanyField] = useState(false);
  const [accessRegion, setAccessRegion] = useState("public");
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpId, setOtpId] = useState<number | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // live validation state for login email/password
  const [loginTouched, setLoginTouched] = useState({
    email: false,
    password: false,
  });
  const [loginErrors, setLoginErrors] = useState({
    email: "",
    password: "",
  });

  const { toast } = useToast();
  const router = useRouter();
  const dispatch = useDispatch();

  // -------------------- Helpers: Validation --------------------
  const validateLoginField = (
    field: "email" | "password",
    value: string
  ): string => {
    if (field === "email") {
      if (!value.trim()) return "Email address is required";
      if (!EMAIL_REGEX.test(value))
        return "Enter a valid email address (e.g., a@domain.com)";
      return "";
    }
    if (field === "password") {
      if (!value) return "Password is required";
      if (!PASSWORD_REGEX.test(value))
        return "Min 8 chars with uppercase, lowercase, number & special character";
      return "";
    }
    return "";
  };

  const setFieldValue = (field: "email" | "password", value: string) => {
    if (field === "email") {
      setEmail(value);
      setIsEmailVerified(false); // re-verify when email changes
    } else {
      setPassword(value);
    }
    // mark as touched on first interaction
    if (!loginTouched[field]) {
      setLoginTouched((prev) => ({ ...prev, [field]: true }));
    }
    // live validate
    const err = validateLoginField(field, value);
    setLoginErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleBlurLogin = (field: "email" | "password") => {
    if (!loginTouched[field]) {
      setLoginTouched((prev) => ({ ...prev, [field]: true }));
    }
    const err = validateLoginField(field, field === "email" ? email : password);
    setLoginErrors((prev) => ({ ...prev, [field]: err }));
  };

  const emailValid = useMemo(
    () => validateLoginField("email", email) === "",
    [email]
  );
  const passwordValid = useMemo(
    () => validateLoginField("password", password) === "",
    [password]
  );
  const isLoginFormValid = emailValid && passwordValid && isEmailVerified;

  const borderClass = (field: "email" | "password") =>
    loginTouched[field] && loginErrors[field]
      ? "border-destructive"
      : loginTouched[field] &&
        !loginErrors[field] &&
        (field === "email" ? email : password)
        ? "border-green-500"
        : "";

  const renderValidationStatus = (field: "email" | "password") => {
    if (!loginTouched[field]) return null;
    if (loginErrors[field]) {
      return (
        <div className="flex items-center gap-1 mt-1 text-destructive text-xs">
          <AlertCircle className="h-3 w-3" />
          <span>{loginErrors[field]}</span>
        </div>
      );
    }
    if (field === "email" ? email : password) {
      return (
        <div className="flex items-center gap-1 mt-1 text-green-600 text-xs">
          <CheckCircle className="h-3 w-3" />
          <span>Valid</span>
        </div>
      );
    }
    return null;
  };

  // -------------------- Personal-domain detection --------------------
  const isPersonalEmail = (emailAddress: string): boolean => {
    if (!emailAddress) return false;
    const domain = emailAddress.split("@")[1]?.toLowerCase();
    const personalDomains = [
      "gmail.com",
      "yahoo.com",
      "outlook.com",
      "hotmail.com",
      "icloud.com",
      "protonmail.com",
      "mail.com",
      "aol.com",
      "zoho.com",
    ];
    return !!domain && personalDomains.includes(domain);
  };

  // -------------------- Copy/Paste restrictions for password fields --------------------
  const handleCopyPrevention = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    toast({
      title: "Copy not allowed",
      description:
        "Copying from password fields is not allowed for security reasons",
      variant: "destructive",
    });
  };
  const handlePastePrevention = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    toast({
      title: "Paste not allowed",
      description:
        "Pasting into password fields is not allowed for security reasons",
      variant: "destructive",
    });
  };

  // -------------------- Reset flow validation (kept as-is) --------------------
  const validateNewPassword = (pwd: string, confirm: string) => {
    try {
      changePasswordSchema.parse({
        currentPassword: "dummyCurrentPassword123!",
        newPassword: pwd,
        confirmPassword: confirm,
      });
      setPasswordErrors([]);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => err.message);
        setPasswordErrors(errors);
        return false;
      }
      return false;
    }
  };
  const handleNewPasswordChange = (value: string) => {
    setNewPassword(value);
    if (confirmPassword) validateNewPassword(value, confirmPassword);
  };
  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (newPassword) validateNewPassword(newPassword, value);
  };

  // -------------------- Verify user email (API) --------------------
  const verifyUserEmail = async (emailAddress: string, company?: string) => {
    if (!emailAddress) return;
    setIsLoading(true);
    try {
      const response = (await verifyUser(
        emailAddress,
        "web",
        company
      )) as VerifyUserResponse;

      if (response.isSuccess) {
        setIsEmailVerified(true);
        setAccessRegion(response.data.accessRegion);
        setRequiresCompany(response.data.requiresCompany);
        toast({
          title: "Email verified",
          description: "Please enter your password to continue",
          variant: "default",
        });
      } else {
        setIsEmailVerified(false);
        toast({
          title: "Verification failed",
          description: response.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setIsEmailVerified(false);
      toast({
        title: "Error",
        description:
          error.message || "An error occurred while verifying your email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced auto-verify: only when email passes regex
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (EMAIL_REGEX.test(email)) {
        const isPersonal = isPersonalEmail(email);
        setRequiresCompany(isPersonal);
        setShowCompanyField(isPersonal);

        // For personal emails, require company name before verifying
        if (isPersonal && !companyName.trim()) return;

        verifyUserEmail(email, isPersonal ? companyName : undefined);
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [email, companyName]);

  // Auto-verify when company name filled for personal emails
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (
        requiresCompany &&
        EMAIL_REGEX.test(email) &&
        companyName.trim() &&
        !isEmailVerified
      ) {
        verifyUserEmail(email, companyName);
      }
    }, 800);
    return () => clearTimeout(timeoutId);
  }, [companyName, requiresCompany, email, isEmailVerified]);

  // -------------------- Forgot Password Flow --------------------
  const handleForgotPassword = async () => {
    if (!EMAIL_REGEX.test(email)) {
      setLoginTouched((p) => ({ ...p, email: true }));
      setLoginErrors((p) => ({
        ...p,
        email: validateLoginField("email", email),
      }));
      toast({
        title: "Email required",
        description: "Please enter a valid email address first",
        variant: "destructive",
      });
      return;
    }
    if (requiresCompany && !companyName.trim()) {
      toast({
        title: "Company required",
        description: "Please enter your company name first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (!isEmailVerified) {
        await verifyUserEmail(email, requiresCompany ? companyName : undefined);
        if (!isEmailVerified) return;
      }

      const otpPayload: any = {
        emailAddress: email,
        deviceType: "web",
      };
      if (requiresCompany) otpPayload.companyName = companyName;

      const otpResponse = await generateOtp(otpPayload);

      if (otpResponse.isSuccess) {
        setOtpId(otpResponse.data.id);
        setOtpSent(true);
        toast({
          title: "OTP Sent",
          description: "Check your email for the verification code",
          variant: "default",
        });
        setForgotPasswordMode(true);
      } else {
        toast({
          title: "Failed to send OTP",
          description: otpResponse.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.message || "An error occurred while processing your request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpId || !otp) {
      toast({
        title: "OTP required",
        description: "Please enter the OTP sent to your email",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const verifyResponse = await verifyOtp({
        id: otpId,
        otp,
        deviceType: "web",
      });

      if (verifyResponse.isSuccess) {
        setOtpVerified(true);
        toast({
          title: "OTP Verified",
          description: "You can now reset your password",
          variant: "default",
        });
      } else {
        toast({
          title: "Invalid OTP",
          description: verifyResponse.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred while verifying OTP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otpId || !newPassword || !confirmPassword) {
      toast({
        title: "All fields required",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (!validateNewPassword(newPassword, confirmPassword)) return;
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords match",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const resetResponse = await resetPassword({
        otpId,
        userEmail: email,
        password: newPassword,
        deviceType: "web",
      });

      if (resetResponse.isSuccess) {
        toast({
          title: "Password Reset",
          description: "Your password has been reset successfully",
          variant: "default",
        });
        setForgotPasswordMode(false);
        setOtpSent(false);
        setOtpVerified(false);
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordErrors([]);
      } else {
        toast({
          title: "Reset Failed",
          description: resetResponse.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.message || "An error occurred while resetting your password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------- Post-login routing helpers --------------------
  const getFirstAccessibleModule = (modules: UserModuleAccess[]): string => {
    if (!modules || modules.length === 0) return "/not-found";
    const modulePriority = ["lead", "task", "employees", "department", "user"];
    for (const moduleName of modulePriority) {
      const module = modules.find(
        (m) =>
          m.moduleName.toLowerCase() === moduleName.toLowerCase() && m.canView
      );
      if (module) {
        const routeMap: { [key: string]: string } = {
          lead: "/leads",
          leads: "/leads",
          task: "/tasks",
          tasks: "/tasks",
          employees: "/employees",
          employee: "/employees",
          department: "/employees/department",
          user: "/employees/staff",
          users: "/employees/staff",
        };
        return routeMap[moduleName.toLowerCase()] || "/not-found";
      }
    }
    const firstAccessible = modules.find((m) => m.canView);
    if (firstAccessible) {
      const routeMap: { [key: string]: string } = {
        lead: "/leads",
        leads: "/leads",
        task: "/tasks",
        tasks: "/tasks",
        employees: "/employees",
        employee: "/employees",
        department: "/employees/department",
        user: "/employees/staff",
        users: "/employees/staff",
      };
      return routeMap[firstAccessible.moduleName.toLowerCase()] || "/not-found";
    }
    return "/not-found";
  };

  // -------------------- Login Submit --------------------
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();

  // Force touch + validate both fields
  setLoginTouched({ email: true, password: true });
  const emailErr = validateLoginField("email", email);
  const pwdErr = validateLoginField("password", password);
  setLoginErrors({ email: emailErr, password: pwdErr });

  if (emailErr || pwdErr || !isEmailVerified) return;

  setIsLoading(true);
  try {
    const loginData = {
      emailAddress: email,
      password,
      deviceType: "web",
      accessRegion,
      ...(requiresCompany && { companyName }),
    };

    const response = (await loginUser(loginData)) as unknown as LoginResponse;

    if (response.isSuccess) {
      const { profileResponse, authTokenResponse } = response.data;

      if (authTokenResponse.token) {
        localStorage.setItem("authToken", authTokenResponse.token);
      }
      if (authTokenResponse.refreshToken) {
        localStorage.setItem("refreshToken", authTokenResponse.refreshToken);
      }

      const modules =
        profileResponse.userModuleAccessList?.map((access) => ({
          id: access.moduleId || parseInt(access.id?.toString() || "0"),
          moduleId: access.moduleId || parseInt(access.id?.toString() || "0"),
          moduleName: access.moduleName
            ? access.moduleName.charAt(0).toUpperCase() +
              access.moduleName.slice(1)
            : "Unknown",
          canView: access.canView ?? true,
          canEdit: access.canEdit ?? false,
          canCreate: access.canCreate ?? false,
          canDelete: access.canDelete ?? false,
          createdAt: access.createdAt || new Date().toISOString(),
          updatedAt: access.updatedAt || new Date().toISOString(),
        })) || [];

      const completeUserProfile = {
        ...profileResponse,
        modules,
        userId: profileResponse.id,
        contactNumber: profileResponse.phoneNumber || "",
        dateOfBirth: "",
        dateOfJoin: "",
        profileImage: "",
        address: "",
        status: "active",
        departmentId: 0,
        departmentName: "",
        isActive: true,
      };

      localStorage.setItem(
        "currentUser",
        JSON.stringify(completeUserProfile)
      );
      localStorage.setItem("userModules", JSON.stringify(modules));
      localStorage.setItem("userId", response.data.profileResponse.id);
      localStorage.setItem(
        "user",
        JSON.stringify(response.data.profileResponse)
      );

      dispatch(
        loginSuccess({
          user: completeUserProfile,
          allUsers: [completeUserProfile],
        })
      );

      toast({
        title: "Login successful",
        description: `Welcome back, ${profileResponse.firstName}!`,
        variant: "default",
      });

      let redirectPath = "/not-found";
      
      // Check if user is SUPER_ADMIN
      if (profileResponse.userRole === "SUPER_ADMIN") {
        redirectPath = "/dashboard";
      } else if (!profileResponse.isPasswordUpdated) {
        redirectPath = "/reset-password";
      } else {
        redirectPath = getFirstAccessibleModule(modules);
      }

      setTimeout(() => {
        router.push(redirectPath);
      }, 500);
    } else {
      toast({
        title: "Login failed",
        description: response.message,
        variant: "destructive",
      });
    }
  } catch (error) {
    console.error("Login error:", error);
    toast({
      title: "Error",
      description:
        error instanceof Error
          ? error.message
          : "An error occurred during login",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};

  // -------------------- UI --------------------
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

      {/* Right Side - Login Form */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-12 animate-slide-in-right">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Branding */}
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                {forgotPasswordMode ? "Reset Password" : "Welcome Back"}
              </h2>
              <p className="text-muted-foreground">
                {forgotPasswordMode
                  ? "Follow the steps to reset your password"
                  : "Please sign in to your account to continue"}
              </p>
            </div>
          </div>

          {/* Back button for forgot password flow */}
          {forgotPasswordMode && (
            <Button
              variant="ghost"
              onClick={() => {
                setForgotPasswordMode(false);
                setOtpSent(false);
                setOtpVerified(false);
                setOtp("");
                setNewPassword("");
                setConfirmPassword("");
                setPasswordErrors([]);
              }}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Button>
          )}

          {/* Login Form */}
          <Card className="border border-border shadow-elevated animate-scale-in">
            <CardContent className="p-8">
              {!forgotPasswordMode ? (
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-foreground"
                    >
                      Email Address
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setFieldValue("email", e.target.value)}
                      onBlur={() => handleBlurLogin("email")}
                      required
                      className={`h-12 bg-background border-input focus:border-primary transition-all duration-200 rounded-lg ${borderClass(
                        "email"
                      )}`}
                      autoComplete="email"
                    />
                    {renderValidationStatus("email")}
                  </div>

                  {/* Company Name Field - Show dynamically for personal emails */}
                  {showCompanyField && (
                    <div className="space-y-2 animate-slide-down">
                      <Label
                        htmlFor="company"
                        className="text-sm font-medium text-foreground"
                      >
                        Company Name
                        <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="company"
                          type="text"
                          placeholder="Enter your company name"
                          value={companyName}
                          onChange={(e) => {
                            setCompanyName(e.target.value);
                            setIsEmailVerified(false);
                          }}
                          required
                          className="h-12 pl-12 bg-background border-input focus:border-primary transition-all duration-200 rounded-lg"
                        />
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Required for personal email addresses
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium text-foreground"
                    >
                      Password
                      <span className="text-red-500 ml-1">*</span>

                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) =>
                          setFieldValue("password", e.target.value)
                        }
                        onBlur={() => handleBlurLogin("password")}
                        required
                        disabled={!isEmailVerified}
                        className={`h-12 pr-12 bg-background border-input focus:border-primary transition-all duration-200 rounded-lg ${borderClass(
                          "password"
                        )} ${!isEmailVerified
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                          }`}
                        onCopy={handleCopyPrevention}
                        onPaste={handlePastePrevention}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={!isEmailVerified}
                        className={`absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors ${!isEmailVerified ? "cursor-not-allowed" : ""
                          }`}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {renderValidationStatus("password")}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-input text-primary focus:ring-primary focus:ring-offset-0"
                      />
                      <span className="text-muted-foreground">Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !isLoginFormValid}
                    className={`w-full h-12 bg-brand-primary hover:bg-brand-primary/90 text-text-white font-semibold transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 shadow-subtle ${isLoading || !isLoginFormValid ? "btn-disabled" : ""
                      }`}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin"></div>
                        Signing in...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <LogIn className="h-4 w-4" />
                        Sign In
                      </div>
                    )}
                  </Button>
                </form>
              ) : (
                // Forgot Password Flow
                <div className="space-y-6">
                  {/* Step 1: Email verification (already done) */}
                  {!otpSent && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Email verified: {email}</span>
                      </div>
                      <Button
                        onClick={handleForgotPassword}
                        disabled={isLoading}
                        className="w-full h-12 bg-brand-primary hover:bg-brand-primary/90 text-text-white"
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin"></div>
                            Sending OTP...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Send Verification Code
                          </div>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Step 2: OTP Verification */}
                  {otpSent && !otpVerified && (
                    <div className="space-y-4 animate-slide-down">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Verification code sent to {email}</span>
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="otp"
                          className="text-sm font-medium text-foreground"
                        >
                          Verification Code
                        </Label>
                        <Input
                          id="otp"
                          type="text"
                          placeholder="Enter the code sent to your email"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          className="h-12 bg-background border-input focus:border-primary"
                        />
                      </div>
                      <Button
                        onClick={handleVerifyOtp}
                        disabled={isLoading || !otp}
                        className={`w-full h-12 bg-brand-primary hover:bg-brand-primary/90 text-text-white ${isLoading || !otp ? "btn-disabled" : ""
                          }`}
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin"></div>
                            Verifying...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Verify Code
                          </div>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Step 3: Password Reset */}
                  {otpVerified && (
                    <div className="space-y-4 animate-slide-down">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Code verified successfully</span>
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
                            onChange={(e) =>
                              handleNewPasswordChange(e.target.value)
                            }
                            className="h-12 pr-12 bg-background border-input focus:border-primary"
                            onCopy={handleCopyPrevention}
                            onPaste={handlePastePrevention}
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
                            onChange={(e) =>
                              handleConfirmPasswordChange(e.target.value)
                            }
                            className="h-12 pr-12 bg-background border-input focus:border-primary"
                            onCopy={handleCopyPrevention}
                            onPaste={handlePastePrevention}
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
                      </div>

                      {passwordErrors.length > 0 && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                          <p className="text-destructive text-sm font-medium mb-1">
                            Password requirements:
                          </p>
                          <ul className="text-destructive text-xs list-disc pl-4 space-y-1">
                            {passwordErrors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <Button
                        onClick={handleResetPassword}
                        disabled={
                          isLoading ||
                          !newPassword ||
                          !confirmPassword ||
                          passwordErrors.length > 0
                        }
                        className={`w-full h-12 bg-brand-primary hover:bg-brand-primary/90 text-text-white ${isLoading ||
                            !newPassword ||
                            !confirmPassword ||
                            passwordErrors.length > 0
                            ? "btn-disabled"
                            : ""
                          }`}
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin"></div>
                            Resetting...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            Reset Password
                          </div>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Links */}
          {!forgotPasswordMode && (
            <div className="text-center space-y-4">
              {/* <p className="text-sm text-muted-foreground">
                {`Don't have an account?  `}
                <button
                  onClick={() => router.push("/register")}
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Register
                </button>
              </p> */}

              {/* Feature Pills */}
              <div className="flex flex-wrap justify-center gap-2 pt-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-secondary rounded-full text-xs text-secondary-foreground">
                  <Shield className="h-3 w-3" />
                  Secure
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-secondary rounded-full text-xs text-secondary-foreground">
                  <Users className="h-3 w-3" />
                  Team Collaboration
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-secondary rounded-full text-xs text-secondary-foreground">
                  <TrendingUp className="h-3 w-3" />
                  Analytics
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
