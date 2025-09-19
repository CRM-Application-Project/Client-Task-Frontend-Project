import { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Eye,
  EyeOff,
  X,
  LogIn, 
  Mail
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

interface LoginPreviewProps {
  theme: ThemePalette;
  companyLogo?: string | null;
  companyName?: string;
  onClose: () => void;
}

export default function LoginPreview({ 
  theme, 
  companyLogo, 
  companyName,
  onClose 
}: LoginPreviewProps) {
  const [previewEmail, setPreviewEmail] = useState("");
  const [previewPassword, setPreviewPassword] = useState("");
  const [previewShowPassword, setPreviewShowPassword] = useState(false);
  const { toast } = useToast();
  
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Preview Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {companyLogo && (
            <Image 
              src={companyLogo} 
              alt="Logo" 
              width={32}
              height={32}
              className="h-8 w-8 object-contain rounded"
            />
          )}
          <span className="font-semibold text-lg text-gray-900">
            Theme Preview - {companyName || 'Your Company'} Login Page
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          Close Preview
        </Button>
      </div>

      {/* Login Preview Content */}
      <div className="flex-1 flex overflow-auto">
        {/* Left Side - Image (Matching your login page) */}
        <div className="w-1/2 relative hidden lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50">
            <Image
              src="/login.jpeg"
              alt="CRM Background"
              fill
              className="object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-primary/10" />
        </div>

        {/* Right Side - Login Form with Theme */}
        <div className="w-full lg:w-1/2 flex items-center justify-center pt-20 z-40 p-8 lg:pt-36 lg:pb-36 lg:pl-12 lg:pr-12 overflow-y-auto">
          <div className="w-full max-w-md space-y-8">
            {/* Logo and Branding */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center mb-4">
                {companyLogo && (
                  <Image 
                    src={companyLogo} 
                    alt="Company Logo" 
                    width={64}
                    height={64}
                    className="h-16 w-16 object-contain rounded-lg"
                  />
                )}
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold" style={{ color: theme.brandSettings.textColor }}>
                  Welcome Back
                </h2>
                <p className="text-muted-foreground" style={{ color: theme.brandSettings.textColor + '80' }}>
                  Please sign in to {companyName || 'your account'} to continue
                </p>
              </div>
            </div>

            {/* Login Form */}
            <Card 
              className="border shadow-elevated animate-scale-in rounded-xl"
              style={{ 
                borderColor: theme.brandSettings.primaryColor + '30',
                backgroundColor: theme.brandSettings.backgroundColor
              }}
            >
              <CardContent className="p-8">
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
                      <Mail 
                        className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" 
                        style={{ color: theme.brandSettings.textColor + '60' }}
                      />
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
                        className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                        style={{ color: theme.brandSettings.textColor + '60' }}
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
                        className="rounded border-input focus:ring-offset-0"
                        style={{ 
                          borderColor: theme.brandSettings.primaryColor + '30',
                          accentColor: theme.brandSettings.primaryColor
                        }}
                      />
                      <span style={{ color: theme.brandSettings.textColor + '80' }}>Remember me</span>
                    </label>
                    <button
                      type="button"
                      className="font-medium transition-colors hover:underline"
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
                      Sign In to {companyName || 'Your CRM'}
                    </div>
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Theme Description */}
            <div 
              className="p-4 rounded-lg text-center"
              style={{ 
                backgroundColor: theme.topBanner.backgroundColor + '10',
                borderColor: theme.brandSettings.primaryColor + '20'
              }}
            >
              <p className="text-sm" style={{ color: theme.brandSettings.textColor }}>
                {theme.description}
              </p>
            </div>

            {/* Theme Confirmation Button */}
            <div className="flex justify-center pt-6 border-t" style={{ borderColor: theme.brandSettings.primaryColor + '20' }}>
              <Button
                onClick={() => {
                  onClose();
                  toast({
                    title: "Theme Confirmed",
                    description: "Your selected theme is ready for registration",
                  });
                }}
                className="px-8"
                style={{ 
                  backgroundColor: theme.brandSettings.primaryColor,
                  color: theme.brandSettings.headerTextColor
                }}
              >
                Confirm This Theme
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};