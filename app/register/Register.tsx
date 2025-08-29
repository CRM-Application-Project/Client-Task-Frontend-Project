"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Eye,
  EyeOff,
  UserPlus,
  Building2,
  Users,
  TrendingUp,
  Shield,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Upload,
  ImageIcon,
  Palette,
  Monitor,
  Smartphone,
  X,
  Menu,
  Home,
  UserCheck,
  BarChart3,
  Settings,
  Bell,
  Search,
  Plus,
  LogIn, 
  ArrowLeft, 
  Mail as MailIcon, 
  CheckCircle as CheckCircleIcon, 
  Mail,
  Minimize,
  Maximize
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { registerUser, generateBrandPalettes } from "../services/data.service";
import ColorThief from "colorthief";
import LoginPreview from "@/components/register/LoginPreview";

// Updated theme interfaces matching the API response format
interface BrandSettings {
  primaryColor: string;
  secondaryColor: string;
  headerBgColor: string;
  headerTextColor: string;
  textColor: string;
  backgroundColor: string;
}

interface TopBanner {
  backgroundColor: string;
  textColor: string;
}

interface ThemePalette {
  logoColor: string;
  description: string;
  brandSettings: BrandSettings;
  topBanner: TopBanner;
}

interface GenerateBrandResponse {
  isSuccess: boolean;
  message: string;
  data: {
    data: {
      palettes: ThemePalette[];
    };
  };
}

export default function RegisterPage() {
  // ---------- CONSTANTS (Validation) ----------
  const NAME_REGEX = /^[A-Za-z ]+$/;
  const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  const PHONE_REGEX = /^\d{10}$/;
  const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  // ---------- DATA ----------
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    emailAddress: "",
    password: "",
    companyName: "",
    companyContactNumber: "",
    gstNumber: "",
  });

  // State for logo, colors, and themes
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showThemeSelection, setShowThemeSelection] = useState(false);
  const [generatedThemes, setGeneratedThemes] = useState<ThemePalette[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<ThemePalette | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isGeneratingThemes, setIsGeneratingThemes] = useState(false);

  interface ValidationErrors {
    firstName: string;
    lastName: string;
    emailAddress: string;
    password: string;
    companyName: string;
    companyContactNumber: string;
    gstNumber: string;
  }
  type FieldName = keyof ValidationErrors;

  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({
    firstName: "",
    lastName: "",
    emailAddress: "",
    password: "",
    companyName: "",
    companyContactNumber: "",
    gstNumber: "",
  });

  const [touchedFields, setTouchedFields] = useState<Record<FieldName, boolean>>({
    firstName: false,
    lastName: false,
    emailAddress: false,
    password: false,
    companyName: false,
    companyContactNumber: false,
    gstNumber: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCompanyInfo, setShowCompanyInfo] = useState(true);
  const [isFormValid, setIsFormValid] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // ---------- THEME GENERATION FROM BACKEND ----------
  const fetchThemesFromBackend = async (colors: string[]) => {
    setIsGeneratingThemes(true);
    try {
      const response: GenerateBrandResponse = await generateBrandPalettes(colors);
      
      if (response.isSuccess && response.data?.data?.palettes) {
        setGeneratedThemes(response.data.data.palettes);
        toast({
          title: "Themes Generated",
          description: `Generated ${response.data.data.palettes.length} custom themes for your brand`,
        });
      } else {
        throw new Error(response.message || "Failed to generate themes");
      }
    } catch (error) {
      console.error("Error generating themes:", error);
      toast({
        title: "Theme Generation Failed",
        description: "Could not generate themes from your logo colors",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingThemes(false);
    }
  };

  // ---------- LOGO UPLOAD HANDLING ----------
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const imageDataUrl = e.target?.result as string;
      setCompanyLogo(imageDataUrl);
      extractColorsFromImage(imageDataUrl);
      setIsUploading(false);
    };
    
    reader.onerror = () => {
      toast({
        title: "Upload Error",
        description: "Failed to read the image file",
        variant: "destructive",
      });
      setIsUploading(false);
    };
    
    reader.readAsDataURL(file);
  };

  const extractColorsFromImage = async (imageSrc: string) => {
    const img = new globalThis.Image();
    img.crossOrigin = "Anonymous";
    img.crossOrigin = "Anonymous";
    img.src = imageSrc;
    
    img.onload = async () => {
      try {
        const colorThief = new ColorThief();
        const colorPalette = colorThief.getPalette(img, 5);
      
        
        const hexColors = colorPalette.map(rgb => 
          `#${rgb.map(c => c.toString(16).padStart(2, '0')).join('')}`
        );
        
        setExtractedColors(hexColors);
        
        toast({
          title: "Logo Uploaded",
          description: `Extracted ${hexColors.length} colors. Generating themes...`,
        });

        // Call backend API to generate themes
        await fetchThemesFromBackend(hexColors);
        
      } catch (error) {
        console.error("Error extracting colors:", error);
        toast({
          title: "Color Extraction Failed",
          description: "Could not extract colors from the image",
          variant: "destructive",
        });
      }
    };
    
    img.onerror = () => {
      toast({
        title: "Image Error",
        description: "Failed to load the image for color extraction",
        variant: "destructive",
      });
    };
  };

  // ---------- THEME SELECTION ----------
  const handleThemeSelect = (theme: ThemePalette) => {
    setSelectedTheme(theme);
    toast({
      title: "Theme Selected",
      description: "Your theme has been selected successfully",
    });
  };

  // ---------- CRM PREVIEW COMPONENT ----------
  const CRMPreview = ({ theme, device }: { theme: ThemePalette; device: 'desktop' | 'mobile' }) => {
    const isDesktop = device === 'desktop';
    
    return (
      <div 
        className={`${isDesktop ? 'w-full h-full' : 'w-80 h-96'} rounded-lg overflow-hidden shadow-lg`}
        style={{ backgroundColor: theme.brandSettings.backgroundColor }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 border-b"
          style={{ 
            backgroundColor: theme.brandSettings.headerBgColor,
            color: theme.brandSettings.headerTextColor,
            borderColor: theme.brandSettings.primaryColor + '20'
          }}
        >
          <div className="flex items-center gap-3">
            {!isDesktop && <Menu className="h-5 w-5" />}
            {companyLogo && (
              <img 
                src={companyLogo} 
                alt="Logo" 
                className="h-8 w-8 object-contain rounded"
              />
            )}
            <span className="font-semibold text-lg">{formData.companyName || 'Your Company'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-sm font-medium">
                {formData.firstName ? formData.firstName[0] : 'U'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex h-full">
          {/* Sidebar - Desktop only */}
          {isDesktop && (
            <div 
              className="w-16 border-r flex flex-col items-center py-4 space-y-4"
              style={{ 
                backgroundColor: theme.brandSettings.backgroundColor,
                borderColor: theme.brandSettings.primaryColor + '20'
              }}
            >
              <Home className="h-5 w-5" style={{ color: theme.brandSettings.primaryColor }} />
              <UserCheck className="h-5 w-5" style={{ color: theme.brandSettings.textColor }} />
              <BarChart3 className="h-5 w-5" style={{ color: theme.brandSettings.textColor }} />
              <Settings className="h-5 w-5" style={{ color: theme.brandSettings.textColor }} />
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 p-4">
            {/* Top Banner */}
            <div 
              className="rounded-lg p-4 mb-4"
              style={{ 
                backgroundColor: theme.topBanner.backgroundColor,
                color: theme.topBanner.textColor
              }}
            >
              <h2 className="text-lg font-semibold mb-2">Welcome to your CRM Dashboard</h2>
              <p className="text-sm opacity-90">Manage your leads, customers, and business growth</p>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" 
                style={{ color: theme.brandSettings.textColor + '60' }} />
              <input 
                type="text" 
                placeholder="Search leads, customers..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border"
                style={{ 
                  backgroundColor: theme.brandSettings.backgroundColor,
                  borderColor: theme.brandSettings.primaryColor + '30',
                  color: theme.brandSettings.textColor
                }}
              />
            </div>

            {/* Stats Cards */}
            <div className={`grid ${isDesktop ? 'grid-cols-3' : 'grid-cols-2'} gap-4 mb-4`}>
              <div 
                className="p-4 rounded-lg border"
                style={{ 
                  backgroundColor: theme.brandSettings.backgroundColor,
                  borderColor: theme.brandSettings.primaryColor + '20'
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm" style={{ color: theme.brandSettings.textColor + '80' }}>Total Leads</p>
                    <p className="text-2xl font-bold" style={{ color: theme.brandSettings.textColor }}>1,234</p>
                  </div>
                  <UserCheck className="h-8 w-8" style={{ color: theme.brandSettings.primaryColor }} />
                </div>
              </div>
              
              <div 
                className="p-4 rounded-lg border"
                style={{ 
                  backgroundColor: theme.brandSettings.backgroundColor,
                  borderColor: theme.brandSettings.secondaryColor + '20'
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm" style={{ color: theme.brandSettings.textColor + '80' }}>Conversions</p>
                    <p className="text-2xl font-bold" style={{ color: theme.brandSettings.textColor }}>89</p>
                  </div>
                  <TrendingUp className="h-8 w-8" style={{ color: theme.brandSettings.secondaryColor }} />
                </div>
              </div>

              {isDesktop && (
                <div 
                  className="p-4 rounded-lg border"
                  style={{ 
                    backgroundColor: theme.brandSettings.backgroundColor,
                    borderColor: theme.brandSettings.primaryColor + '20'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm" style={{ color: theme.brandSettings.textColor + '80' }}>Revenue</p>
                      <p className="text-2xl font-bold" style={{ color: theme.brandSettings.textColor }}>$45.2K</p>
                    </div>
                    <BarChart3 className="h-8 w-8" style={{ color: theme.brandSettings.primaryColor }} />
                  </div>
                </div>
              )}
            </div>

            {/* Action Button */}
            <button 
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
              style={{ 
                backgroundColor: theme.brandSettings.primaryColor,
                color: theme.brandSettings.headerTextColor
              }}
            >
              <Plus className="h-4 w-4" />
              Add New Lead
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ---------- VALIDATORS ----------
  const validateField = (fieldName: FieldName, value: string): string => {
    switch (fieldName) {
      case "firstName":
        if (!value.trim()) return "First name is required";
        if (!NAME_REGEX.test(value)) return "Only letters and spaces allowed";
        return "";
      case "lastName":
        if (!value.trim()) return "Last name is required";
        if (!NAME_REGEX.test(value)) return "Only letters and spaces allowed";
        return "";
      case "emailAddress":
        if (!value.trim()) return "Email address is required";
        if (!EMAIL_REGEX.test(value))
          return "Enter a valid email address (e.g., name@domain.com)";
        return "";
      case "password":
        if (!value) return "Password is required";
        if (!PASSWORD_REGEX.test(value))
          return "Min 8 chars with uppercase, lowercase, number & special character";
        return "";
      case "companyName":
        if (!value.trim()) return "Company name is required";
        return "";
      case "companyContactNumber":
        if (!value) return "Contact number is required";
        if (!PHONE_REGEX.test(value))
          return "Phone number must be exactly 10 digits";
        return "";
      case "gstNumber":
        if (!value) return "GST number is required";
        if (!GST_REGEX.test(value))
          return "Enter a valid GSTIN (e.g., 29ABCDE1234F1Z5)";
        return "";
      default:
        return "";
    }
  };

  const validateMany = (names: FieldName[]) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      names.forEach((n) => {
        next[n] = validateField(n, (formData as any)[n]);
      });
      return next;
    });
  };

  // ---------- DERIVED VALIDITY ----------
  const personalValid = useMemo(() => {
    return (
      validateField("firstName", formData.firstName) === "" &&
      validateField("lastName", formData.lastName) === "" &&
      validateField("emailAddress", formData.emailAddress) === "" &&
      validateField("password", formData.password) === ""
    );
  }, [
    formData.firstName,
    formData.lastName,
    formData.emailAddress,
    formData.password,
  ]);

  const companyValid = useMemo(() => {
    return (
      validateField("companyName", formData.companyName) === "" &&
      validateField("companyContactNumber", formData.companyContactNumber) === "" &&
      validateField("gstNumber", formData.gstNumber) === ""
    );
  }, [
    formData.companyName,
    formData.companyContactNumber,
    formData.gstNumber,
  ]);

  // Auto-expand Company Info once personal info is valid
  useEffect(() => {
    if (personalValid && !showCompanyInfo) {
      setShowCompanyInfo(true);
    }
  }, [personalValid, showCompanyInfo]);

  // Overall form validity
  useEffect(() => {
    setIsFormValid(personalValid && companyValid);
  }, [personalValid, companyValid]);

  // ---------- INPUT HANDLERS ----------
  type FormFieldName =
    | "firstName"
    | "lastName"
    | "emailAddress"
    | "password"
    | "companyName"
    | "companyContactNumber"
    | "gstNumber";

  const handleInputChange = (field: FormFieldName, rawValue: string): void => {
    let value = rawValue;

    if (field === "emailAddress") {
      value = value.trimStart();
    }

    if (field === "companyContactNumber") {
      value = value.replace(/\D/g, "").slice(0, 10);
    }

    if (field === "gstNumber") {
      value = value.toUpperCase().slice(0, 15);
    }

    setFormData((prev) => ({ ...prev, [field]: value }));

    if (!touchedFields[field as FieldName]) {
      setTouchedFields((prev) => ({ ...prev, [field]: true }));
    }

    const err = validateField(field as FieldName, value);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleBlur = (fieldName: FieldName): void => {
    if (!touchedFields[fieldName]) {
      setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));
    }
    const error = validateField(fieldName, (formData as any)[fieldName]);
    setFieldErrors((prev) => ({ ...prev, [fieldName]: error }));
  };

  // ---------- SUBMIT ----------
const handleRegister = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
  e.preventDefault();

  // Check if theme is selected when logo is uploaded
  if (extractedColors.length > 0 && !selectedTheme) {
    toast({
      title: "Theme Required",
      description: "Please select a theme for your CRM before registering",
      variant: "destructive",
    });
    return;
  }

  // Force-validate all fields on submit
  const allFields: FieldName[] = [
    "firstName",
    "lastName",
    "emailAddress",
    "password",
    "companyName",
    "companyContactNumber",
    "gstNumber",
  ];

  setTouchedFields((prev) => {
    const next = { ...prev };
    allFields.forEach((f) => (next[f] = true));
    return next;
  });

  validateMany(allFields);

  const canSubmit =
    allFields.every((f) => validateField(f, (formData as any)[f]) === "") &&
    personalValid &&
    companyValid;

  if (!canSubmit) return;

  setIsLoading(true);
  try {
    // Prepare the registration data with white label request
    const registerData = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      emailAddress: formData.emailAddress.trim(),
      password: formData.password,
      companyName: formData.companyName.trim(),
      companyContactNumber: formData.companyContactNumber,
      gstNumber: formData.gstNumber,
      ...(selectedTheme ? {
        whiteLabelRequest: {
          description: selectedTheme.description,
          brandSettings: selectedTheme.brandSettings,
          topBanner: selectedTheme.topBanner,
        }
      } : {})
    };

    // Get the logo file if uploaded
    let logoFile: File | undefined;
    if (companyLogo) {
      // Convert data URL to File object
      const response = await fetch(companyLogo);
      const blob = await response.blob();
      logoFile = new File([blob], "company-logo", { type: blob.type });
    }

    const response = await registerUser(registerData, logoFile);

    if (response.isSuccess) {
      toast({
        title: "Registration Successful",
        description: response.data?.message || "Your account has been created successfully!",
      });
      router.push("/login");
    } else {
      toast({
        title: "Registration Failed",
        description: response.message || "Please check your information and try again.",
        variant: "destructive",
      });
    }
  } catch (error: any) {
    toast({
      title: "Error",
      description: error?.message || "An unexpected error occurred. Please try again later.",
      variant: "destructive",
    });
    console.error("Registration error:", error);
  } finally {
    setIsLoading(false);
  }
};

  // ---------- UI HELPERS ----------
  const borderClass = (field: FieldName) =>
    touchedFields[field] && fieldErrors[field]
      ? "border-destructive"
      : touchedFields[field] && !fieldErrors[field] && (formData as any)[field]
      ? "border-green-500"
      : "";

  const renderValidationStatus = (fieldName: FieldName): React.ReactNode => {
    if (!touchedFields[fieldName]) return null;

    if (fieldErrors[fieldName]) {
      return (
        <div className="flex items-center gap-1 mt-1 text-destructive text-xs">
          <AlertCircle className="h-3 w-3" />
          <span>{fieldErrors[fieldName]}</span>
        </div>
      );
    } else if ((formData as any)[fieldName]) {
      return (
        <div className="flex items-center gap-1 mt-1 text-green-600 text-xs">
          <CheckCircle className="h-3 w-3" />
          <span>Valid</span>
        </div>
      );
    }
    return null;
  };
const [previewModalOpen, setPreviewModalOpen] = useState(false);
const [previewTheme, setPreviewTheme] = useState<ThemePalette | null>(null);
const [fullScreenPreview, setFullScreenPreview] = useState(false);
const [isLogoHovered, setIsLogoHovered] = useState(false);

// Add this function to handle logo deletion
const handleDeleteLogo = () => {
  setCompanyLogo(null);
  setExtractedColors([]);
  setGeneratedThemes([]);
  setSelectedTheme(null);
  setShowThemeSelection(false);
  toast({
    title: "Logo Removed",
    description: "Company logo has been removed",
  });
};


// Add the compact LoginPreview component for the small preview

// Update the ThemePreviewModal component with smooth scrolling
// Update the ThemePreviewModal component
const ThemePreviewModal = ({ theme, onClose }: { theme: ThemePalette; onClose: () => void }) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [previewEmail, setPreviewEmail] = useState("");
  const [previewPassword, setPreviewPassword] = useState("");
  const [previewShowPassword, setPreviewShowPassword] = useState(false);
  
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-0">
      <div className={`bg-white ${isFullScreen ? 'w-full h-full' : 'max-w-5xl w-full max-h-[90vh]'} rounded-none overflow-hidden flex flex-col`}>
        {/* Header - Fixed position */}
        <div className="flex items-center justify-between p-4 border-b bg-white shrink-0">
          <h3 className="font-semibold text-lg">Theme Preview - Login Page</h3>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => {
                setSelectedTheme(theme);
                onClose();
                toast({
                  title: "Theme Selected",
                  description: "Your theme has been saved successfully",
                });
              }}
              style={{ 
                backgroundColor: theme.brandSettings.primaryColor,
                color: theme.brandSettings.headerTextColor
              }}
            >
              Select This Theme
            </Button>
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 hover:bg-gray-100 rounded"
              title={isFullScreen ? 'Exit full screen' : 'View full screen'}
            >
              {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Preview Content - Fixed height container */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* Left Side - Image (fixed, no scroll) */}
          <div className="lg:w-1/2 relative hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50">
              <img
                src="/login.jpeg"
                alt="CRM Background"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute inset-0 bg-primary/10" />
          </div>

          {/* Right Side - Login Form with proper scrolling */}
          <div className="lg:w-1/2 flex items-start justify-center p-4 lg:p-8 overflow-y-auto">
            <div className="w-full max-w-md space-y-6 lg:space-y-8 my-auto">
              {/* Logo and Branding */}
              <div className="text-center space-y-4">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold" style={{ color: theme.brandSettings.textColor }}>
                    Welcome Back
                  </h2>
                  <p className="text-muted-foreground" style={{ color: theme.brandSettings.textColor + '80' }}>
                    Please sign in to your account to continue
                  </p>
                </div>
              </div>

              {/* Login Form */}
              <Card 
                className="border shadow-elevated"
                style={{ 
                  borderColor: theme.brandSettings.primaryColor + '30',
                  backgroundColor: theme.brandSettings.backgroundColor
                }}
              >
                <CardContent className="p-6 lg:p-8">
                  <form className="space-y-6">
                    <div className="space-y-2">
                      <Label
                        htmlFor="preview-email"
                        className="text-sm font-medium"
                        style={{ color: theme.brandSettings.textColor }}
                      >
                        Email Address
                      </Label>
                      <div className="relative">
                        <Input
                          id="preview-email"
                          type="email"
                          placeholder="Enter your email address"
                          value={previewEmail}
                          onChange={(e) => setPreviewEmail(e.target.value)}
                          className="h-12 pl-12 border-input focus:border-primary transition-all duration-200 rounded-lg"
                          style={{ 
                            borderColor: theme.brandSettings.primaryColor + '30',
                            backgroundColor: theme.brandSettings.backgroundColor,
                            color: theme.brandSettings.textColor
                          }}
                        />
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="preview-password"
                        className="text-sm font-medium"
                        style={{ color: theme.brandSettings.textColor }}
                      >
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="preview-password"
                          type={previewShowPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={previewPassword}
                          onChange={(e) => setPreviewPassword(e.target.value)}
                          className="h-12 pr-12 border-input focus:border-primary transition-all duration-200 rounded-lg"
                          style={{ 
                            borderColor: theme.brandSettings.primaryColor + '30',
                            backgroundColor: theme.brandSettings.backgroundColor,
                            color: theme.brandSettings.textColor
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewShowPassword(!previewShowPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {previewShowPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded border-input text-primary focus:ring-primary focus:ring-offset-0"
                          style={{ 
                            borderColor: theme.brandSettings.primaryColor + '30',
                            color: theme.brandSettings.primaryColor
                          }}
                        />
                        <span style={{ color: theme.brandSettings.textColor + '80' }}>Remember me</span>
                      </label>
                      <button
                        type="button"
                        className="font-medium transition-colors"
                        style={{ color: theme.brandSettings.primaryColor }}
                      >
                        Forgot password?
                      </button>
                    </div>

                    <Button
                      type="button"
                      className="w-full h-12 font-semibold transition-all duration-300 transform hover:scale-[1.02] shadow-subtle rounded-lg"
                      style={{ 
                        backgroundColor: theme.brandSettings.primaryColor,
                        color: theme.brandSettings.headerTextColor
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <LogIn className="h-4 w-4" />
                        Sign In
                      </div>
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Additional Links */}
              <div className="text-center space-y-4 pb-4">
                <p className="text-sm" style={{ color: theme.brandSettings.textColor + '80' }}>
                  {`Don't have an account?{" "}`}
                  <button
                    className="font-medium transition-colors"
                    style={{ color: theme.brandSettings.primaryColor }}
                  >
                    Register
                  </button>
                </p>

                {/* Feature Pills */}
                <div className="flex flex-wrap justify-center gap-2 pt-4">
                  <div 
                    className="flex items-center gap-2 px-3 py-1 rounded-full text-xs"
                    style={{ 
                      backgroundColor: theme.brandSettings.primaryColor + '10',
                      color: theme.brandSettings.primaryColor
                    }}
                  >
                    <Shield className="h-3 w-3" />
                    Secure
                  </div>
                  <div 
                    className="flex items-center gap-2 px-3 py-1 rounded-full text-xs"
                    style={{ 
                      backgroundColor: theme.brandSettings.primaryColor + '10',
                      color: theme.brandSettings.primaryColor
                    }}
                  >
                    <Users className="h-3 w-3" />
                    Team Collaboration
                  </div>
                  <div 
                    className="flex items-center gap-2 px-3 py-1 rounded-full text-xs"
                    style={{ 
                      backgroundColor: theme.brandSettings.primaryColor + '10',
                      color: theme.brandSettings.primaryColor
                    }}
                  >
                    <TrendingUp className="h-3 w-3" />
                    Analytics
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
// Add this CSS to your global styles or as a style tag for smooth scrolling
<style jsx>{`
  .smooth-scroll {
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
  }
  .smooth-scroll::-webkit-scrollbar {
    width: 6px;
  }
  .smooth-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .smooth-scroll::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
  .smooth-scroll::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`}</style>



  return (
    <div className="h-screen bg-background flex flex-col lg:flex-row overflow-hidden">
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
        <div className="absolute inset-0 bg-primary/10" />
      </div>

      {/* Right Side - Registration Form */}
      <div className="lg:w-1/2 flex flex-col animate-slide-in-right h-full">
        <div className="flex-1 p-8 lg:p-12 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className="w-full max-w-2xl mx-auto space-y-2">
            {/* Logo and Branding */}
            <div className="text-center space-y-4">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">
                  Create Your Account
                </h2>
                <p className="text-muted-foreground">
                  Join thousands of businesses streamlining their operations
                </p>
              </div>
            </div>

            {/* Registration Form */}
            <Card className="border border-border shadow-elevated animate-scale-in rounded-xl">
              <CardContent className="p-8">
                <form
                  onSubmit={handleRegister}
                  className="space-y-6"
                  autoComplete="off"
                >
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                      Personal Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="firstName"
                          className="text-sm font-medium text-foreground"
                        >
                          First Name
                        </Label>
                        <Input
                          id="firstName"
                          type="text"
                          placeholder="Enter your first name"
                          value={formData.firstName}
                          onChange={(e) =>
                            handleInputChange("firstName", e.target.value)
                          }
                          onBlur={() => handleBlur("firstName")}
                          required
                          className={`h-12 bg-background border-input focus:border-primary transition-all duration-200 rounded-lg ${borderClass(
                            "firstName"
                          )}`}
                          autoComplete="given-name"
                        />
                        {renderValidationStatus("firstName")}
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="lastName"
                          className="text-sm font-medium text-foreground"
                        >
                          Last Name
                        </Label>
                        <Input
                          id="lastName"
                          type="text"
                          placeholder="Enter your last name"
                          value={formData.lastName}
                          onChange={(e) =>
                            handleInputChange("lastName", e.target.value)
                          }
                          onBlur={() => handleBlur("lastName")}
                          required
                          className={`h-12 bg-background border-input focus:border-primary transition-all duration-200 rounded-lg ${borderClass(
                            "lastName"
                          )}`}
                          autoComplete="family-name"
                        />
                        {renderValidationStatus("lastName")}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="emailAddress"
                        className="text-sm font-medium text-foreground"
                      >
                        Email Address
                      </Label>
                      <Input
                        id="emailAddress"
                        type="email"
                        placeholder="Enter your email address"
                        value={formData.emailAddress}
                        onChange={(e) =>
                          handleInputChange("emailAddress", e.target.value)
                        }
                        onBlur={() => handleBlur("emailAddress")}
                        required
                        className={`h-12 bg-background border-input focus:border-primary transition-all duration-200 rounded-lg ${borderClass(
                          "emailAddress"
                        )}`}
                        autoComplete="email"
                      />
                      {renderValidationStatus("emailAddress")}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="password"
                        className="text-sm font-medium text-foreground"
                      >
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a strong password"
                          value={formData.password}
                          onChange={(e) =>
                            handleInputChange("password", e.target.value)
                          }
                          onBlur={() => handleBlur("password")}
                          required
                          className={`h-12 pr-12 bg-background border-input focus:border-primary transition-all duration-200 rounded-lg ${borderClass(
                            "password"
                          )}`}
                          autoComplete="new-password"
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
                  </div>

                  {/* Company Information */}
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={() => setShowCompanyInfo(!showCompanyInfo)}
                      className="flex items-center justify-between w-full text-lg font-semibold text-foreground border-b border-border pb-2"
                    >
                      <span>Company Information</span>
                      {showCompanyInfo ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>

                    {showCompanyInfo && (
                      <div className="space-y-4 animate-fade-in">
                        {/* Logo Upload Section */}
                     

                        <div className="space-y-2">
                          <Label
                            htmlFor="companyName"
                            className="text-sm font-medium text-foreground"
                          >
                            Company Name
                          </Label>
                          <Input
                            id="companyName"
                            type="text"
                            placeholder="Enter your company name"
                            value={formData.companyName}
                            onChange={(e) =>
                              handleInputChange("companyName", e.target.value)
                            }
                            onBlur={() => handleBlur("companyName")}
                            required
                            className={`h-12 bg-background border-input focus:border-primary transition-all duration-200 rounded-lg ${borderClass(
                              "companyName"
                            )}`}
                          />
                          {renderValidationStatus("companyName")}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label
                              htmlFor="companyContactNumber"
                              className="text-sm font-medium text-foreground"
                            >
                              Company Contact Number
                            </Label>
                            <Input
                              id="companyContactNumber"
                              type="tel"
                              maxLength={10}
                              placeholder="Enter contact number"
                              value={formData.companyContactNumber}
                              onChange={(e) =>
                                handleInputChange(
                                  "companyContactNumber",
                                  e.target.value
                                )
                              }
                              onBlur={() => handleBlur("companyContactNumber")}
                              required
                              className={`h-12 bg-background border-input focus:border-primary transition-all duration-200 rounded-lg ${borderClass(
                                "companyContactNumber"
                              )}`}
                            />
                            {renderValidationStatus("companyContactNumber")}
                          </div>
                          <div className="space-y-2">
                            <Label
                              htmlFor="gstNumber"
                              className="text-sm font-medium text-foreground"
                            >
                              GST Number
                            </Label>
                            <Input
                              id="gstNumber"
                              type="text"
                              placeholder="Enter GST number (e.g., 29ABCDE1234F1Z5)"
                              value={formData.gstNumber}
                              onChange={(e) =>
                                handleInputChange("gstNumber", e.target.value)
                              }
                              onBlur={() => handleBlur("gstNumber")}
                              maxLength={15}
                              required
                              className={`h-12 bg-background border-input focus:border-primary transition-all duration-200 rounded-lg ${borderClass(
                                "gstNumber"
                              )}`}
                            />
                            {renderValidationStatus("gstNumber")}
                          </div>
                        </div>
                          <div className="space-y-4">
  <Label className="text-sm font-medium text-foreground">
    Company Logo (Optional)
  </Label>
  <div className="flex items-center gap-4">
    <div 
  className="relative"
  onMouseEnter={() => setIsLogoHovered(true)}
  onMouseLeave={() => setIsLogoHovered(false)}
>
  <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
    {companyLogo ? (
      <>
        <img 
          src={companyLogo} 
          alt="Company logo" 
          className="w-full h-full object-contain"
        />
        {/* Only show delete icon when specifically hovering over the logo container */}
        {isLogoHovered && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteLogo();
            }}
            className="absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity"
          >
            <X className="h-8 w-8 text-white" />
          </button>
        )}
      </>
    ) : (
      <ImageIcon className="h-8 w-8 text-gray-400" />
    )}
  </div>
  
  {/* Color palette preview */}
  {extractedColors.length > 0 && (
    <div className="absolute -bottom-2 left-0 right-0 flex justify-center gap-0.5">
      {extractedColors.map((color, index) => (
        <div 
          key={index}
          className="w-4 h-4 rounded-full border border-gray-200"
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
    </div>
  )}
</div>
    
    <div className="flex-1">
      <Label
        htmlFor="logo-upload"
        className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <Upload className="w-8 h-8 mb-2 text-gray-500" />
          <p className="mb-1 text-sm text-gray-500">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">
            SVG, PNG, JPG (MAX. 2MB)
          </p>
        </div>
        <Input 
          id="logo-upload" 
          type="file" 
          className="hidden" 
          accept="image/*"
          onChange={handleLogoUpload}
          disabled={isUploading}
        />
      </Label>
    </div>
  </div>
  
  {isUploading && (
    <p className="text-xs text-muted-foreground">
      Uploading and processing image...
    </p>
  )}

  {isGeneratingThemes && (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      Generating custom themes from your logo...
    </div>
  )}
</div>
                      </div>
                    )}
                  </div>

                  {/* Theme Selection */}
                 {/* Theme Selection */}
{extractedColors.length > 0 && generatedThemes.length > 0 && (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
      Choose Your CRM Theme
    </h3>

    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {generatedThemes.map((theme, index) => (
          <div
            key={index}
            className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
              selectedTheme === theme
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleThemeSelect(theme)}
          >
            {/* Theme Preview */}
            <div className="mb-3">
              <div 
                className="h-20 rounded-md p-3 mb-2"
                style={{ backgroundColor: theme.brandSettings.backgroundColor }}
              >
                <div 
                  className="h-6 rounded mb-2"
                  style={{ backgroundColor: theme.brandSettings.headerBgColor }}
                />
                <div className="flex gap-2">
                  <div 
                    className="h-3 w-1/3 rounded"
                    style={{ backgroundColor: theme.brandSettings.primaryColor }}
                  />
                  <div 
                    className="h-3 w-1/4 rounded"
                    style={{ backgroundColor: theme.brandSettings.secondaryColor }}
                  />
                </div>
              </div>
              
              {/* Color Palette */}
              <div className="flex gap-1 mb-2">
                <div 
                  className="w-4 h-4 rounded-full border"
                  style={{ backgroundColor: theme.brandSettings.primaryColor }}
                  title="Primary Color"
                />
                <div 
                  className="w-4 h-4 rounded-full border"
                  style={{ backgroundColor: theme.brandSettings.secondaryColor }}
                  title="Secondary Color"
                />
                <div 
                  className="w-4 h-4 rounded-full border"
                  style={{ backgroundColor: theme.brandSettings.headerBgColor }}
                  title="Header Background"
                />
                <div 
                  className="w-4 h-4 rounded-full border"
                  style={{ backgroundColor: theme.topBanner.backgroundColor }}
                  title="Banner Background"
                />
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-3">
              {theme.description}
            </p>

            {selectedTheme === theme && (
              <div className="absolute top-2 right-2">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedTheme && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setPreviewTheme(selectedTheme);
              setPreviewModalOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Preview Login Page
          </Button>
        </div>
      )}
    </div>
  </div>
)}

                  <Button
                    type="submit"
                    disabled={!isFormValid || isLoading || (extractedColors.length > 0 && !selectedTheme)}
               
                    className={`w-full h-12 bg-brand-primary hover:bg-brand-primary/90 text-text-white font-semibold transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 disabled:opacity-50 shadow-subtle rounded-lg ${
                      !isFormValid || isLoading || (extractedColors.length > 0 && !selectedTheme) ? "btn-disabled" : ""
                     
                    }`}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin"></div>
                        Creating Account...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Create Account
                      </div>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Additional Links */}
            <div className="text-center space-y-4 pb-8">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  onClick={() => router.push("/login")}
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Sign In
                </button>
              </p>

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
          </div>
        </div>
      </div>

      {/* CRM Preview Modal */}
     {previewModalOpen && previewTheme && (
  <ThemePreviewModal 
    theme={previewTheme} 
    onClose={() => {
      setPreviewModalOpen(false);
      setPreviewTheme(null);
    }} 
  />
)}
    </div>
  );
}