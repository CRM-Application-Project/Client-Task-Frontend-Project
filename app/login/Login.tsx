"use client";
import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, LogIn, Building2, Users, TrendingUp, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { loginUser, verifyUser } from '../services/data.service';


interface VerifyUserResponse {
  isSuccess: boolean;
  message: string;
  data: {
    tenantToken: string | null;
    accessRegion: string;
    deviceType: string;
  };
}

interface LoginRequestData {
  emailAddress: string;
  password: string;
  deviceType: string;
  accessRegion: string;
}

interface LoginResponse {
  isSuccess: boolean;
  message: string;
  data: {
    profileResponse: {
      firstName: string;
      lastName: string;
      emailAddress: string;
      phoneNumber: string | null;
      password: string;
      userRole: string;
    };
    authTokenResponse: {
      token: string | null;
      refreshToken: string | null;
    };
  };
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [accessRegion, setAccessRegion] = useState('public');
  const { toast } = useToast();
  const router = useRouter();

  const handleEmailBlur = async () => {
    if (!email) return;
    
    setIsLoading(true);
    try {
      const response: VerifyUserResponse = await verifyUser(email, 'web');
      
      if (response.isSuccess) {
        setIsEmailVerified(true);
        setAccessRegion(response.data.accessRegion);
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
    } catch (error) {
      setIsEmailVerified(false);
      toast({
        title: "Error",
        description: "An error occurred while verifying your email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailVerified) return;
    
    setIsLoading(true);
    
    try {
      const loginData: LoginRequestData = {
        emailAddress: email,
        password,
        deviceType: 'web',
        accessRegion
      };

      const response: LoginResponse = await loginUser(loginData);
      
      if (response.isSuccess) {
        toast({
          title: "Login successful",
          description: `Welcome back, ${response.data.profileResponse.firstName}!`,
          variant: "default",
        });
        
        // Store tokens and user data in localStorage or context
        localStorage.setItem('authToken', response.data.authTokenResponse.token || '');
        localStorage.setItem('refreshToken', response.data.authTokenResponse.refreshToken || '');
        localStorage.setItem('user', JSON.stringify(response.data.profileResponse));
        
        router.push('/leads');
      } else {
        toast({
          title: "Login failed",
          description: response.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during login",
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

      {/* Right Side - Login Form */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-12 animate-slide-in-right">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Branding */}
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                Welcome Back
              </h2>
              <p className="text-muted-foreground">
                Please sign in to your account to continue
              </p>
            </div>
          </div>

          {/* Login Form */}
          <Card className="border border-border shadow-elevated animate-scale-in">
            <CardContent className="p-8">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setIsEmailVerified(false);
                    }}
                    onBlur={handleEmailBlur}
                    required
                    className="h-12 bg-background border-input focus:border-primary transition-all duration-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={!isEmailVerified}
                      className={`h-12 pr-12 bg-background border-input focus:border-primary transition-all duration-200 ${
                        !isEmailVerified ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={!isEmailVerified}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors ${
                        !isEmailVerified ? 'cursor-not-allowed' : ''
                      }`}
                    >
                      {showPassword ? (
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
                    />
                    <span className="text-muted-foreground">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => router.push('/reset-password')}
                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !isEmailVerified}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 shadow-subtle"
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
            </CardContent>
          </Card>

          {/* Additional Links */}
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <button 
                onClick={() => router.push('/register')}
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Register
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
  );
}