"use client";
import { useState, useEffect } from "react";
import { updateTimesheetMode } from "@/app/services/data.service";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function ChangeModePage() {
  const [mode, setMode] = useState<"BUTTON" | "FORM" | "DISABLED">("BUTTON");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleModeChange = async (newMode: "BUTTON" | "FORM" | "DISABLED") => {
    setMode(newMode);
    setLoading(true);
    setMessage(null);
    try {
      const res = await updateTimesheetMode(newMode);
      setMessage(res.message || (res.isSuccess ? "Mode updated successfully" : "Failed to update mode"));
    } catch (err) {
      setMessage("Error updating mode");
    } finally {
      setLoading(false);
    }
  };

  const handleRadioChange = (option: "BUTTON" | "FORM" | "DISABLED") => {
    handleModeChange(option);
  };

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Timesheet Mode</h2>
        
        {/* Enhanced Mode Selection Cards */}
        <div className="space-y-4 mb-8">
          <div 
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
              mode === "BUTTON" 
                ? "border-blue-500 bg-blue-50 shadow-md shadow-blue-100 ring-2 ring-blue-100" 
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            } ${loading ? "opacity-50 pointer-events-none" : ""}`}
            onClick={() => handleRadioChange("BUTTON")}
          >
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                mode === "BUTTON" 
                  ? "border-blue-500 bg-blue-500 shadow-inner" 
                  : "border-gray-400 bg-white"
              }`}>
                {mode === "BUTTON" && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${
                    mode === "BUTTON" ? "text-blue-900" : "text-gray-900"
                  }`}>
                    Button Mode
                  </span>
                  {mode === "BUTTON" && (
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <p className={`text-sm mt-1 ${
                  mode === "BUTTON" ? "text-blue-700" : "text-gray-600"
                }`}>
                  Simple button interface for quick entries
                </p>
              </div>
            </div>
          </div>
          
          <div 
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
              mode === "FORM" 
                ? "border-green-500 bg-green-50 shadow-md shadow-green-100 ring-2 ring-green-100" 
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            } ${loading ? "opacity-50 pointer-events-none" : ""}`}
            onClick={() => handleRadioChange("FORM")}
          >
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                mode === "FORM" 
                  ? "border-green-500 bg-green-500 shadow-inner" 
                  : "border-gray-400 bg-white"
              }`}>
                {mode === "FORM" && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${
                    mode === "FORM" ? "text-green-900" : "text-gray-900"
                  }`}>
                    Form Mode
                  </span>
                  {mode === "FORM" && (
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <p className={`text-sm mt-1 ${
                  mode === "FORM" ? "text-green-700" : "text-gray-600"
                }`}>
                  Detailed form for comprehensive time tracking
                </p>
              </div>
            </div>
          </div>

        {/* Enhanced Quick Action Buttons */}
        <div className="flex gap-3 mb-6">
          <Button 
            onClick={() => handleModeChange("BUTTON")}
            disabled={loading || mode === "BUTTON"}
            variant={mode === "BUTTON" ? "default" : "outline"}
            className={`flex-1 transition-all ${
              mode === "BUTTON" 
                ? "shadow-lg shadow-blue-200 border-blue-300 bg-brand-primary text-white    " 
                : ""
            }`}
          >
            {mode === "BUTTON" ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Button Mode Active
              </span>
            ) : (
              "Switch to Button Mode"
            )}
          </Button>
          <Button 
            onClick={() => handleModeChange("FORM")}
            disabled={loading || mode === "FORM"}
            variant={mode === "FORM" ? "default" : "outline"}
            className={`flex-1 transition-all ${
              mode === "FORM" 
                ? "  shadow-lg shadow-green-200 border-blue-300 bg-brand-primary text-white  " 
                : ""
            }`}
          >
            {mode === "FORM" ? (
              <span className="flex items-center gap-2 border-green-300">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Form Mode Active
              </span>
            ) : (
              "Switch to Form Mode"
            )}
          </Button>
        </div>

        {/* Enhanced Status Indicators */}
        {loading && (
          <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 rounded-lg mb-4 border border-blue-200">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-blue-800 font-medium">Updating mode...</span>
          </div>
        )}
        
        {message && (
          <div className={`p-4 rounded-lg border-2 mb-4 transition-all duration-300 ${
            message.includes("Error") || message.includes("Failed") 
              ? "bg-red-50 text-red-800 border-red-200 shadow-sm" 
              : "bg-green-50 text-green-800 border-green-200 shadow-sm"
          }`}>
            <div className="flex items-center justify-center gap-2 font-medium">
              {message.includes("Error") || message.includes("Failed") ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {message}
            </div>
          </div>
        )}
        
        {/* Enhanced Current Status Display */}
        <div className="text-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
          <div className="inline-flex items-center gap-3 px-4 py-3 rounded-full bg-white shadow-sm border">
            <div className={`w-3 h-3 rounded-full animate-pulse ${
              mode === "BUTTON" ?"":
              mode === "FORM" ? "" :
              "bg-red-500"
            }`}></div>
            <span className="text-gray-600">Current Mode:</span>
            <span className={`font-bold text-lg ${
              mode === "BUTTON" ? "text-black" :
              mode === "FORM" ? "text-black" :
              "text-red-600"
            }`}>
              {mode.charAt(0) + mode.slice(1).toLowerCase()} Mode
            </span>
          </div>
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
}