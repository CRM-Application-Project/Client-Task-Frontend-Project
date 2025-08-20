"use client";

import { ArrowRightIcon, LogInIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function NotFound() {
  const handleGoBack = () => {
    if (typeof window !== "undefined") {
      window.history.back();
    }
  };

  const handleLoginRedirect = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-6xl w-full flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Left side - Text content */}
        <div className="flex-1 max-w-md order-2 md:order-1">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Ooops...</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-6">
            Page not found
          </h2>
          <p className="text-gray-500 mb-8 text-sm">
            Please log in with appropriate credentials or contact your administrator if you believe this is an error.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* <Button onClick={handleGoBack} variant="outline" className="flex items-center gap-2">
              Go Back
              <ArrowRightIcon className="w-4 h-4" />
            </Button> */}
            <Button onClick={handleLoginRedirect} className="flex items-center gap-2">
              Go to Login
              <LogInIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Right side - Illustration */}
        <div className="flex-1 max-w-md order-1 md:order-2">
          <Image
            src="/404.png"
            alt="Access denied illustration"
            width={500}
            height={400}
            className="w-full h-auto"
          />
        </div>
      </div>
    </div>
  );
}