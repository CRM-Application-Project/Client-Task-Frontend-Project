"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { FetchLeadTrackResponse } from "@/lib/data";
import { fetchLeadTrackById, getLeadById } from "@/app/services/data.service";
import { useToast } from "@/hooks/use-toast";
import LeadDetailView from "@/components/leads/LeadDetailView";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

interface Lead {
  leadId: string;
  leadStatus: string;
  leadSource: string;
  leadAddedBy: string;
  leadAssignedTo: string | null;
  companyName: string | null;
  companyEmailAddress: string;
  customerMobileNumber: string;
  customerEmailAddress: string;
  customerName: string;
  leadPriority: LeadPriority;
  leadLabel: string;
  leadReference: string;
  leadAddress: string;
  comment: string;
  leadFollowUp: string;
  nextFollowUpDate: string | null;
  createdAt: string;
  updatedAt: string;
  assignedToName?: string;
}

const LeadDetailPage = () => {
  const params = useParams();
  const leadId = params.leadId as string;
  const [lead, setLead] = useState<Lead | null>(null);
  const [leadTracks, setLeadTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // Use refs to track if requests are in progress
  const isInitialLoadingRef = useRef(false);
  const isRefreshingRef = useRef(false);

  // Memoized function to fetch lead tracking data
  const fetchLeadTracking = useCallback(async (id: string) => {
    try {
      const trackResponse: FetchLeadTrackResponse = await fetchLeadTrackById(id);
      if (trackResponse.isSuccess) {
        setLeadTracks(trackResponse.data);
      } else {
        toast({
          title: "Error",
          description: "Failed to load lead activity history",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching lead tracking:", error);
      toast({
        title: "Error",
        description: "Failed to load lead activity history",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Memoized function to fetch initial lead data
  const fetchLeadData = useCallback(async () => {
    // Prevent multiple simultaneous initial loads
    if (isInitialLoadingRef.current) return;
    
    try {
      isInitialLoadingRef.current = true;
      setLoading(true);
      
      // Fetch lead details
      const leadResponse = await getLeadById(leadId);
      if (leadResponse.isSuccess && leadResponse.data) {
        setLead(leadResponse.data);
        
        // Fetch lead tracking data
        await fetchLeadTracking(leadId);
      } else {
        toast({
          title: "Error",
          description: "Lead not found",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching lead data:", error);
      toast({
        title: "Error",
        description: "Failed to load lead data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      isInitialLoadingRef.current = false;
    }
  }, [leadId, toast, fetchLeadTracking]);

  // Memoized refresh function
  const refreshActivityHistory = useCallback(async () => {
    // Prevent multiple simultaneous refreshes
    if (isRefreshingRef.current) return;
    
    try {
      isRefreshingRef.current = true;
      await fetchLeadTracking(leadId);
    } catch (error) {
      console.error("Error refreshing activity history:", error);
      toast({
        title: "Error",
        description: "Failed to refresh activity history",
        variant: "destructive",
      });
    } finally {
      isRefreshingRef.current = false;
    }
  }, [leadId, fetchLeadTracking, toast]);

  useEffect(() => {
    // Only fetch if leadId exists and we haven't already started loading
    if (leadId && !isInitialLoadingRef.current) {
      fetchLeadData();
    }
  }, [leadId, fetchLeadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Lead not found</p>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div>
        <LeadDetailView 
          lead={lead} 
          leadTracks={leadTracks} 
          onRefresh={refreshActivityHistory} 
        />
      </div>
    </DashboardLayout>
  );
};

export default LeadDetailPage;