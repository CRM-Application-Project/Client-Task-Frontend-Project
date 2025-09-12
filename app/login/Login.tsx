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
import { generateFCMToken, getNotificationPermission, initTokenRefreshHandler, preRegisterServiceWorker } from "../firebase";


// -------------------- Validation Constants --------------------
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
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

// -------------------- Theme Interfaces --------------------
interface BrandSettings {
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
  backgroundColor?: string;
  headerBgColor?: string;
  headerTextColor?: string;
}

interface WhiteLabelData {
  brandSettings?: BrandSettings;
}

interface ThemeData {
  logoUrl?: string;
  whiteLabelData?: WhiteLabelData;
}

declare global {
  interface Window {
    fcmCleanup?: () => void;
  }
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
  const [requiresCompany, setRequiresCompany] = useState(false);
  const [showCompanyField, setShowCompanyField] = useState(false);
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

  // -------------------- Theme State --------------------
  const [themeData, setThemeData] = useState<ThemeData | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>("/default-logo.png");

  // live validation state for login email/password
  const [loginTouched, setLoginTouched] = useState({
    email: false,
    password: false,
  });
  const [loginErrors, setLoginErrors] = useState({
    email: "",
    password: "",
  });

  const { toast, dismiss } = useToast();
  const router = useRouter();
  const dispatch = useDispatch();

  // -------------------- Theme Helper Functions --------------------
  const getSubdomain = (host: string): string => {
    const hostWithoutPort = host.split(":")[0];

    if (
      hostWithoutPort.includes("localhost") ||
      hostWithoutPort.match(/^\d+\.\d+\.\d+\.\d+$/)
    ) {
      const parts = hostWithoutPort.split(".");
      if (parts.length > 1 && parts[0] !== "www" && parts[0] !== "localhost") {
        return parts[0];
      }
      return "seabed2crest";
    }

    const parts = hostWithoutPort.split(".");
    if (parts.length > 2) {
      return parts[0];
    }

    return "seabed2crest";
  };

  const adjustBrightness = (hex: string, percent: number): string => {
    let color = hex.replace("#", "");

    let r = parseInt(color.substring(0, 2), 16);
    let g = parseInt(color.substring(2, 4), 16);
    let b = parseInt(color.substring(4, 6), 16);

    r = Math.max(0, Math.min(255, Math.round(r + r * percent)));
    g = Math.max(0, Math.min(255, Math.round(g + g * percent)));
    b = Math.max(0, Math.min(255, Math.round(b + b * percent)));

    return `#${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  };

  const applyThemeToDOM = (themeData: WhiteLabelData | null) => {
    if (!themeData?.brandSettings) return;

    const {
      primaryColor,
      secondaryColor,
      textColor,
      backgroundColor,
      headerBgColor,
      headerTextColor,
    } = themeData.brandSettings;

    const primary = primaryColor || "#3b3b3b";
    const secondary = secondaryColor || "#636363";
    const surface = backgroundColor || "#ffffff";
    const text = textColor || "#3b3b3b";
    const headerBg = headerBgColor || primary;
    const headerText = headerTextColor || surface;

    let styleElement = document.getElementById("dynamic-theme-styles");
    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = "dynamic-theme-styles";
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = `
      :root {
        --color-primary: ${primary};
        --color-secondary: ${secondary};
        --color-accent: ${adjustBrightness(secondary, 0.3)};
        --color-surface: ${surface};
        
        --brand-primary: ${primary};
        --brand-secondary: ${secondary};
        
        --text-primary: ${text};
        --text-secondary: ${adjustBrightness(text, 0.7)};
        --text-white: ${headerText};
        
        --button-primary-background: ${primary};
        --button-primary-hover: ${adjustBrightness(primary, -0.2)};
        
        --background-primary: ${surface};
        
        --sidebar-background: ${primary};
        --sidebar-foreground: ${headerText};
        
        --background: ${surface};
        --foreground: ${text};
        --card: ${surface};
        --card-foreground: ${text};
        --primary: ${primary};
        --primary-foreground: ${headerText};
        --input: ${adjustBrightness(primary, 0.85)};
        --border: ${adjustBrightness(primary, 0.7)};
        --muted: ${adjustBrightness(surface, -0.05)};
        --muted-foreground: ${adjustBrightness(text, 0.4)};
      }
    `;
  };

  // Pre-register service worker on component mount
  useEffect(() => {
    const preRegisterSW = async () => {
      try {
        await preRegisterServiceWorker();
        console.log('✅ Service worker pre-registered');
      } catch (error) {
        console.log('⚠️ Service worker pre-registration not critical:', error);
      }
    };
    
    preRegisterSW();
  }, []);

  // -------------------- Prevent Layout Shifts on Desktop --------------------
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .login-container {
        position: relative;
        width: 100vw;
        height: 100vh;
        overflow: hidden;
      }
      
      .login-image-container {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 50% !important;
        height: 100% !important;
        transform: none !important;
        -webkit-transform: none !important;
        will-change: auto !important;
        backface-visibility: hidden !important;
        -webkit-backface-visibility: hidden !important;
      }
      
      .login-form-container {
        position: absolute !important;
        top: 0 !important;
        right: 0 !important;
        width: 50% !important;
        height: 100% !important;
        overflow-y: auto !important;
        transform: none !important;
        -webkit-transform: none !important;
      }
      
      .login-image-container img {
        transform: none !important;
        -webkit-transform: none !important;
        will-change: auto !important;
      }
      
      input:focus, textarea:focus, select:focus {
        transition: none !important;
        -webkit-transition: none !important;
        animation: none !important;
        -webkit-animation: none !important;
      }
      
      .login-container * {
        backface-visibility: hidden !important;
        -webkit-backface-visibility: hidden !important;
      }
      
      @media (max-width: 1024px) {
        .login-container {
          position: static;
          height: auto;
          overflow: visible;
        }
        .login-image-container {
          display: none !important;
        }
        .login-form-container {
          position: static !important;
          width: 100% !important;
          height: auto !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // -------------------- Theme Verification Effect --------------------
  useEffect(() => {
    const verifyUserAndSetTheme = async () => {
      try {
        const host = window.location.hostname;
        const subDomainName = getSubdomain(host);

        console.log("Extracted subdomain:", subDomainName);

        const verifyResponse = await verifyUser(subDomainName, "web");

        console.log("Verify user response:", verifyResponse);

        if (verifyResponse.isSuccess && verifyResponse.data) {
          const logoUrl = verifyResponse.data.logoUrl;
          if (logoUrl) {
            localStorage.setItem("logoUrl", logoUrl);
            setLogoUrl(logoUrl);
          }

          const whiteLabelData = verifyResponse.data.whiteLabelData;
          if (whiteLabelData) {
            setThemeData({ logoUrl, whiteLabelData });
            applyThemeToDOM(whiteLabelData);

            localStorage.setItem("themeData", JSON.stringify(whiteLabelData));
          }
        } else {
          console.warn(
            "Failed to verify user or get theme data:",
            verifyResponse.message
          );
          setLogoUrl("/default-logo.png");
        }
      } catch (error) {
        console.error("Failed to verify user and set theme:", error);
        setLogoUrl("/default-logo.png");
      }
    };

    verifyUserAndSetTheme();
  }, []);

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
    } else {
      setPassword(value);
    }
    if (!loginTouched[field]) {
      setLoginTouched((prev) => ({ ...prev, [field]: true }));
    }
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
  const isLoginFormValid = emailValid && passwordValid;

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
      duration: 5000,
    });
  };
  const handlePastePrevention = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    toast({
      title: "Paste not allowed",
      description:
        "Pasting into password fields is not allowed for security reasons",
      variant: "destructive",
      duration: 5000,
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

  // Auto-detect personal email and show company field
  useEffect(() => {
    if (EMAIL_REGEX.test(email)) {
      const isPersonal = isPersonalEmail(email);
      setRequiresCompany(isPersonal);
      setShowCompanyField(isPersonal);
    }
  }, [email]);

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
        duration: 5000,
      });
      return;
    }
    if (requiresCompany && !companyName.trim()) {
      toast({
        title: "Company required",
        description: "Please enter your company name first",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    setIsLoading(true);
    try {
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
          duration: 5000,
        });
        setForgotPasswordMode(true);
      } else {
        toast({
          title: "Failed to send OTP",
          description: otpResponse.message,
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.message || "An error occurred while processing your request",
        variant: "destructive",
        duration: 5000,
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
        duration: 5000,
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
          duration: 5000,
        });
      } else {
        toast({
          title: "Invalid OTP",
          description: verifyResponse.message,
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred while verifying OTP",
        variant: "destructive",
        duration: 5000,
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
        duration: 5000,
      });
      return;
    }

    if (!validateNewPassword(newPassword, confirmPassword)) return;
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords match",
        variant: "destructive",
        duration: 5000,
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
          duration: 5000,
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
          duration: 5000,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.message || "An error occurred while resetting your password",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------- Post-login routing helpers --------------------
  const getFirstAccessibleModule = (userModules: UserModuleAccess[]): string => {
    if (!userModules || userModules.length === 0) return "/not-found";
    const modulePriority = ["lead", "task", "employees", "department", "user"];
    for (const moduleName of modulePriority) {
      const userModule = userModules.find(
        (m) =>
          m.moduleName.toLowerCase() === moduleName.toLowerCase() && m.canView
      );
      if (userModule) {
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
    const firstAccessible = userModules.find((m) => m.canView);
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

  // -------------------- Login Submit (Optimized) --------------------
// Fixed Login handleLogin function - only the relevant part
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();

  setLoginTouched({ email: true, password: true });
  const emailErr = validateLoginField("email", email);
  const pwdErr = validateLoginField("password", password);
  setLoginErrors({ email: emailErr, password: pwdErr });

  if (emailErr || pwdErr) return;

  setIsLoading(true);
  try {
    const loginData = {
      emailAddress: email,
      password,
      deviceType: "web",
      accessRegion: "tenant",
      ...(requiresCompany && { companyName }),
    };

    const response = (await loginUser(loginData)) as unknown as LoginResponse;

    if (response.isSuccess) {
      const { profileResponse, authTokenResponse } = response.data;

      // Store auth tokens first
      if (authTokenResponse.token) {
        localStorage.setItem("authToken", authTokenResponse.token);
      }
      if (authTokenResponse.refreshToken) {
        localStorage.setItem("refreshToken", authTokenResponse.refreshToken);
      }

      // Store user data
      const userModules = profileResponse.userModuleAccessList?.map((access) => ({
        id: access.moduleId || parseInt(access.id?.toString() || "0"),
        moduleId: access.moduleId || parseInt(access.id?.toString() || "0"),
        moduleName: access.moduleName
          ? access.moduleName.charAt(0).toUpperCase() + access.moduleName.slice(1)
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
        modules: userModules,
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

      // Store all user data in localStorage
      localStorage.setItem("currentUser", JSON.stringify(completeUserProfile));
      localStorage.setItem("userModules", JSON.stringify(userModules));
      localStorage.setItem("userId", response.data.profileResponse.id);
      localStorage.setItem("user", JSON.stringify(response.data.profileResponse));

      // Update Redux store
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
        duration: 5000,
      });

      // FIXED FCM Token Setup - Better sequencing and error handling
      const setupNotifications = async () => {
        try {
          console.log('🔔 Setting up notifications after successful login...');
          
          // Initialize token refresh handler first (this manages all token operations)
          const cleanup = initTokenRefreshHandler("WEB");
          window.fcmCleanup = cleanup;
          
          // Check if notifications are supported and get permission status
          const permission = getNotificationPermission();
          
          if (permission === 'granted') {
            console.log('🔔 Notification permission already granted, setting up token...');
            
            // Generate and save FCM token - this will be handled by the refresh handler
            // We don't need to manually call generateFCMToken here as the refresh handler will do it
            // Just trigger a token check after a short delay
            setTimeout(() => {
              // The token refresh handler will automatically generate and send the token
              console.log('✅ FCM notification setup initiated');
            }, 2000);
            
          } else if (permission === 'default') {
            // Permission not yet requested - will be handled when user enables notifications
            console.log('🔔 Notification permission not yet requested - will be handled on user action');
          } else {
            // Permission denied
            console.log('❌ Notification permission denied');
          }
          
        } catch (fcmError) {
          // FCM errors are non-critical for login flow
          console.error('❌ FCM setup error (non-critical):', fcmError);
        }
      };

      // Run notification setup asynchronously without blocking navigation
      setupNotifications();

      // Determine redirect path
      let redirectPath = "/not-found";

      if (profileResponse.userRole === "SUPER_ADMIN") {
        redirectPath = "/dashboard";
      } else if (!profileResponse.isPasswordUpdated) {
        redirectPath = "/reset-password";
      } else {
        redirectPath = getFirstAccessibleModule(userModules);
      }

      // Navigate after a brief delay to ensure everything is set up
      setTimeout(() => {
        router.push(redirectPath);
      }, 500);
      
    } else {
      toast({
        title: "Login failed",
        description: response.message,
        variant: "destructive",
        duration: 5000,
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
      duration: 5000,
    });
  } finally {
    setIsLoading(false);
  }
};

  // -------------------- UI (keeping the same structure) --------------------
  return (
    <div className="login-container min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Left Side - Image */}
      <div className="login-image-container lg:w-1/2 relative hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50">
          <Image
            src="/login.jpeg"
            alt="CRM Background"
            fill
            style={{ objectFit: 'cover', transform: 'none' }}
            quality={100}
            priority
            className="transform-none will-change-auto"
            sizes="(max-width: 1024px) 0vw, 50vw"
          />
        </div>
        <div className="absolute inset-0 bg-primary/10" />
      </div>

      {/* Right Side - Login Form */}
      <div className="login-form-container w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 min-h-screen lg:min-h-0">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          {/* Logo and Branding */}
          <div className="text-center space-y-3 sm:space-y-4">
            <div>
              <img
                src={logoUrl}
                alt="Logo"
                className="mx-auto h-12 sm:h-14 md:h-16 w-auto max-w-[200px]"
              
              />
            </div>

            <div className="space-y-1 sm:space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                {forgotPasswordMode ? "Reset Password" : "Welcome Back"}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground px-2">
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
          <Card className="border border-border shadow-elevated">
            <CardContent className="p-4 sm:p-6 md:p-8">
              {!forgotPasswordMode ? (
                <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
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
                      className={`h-11 sm:h-12 bg-background border-input focus:border-primary rounded-lg text-[14px] ${borderClass(
                        "email"
                      )}`}
                      autoComplete="email"
                      style={{ fontSize: '16px' }}
                    />
                    {renderValidationStatus("email")}
                  </div>

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
                        className={`h-11 sm:h-12 pr-12 bg-background border-input focus:border-primary rounded-lg text-[14px] ${borderClass(
                          "password"
                        )}`}
                        onCopy={handleCopyPrevention}
                        onPaste={handlePastePrevention}
                        autoComplete="current-password"
                        style={{ fontSize: '16px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 text-sm">
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
                      className="text-primary hover:text-primary/80 font-medium transition-colors text-center sm:text-right"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !isLoginFormValid}
                    className={`w-full h-11 sm:h-12 bg-brand-primary hover:bg-brand-primary/90 text-text-white font-semibold transition-all duration-300 shadow-subtle ${isLoading || !isLoginFormValid ? "btn-disabled" : ""
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
                // Forgot Password Flow (keeping the same structure)
                <div className="space-y-4 sm:space-y-6">
                  {!otpSent && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Email: {email}</span>
                      </div>
                      <Button
                        onClick={handleForgotPassword}
                        disabled={isLoading}
                        className="w-full h-11 sm:h-12 bg-brand-primary hover:bg-brand-primary/90 text-text-white"
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

                  {otpSent && !otpVerified && (
                    <div className="space-y-4">
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
                          className="h-11 sm:h-12 bg-background border-input focus:border-primary text-base"
                          style={{ fontSize: '16px' }}
                        />
                      </div>
                      <Button
                        onClick={handleVerifyOtp}
                        disabled={isLoading || !otp}
                        className={`w-full h-11 sm:h-12 bg-brand-primary hover:bg-brand-primary/90 text-text-white ${isLoading || !otp ? "btn-disabled" : ""
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
                            className="h-11 sm:h-12 pr-12 bg-background border-input focus:border-primary text-base"
                            onCopy={handleCopyPrevention}
                            onPaste={handlePastePrevention}
                            style={{ fontSize: '16px' }}
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
                            className="h-11 sm:h-12 pr-12 bg-background border-input focus:border-primary text-base"
                            onCopy={handleCopyPrevention}
                            onPaste={handlePastePrevention}
                            style={{ fontSize: '16px' }}
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
                        className={`w-full h-11 sm:h-12 bg-brand-primary hover:bg-brand-primary/90 text-text-white ${isLoading ||
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
        </div>
      </div>
    </div>
  );
}