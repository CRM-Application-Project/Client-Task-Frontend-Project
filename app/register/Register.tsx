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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { registerUser } from "../services/data.service";
// @ts-ignore

import ColorThief from "color-thief-browser";

export default function RegisterPage() {
  // ---------- CONSTANTS (Validation) ----------
  const NAME_REGEX = /^[A-Za-z ]+$/; // letters & spaces only
  const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/; // general-purpose email format
  const PASSWORD_REGEX =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/; // >=8, upper, lower, digit, special
  const PHONE_REGEX = /^\d{10}$/; // exactly 10 digits
  const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/; // 15-char Indian GSTIN

  // ---------- DATA ----------
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    emailAddress: "",
    password: "",
    companyName: "",
    companyEmailAddress: "",
    companyContactNumber: "",
    gstNumber: "",
    companyType: "",
  });

  // New state for logo and colors
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  interface ValidationErrors {
    firstName: string;
    lastName: string;
    emailAddress: string;
    password: string;
    companyName: string;
    companyType: string;
    companyEmailAddress: string;
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
    companyType: "",
    companyEmailAddress: "",
    companyContactNumber: "",
    gstNumber: "",
  });

  const [touchedFields, setTouchedFields] = useState<
    Record<FieldName, boolean>
  >({
    firstName: false,
    lastName: false,
    emailAddress: false,
    password: false,
    companyName: false,
    companyType: false,
    companyEmailAddress: false,
    companyContactNumber: false,
    gstNumber: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCompanyInfo, setShowCompanyInfo] = useState(true);
  const [isFormValid, setIsFormValid] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const companyTypes = [
    "Private Limited",
    "Public Limited",
    "LLP (Limited Liability Partnership)",
    "Partnership",
    "Sole Proprietorship",
    "Government",
    "Non-Profit",
  ];

  // ---------- LOGO UPLOAD HANDLING ----------
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.match('image.*')) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 2MB)
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
      
      // Extract colors from the image
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

  const extractColorsFromImage = (imageSrc: string) => {
    const img = new globalThis.Image();
    img.crossOrigin = "Anonymous"; // Enable CORS for the image
    img.src = imageSrc;
    
    img.onload = () => {
      try {
        const colorThief = new ColorThief();
        const colorPalette = colorThief.getPalette(img, 5); // Get 5 dominant colors
        
        // Convert RGB arrays to hex strings
        const hexColors: string[] = colorPalette.map((rgb: [number, number, number]) => 
          `#${rgb.map((c: number) => c.toString(16).padStart(2, '0')).join('')}`
        );
        
        setExtractedColors(hexColors);
        
        // Store in localStorage
        localStorage.setItem('companyLogo', imageSrc);
        localStorage.setItem('companyColors', JSON.stringify(hexColors));
        
        // Also log to console
        console.log('Extracted colors:', hexColors);
        
        toast({
          title: "Logo Uploaded",
          description: `Extracted ${hexColors.length} colors from your logo`,
        });
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
      case "companyEmailAddress":
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
      case "companyType":
        if (!value.trim()) return "Select a company type";
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
      validateField("companyType", formData.companyType) === "" &&
      validateField("companyEmailAddress", formData.companyEmailAddress) ===
        "" &&
      validateField("companyContactNumber", formData.companyContactNumber) ===
        "" &&
      validateField("gstNumber", formData.gstNumber) === ""
    );
  }, [
    formData.companyName,
    formData.companyType,
    formData.companyEmailAddress,
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
    | "companyEmailAddress"
    | "companyContactNumber"
    | "gstNumber"
    | "companyType";

  const handleInputChange = (field: FormFieldName, rawValue: string): void => {
    let value = rawValue;

    // While typing: normalize certain fields
    if (field === "emailAddress" || field === "companyEmailAddress") {
      value = value.trimStart(); // allow trimming start whitespace
    }

    if (field === "companyContactNumber") {
      value = value.replace(/\D/g, "").slice(0, 10); // digits only, max 10
    }

    if (field === "gstNumber") {
      value = value.toUpperCase().slice(0, 15); // uppercase, max 15
    }

    setFormData((prev) => ({ ...prev, [field]: value }));

    // mark as touched on first interaction
    if (!touchedFields[field as FieldName]) {
      setTouchedFields((prev) => ({ ...prev, [field]: true }));
    }

    // live-validate while typing
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
  interface RegisterResponse {
    isSuccess: boolean;
    data?: { message?: string };
    message?: string;
  }

  interface RegisterData {
    firstName: string;
    lastName: string;
    emailAddress: string;
    password: string;
    companyName: string;
    companyEmailAddress: string;
    companyContactNumber: string;
    gstNumber: string;
  }

  const handleRegister = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    // Force-validate all fields on submit
    const allFields: FieldName[] = [
      "firstName",
      "lastName",
      "emailAddress",
      "password",
      "companyName",
      "companyType",
      "companyEmailAddress",
      "companyContactNumber",
      "gstNumber",
    ];

    setTouchedFields((prev) => {
      const next = { ...prev };
      allFields.forEach((f) => (next[f] = true));
      return next;
    });

    validateMany(allFields);

    // compute validity after forced validation
    const canSubmit =
      allFields.every((f) => validateField(f, (formData as any)[f]) === "") &&
      personalValid &&
      companyValid;

    if (!canSubmit) return;

    setIsLoading(true);
    try {
      const registerData: RegisterData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        emailAddress: formData.emailAddress.trim(),
        password: formData.password,
        companyName: formData.companyName.trim(),
        companyEmailAddress: formData.companyEmailAddress.trim(),
        companyContactNumber: formData.companyContactNumber,
        gstNumber: formData.gstNumber,
      };

      const response: RegisterResponse = await registerUser(registerData);

      if (response.isSuccess) {
        toast({
          title: "Registration Successful",
          description:
            response.data?.message ||
            "Your account has been created successfully!",
        });
        router.push("/login");
      } else {
        toast({
          title: "Registration Failed",
          description:
            response.message || "Please check your information and try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.message ||
          "An unexpected error occurred. Please try again later.",
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
                        <div className="space-y-4">
                          <Label className="text-sm font-medium text-foreground">
                            Company Logo
                          </Label>
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                                {companyLogo ? (
                                  <img 
                                    src={companyLogo} 
                                    alt="Company logo" 
                                    className="w-full h-full object-contain"
                                  />
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
                        </div>

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

                        <div className="space-y-2">
                          <Label
                            htmlFor="companyType"
                            className="text-sm font-medium text-foreground"
                          >
                            Company Type
                          </Label>
                          <select
                            id="companyType"
                            value={formData.companyType}
                            onChange={(e) =>
                              handleInputChange("companyType", e.target.value)
                            }
                            onBlur={() => handleBlur("companyType")}
                            required
                            className={`flex h-12 w-full rounded-lg border px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-background ${borderClass(
                              "companyType"
                            )}`}
                          >
                            <option value="">Select company type</option>
                            {companyTypes.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                          {renderValidationStatus("companyType")}
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="companyEmailAddress"
                            className="text-sm font-medium text-foreground"
                          >
                            Company Email Address
                          </Label>
                          <Input
                            id="companyEmailAddress"
                            type="email"
                            placeholder="Enter company email address"
                            value={formData.companyEmailAddress}
                            onChange={(e) =>
                              handleInputChange(
                                "companyEmailAddress",
                                e.target.value
                              )
                            }
                            onBlur={() => handleBlur("companyEmailAddress")}
                            required
                            className={`h-12 bg-background border-input focus:border-primary transition-all duration-200 rounded-lg ${borderClass(
                              "companyEmailAddress"
                            )}`}
                          />
                          {renderValidationStatus("companyEmailAddress")}
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
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={!isFormValid || isLoading}
                    className={`w-full h-12 bg-brand-primary hover:bg-brand-primary/90 text-text-white font-semibold transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 disabled:opacity-50 shadow-subtle rounded-lg ${
                      !isFormValid || isLoading ? "btn-disabled" : ""
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
    </div>
  );
}