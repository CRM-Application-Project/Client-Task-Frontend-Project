"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { registerUser } from "../services/data.service";

export default function RegisterPage() {
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

  const [fieldErrors, setFieldErrors] = useState({
    emailAddress: "",
    password: "",
    companyEmailAddress: "",
    companyContactNumber: "",
    gstNumber: "",
  });

  const [touchedFields, setTouchedFields] = useState({
    emailAddress: false,
    password: false,
    companyEmailAddress: false,
    companyContactNumber: false,
    gstNumber: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCompanyInfo, setShowCompanyInfo] = useState(false);
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

  // Password pattern regex
  const PASSWORD_REGEX =
    /^(?=.*[0-9])(?=.*[A-Z])(?=.*[a-z])(?=.*[@#$%^&+=!]).{8,}$/;

  // GST number pattern (15 alphanumeric characters)
  const GST_REGEX =
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;

  // Validate individual fields in real-time
  interface ValidationErrors {
    emailAddress: string;
    password: string;
    companyEmailAddress: string;
    companyContactNumber: string;
    gstNumber: string;
  }

  type FieldName = keyof ValidationErrors;

  const validateField = (fieldName: FieldName, value: string): string => {
    let error: string = "";

    switch (fieldName) {
      case "emailAddress":
      case "companyEmailAddress":
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = "Please enter a valid email address";
        }
        break;
      case "password":
        if (value && !PASSWORD_REGEX.test(value)) {
          error =
            "Password must be at least 8 characters long, contain uppercase, lowercase, number, and special character (@#$%^&+=!)";
        }
        break;
      case "companyContactNumber":
        if (value && !/^\d{10}$/.test(value)) {
          error = "Phone number must be exactly 10 digits";
        }
        break;
      case "gstNumber":
        if (value && !GST_REGEX.test(value)) {
          error =
            "Please enter a valid GST number (15 alphanumeric characters)";
        }
        break;
      default:
        break;
    }

    return error;
  };

  // Check if all required fields are filled and valid
  const checkFormValidity = () => {
    // Check personal info first
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.emailAddress ||
      !formData.password
    ) {
      return false;
    }

    // Validate email
    const emailError = validateField("emailAddress", formData.emailAddress);
    if (emailError || fieldErrors.emailAddress) return false;

    // Validate password
    const passwordError = validateField("password", formData.password);
    if (passwordError || fieldErrors.password) return false;

    // ✅ Always validate company info, even if collapsed
    if (
      !formData.companyName ||
      !formData.companyType ||
      !formData.companyEmailAddress ||
      !formData.companyContactNumber ||
      !formData.gstNumber
    ) {
      return false;
    }

    const companyEmailError = validateField(
      "companyEmailAddress",
      formData.companyEmailAddress
    );
    if (companyEmailError || fieldErrors.companyEmailAddress) return false;

    const contactError = validateField(
      "companyContactNumber",
      formData.companyContactNumber
    );
    if (contactError || fieldErrors.companyContactNumber) return false;

    const gstError = validateField("gstNumber", formData.gstNumber);
    if (gstError || fieldErrors.gstNumber) return false;

    return true;
  };

  const validateForm = () => {
    const errors = {
      emailAddress: validateField("emailAddress", formData.emailAddress),
      password: validateField("password", formData.password),
      companyEmailAddress: showCompanyInfo
        ? validateField("companyEmailAddress", formData.companyEmailAddress)
        : "",
      companyContactNumber: showCompanyInfo
        ? validateField("companyContactNumber", formData.companyContactNumber)
        : "",
      gstNumber: showCompanyInfo
        ? validateField("gstNumber", formData.gstNumber)
        : "",
    };

    setFieldErrors(errors);
    setTouchedFields({
      emailAddress: true,
      password: true,
      companyEmailAddress: showCompanyInfo, // Only mark as touched if section is expanded
      companyContactNumber: showCompanyInfo, // Only mark as touched if section is expanded
      gstNumber: showCompanyInfo, // Only mark as touched if section is expanded
    });

    // Check if there are any errors
    const hasErrors = Object.values(errors).some((error) => error !== "");

    return !hasErrors;
  };

  // Update touched fields
  const handleBlur = (fieldName: FieldName): void => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));

    // Validate the field when it loses focus
    const error = validateField(fieldName, formData[fieldName]);
    setFieldErrors((prev) => ({ ...prev, [fieldName]: error }));
  };

  // Update field errors when form data changes
  useEffect(() => {
    setIsFormValid(checkFormValidity());
  }, [
    formData.firstName,
    formData.lastName,
    formData.emailAddress,
    formData.password,
    formData.companyName,
    formData.companyType,
    formData.companyEmailAddress,
    formData.companyContactNumber,
    formData.gstNumber,
    touchedFields.emailAddress,
    touchedFields.password,
    touchedFields.companyEmailAddress,
    touchedFields.companyContactNumber,
    touchedFields.gstNumber,
    fieldErrors.emailAddress,
    fieldErrors.password,
    fieldErrors.companyEmailAddress,
    fieldErrors.companyContactNumber,
    fieldErrors.gstNumber,
    showCompanyInfo, // Add this to the dependency array
  ]);

  // const validateForm = () => {
  //   const errors = {
  //     emailAddress: validateField("emailAddress", formData.emailAddress),
  //     password: validateField("password", formData.password),
  //     companyEmailAddress: showCompanyInfo
  //       ? validateField("companyEmailAddress", formData.companyEmailAddress)
  //       : "",
  //     companyContactNumber: showCompanyInfo
  //       ? validateField("companyContactNumber", formData.companyContactNumber)
  //       : "",
  //     gstNumber: showCompanyInfo
  //       ? validateField("gstNumber", formData.gstNumber)
  //       : "",
  //   };

  //   setFieldErrors(errors);
  //   setTouchedFields({
  //     emailAddress: true,
  //     password: true,
  //     companyEmailAddress: true,
  //     companyContactNumber: true,
  //     gstNumber: true,
  //   });

  //   // Check if there are any errors
  //   const hasErrors = Object.values(errors).some((error) => error !== "");

  //   return !hasErrors;
  // };

  // Define type for form data fields
  interface FormData {
    firstName: string;
    lastName: string;
    emailAddress: string;
    password: string;
    companyName: string;
    companyEmailAddress: string;
    companyContactNumber: string;
    gstNumber: string;
    companyType: string;
  }

  // Define a type for the field names
  type FormFieldName = keyof FormData;

  const handleInputChange = (field: FormFieldName, value: string): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  interface RegisterResponse {
    isSuccess: boolean;
    data?: {
      message?: string;
    };
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
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Prepare the registration data
      const registerData: RegisterData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        emailAddress: formData.emailAddress,
        password: formData.password,
        companyName: formData.companyName,
        companyEmailAddress: formData.companyEmailAddress,
        companyContactNumber: formData.companyContactNumber,
        gstNumber: formData.gstNumber,
      };

      // Call the registration API
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
          error.message ||
          "An unexpected error occurred. Please try again later.",
        variant: "destructive",
      });
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to render validation status
  const renderValidationStatus = (
    fieldName: keyof ValidationErrors
  ): React.ReactNode => {
    if (!touchedFields[fieldName]) return null;

    if (fieldErrors[fieldName]) {
      return (
        <div className="flex items-center gap-1 mt-1 text-destructive text-xs">
          <AlertCircle className="h-3 w-3" />
          <span>{fieldErrors[fieldName]}</span>
        </div>
      );
    } else if (formData[fieldName as keyof FormData]) {
      return (
        <div className="flex items-center gap-1 mt-1 text-green-600 text-xs">
          <CheckCircle className="h-3 w-3" />
          <span>valid</span>
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

        {/* Overlay */}
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
                          required
                          className="h-12 bg-background border-input focus:border-primary transition-all duration-200 rounded-lg"
                        />
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
                          required
                          className="h-12 bg-background border-input focus:border-primary transition-all duration-200 rounded-lg"
                        />
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
                        className={`h-12 bg-background border-input focus:border-primary transition-all duration-200 rounded-lg ${
                          touchedFields.emailAddress && fieldErrors.emailAddress
                            ? "border-destructive"
                            : touchedFields.emailAddress &&
                              !fieldErrors.emailAddress &&
                              formData.emailAddress
                            ? "border-green-500"
                            : ""
                        }`}
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
                          className={`h-12 pr-12 bg-background border-input focus:border-primary transition-all duration-200 rounded-lg ${
                            touchedFields.password && fieldErrors.password
                              ? "border-destructive"
                              : touchedFields.password &&
                                !fieldErrors.password &&
                                formData.password
                              ? "border-green-500"
                              : ""
                          }`}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {renderValidationStatus("password")}
                      {/* {!fieldErrors.password && formData.password && (
                        <div className="mt-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span>At least 8 characters</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span>Contains uppercase letter</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span>Contains lowercase letter</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span>Contains number</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span>Contains special character (@#$%^&+=!)</span>
                          </div>
                        </div>
                      )} */}
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
                            required
                            className="h-12 bg-background border-input focus:border-primary transition-all duration-200 rounded-lg"
                          />
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
                            required
                            className="flex h-12 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">Select company type</option>
                            {companyTypes.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
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
                            className={`h-12 bg-background border-input focus:border-primary transition-all duration-200 rounded-lg ${
                              touchedFields.companyEmailAddress &&
                              fieldErrors.companyEmailAddress
                                ? "border-destructive"
                                : touchedFields.companyEmailAddress &&
                                  !fieldErrors.companyEmailAddress &&
                                  formData.companyEmailAddress
                                ? "border-green-500"
                                : ""
                            }`}
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
                              onChange={(e) => {
                                let value = e.target.value.replace(/\D/g, "");
                                handleInputChange(
                                  "companyContactNumber",
                                  value
                                );
                              }}
                              onBlur={() => handleBlur("companyContactNumber")}
                              required
                              className={`h-12 bg-background border-input focus:border-primary transition-all duration-200 rounded-lg ${
                                touchedFields.companyContactNumber &&
                                fieldErrors.companyContactNumber
                                  ? "border-destructive"
                                  : touchedFields.companyContactNumber &&
                                    !fieldErrors.companyContactNumber &&
                                    formData.companyContactNumber
                                  ? "border-green-500"
                                  : ""
                              }`}
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
                                handleInputChange(
                                  "gstNumber",
                                  e.target.value.toUpperCase()
                                )
                              }
                              onBlur={() => handleBlur("gstNumber")}
                              maxLength={15}
                              minLength={15}
                              required
                              className={`h-12 bg-background border-input focus:border-primary transition-all duration-200 rounded-lg ${
                                touchedFields.gstNumber && fieldErrors.gstNumber
                                  ? "border-destructive"
                                  : touchedFields.gstNumber &&
                                    !fieldErrors.gstNumber &&
                                    formData.gstNumber
                                  ? "border-green-500"
                                  : ""
                              }`}
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
                    className={`w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 disabled:opacity-50 shadow-subtle rounded-lg ${
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
