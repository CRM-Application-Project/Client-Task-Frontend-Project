"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (leadId) {
      fetchLeadData();
    }
  }, [leadId]);

  const fetchLeadData = async () => {
    try {
      setLoading(true);
      
      // Fetch lead details
      const leadResponse = await getLeadById(leadId);
      if (leadResponse.isSuccess && leadResponse.data) {
        setLead(leadResponse.data);
        
        // Fetch lead tracking data
        const trackResponse: FetchLeadTrackResponse = await fetchLeadTrackById(leadId);
        if (trackResponse.isSuccess) {
          setLeadTracks(trackResponse.data);
        } else {
          toast({
            title: "Error",
            description: "Failed to load lead activity history",
            variant: "destructive",
          });
        }
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
    }
  };

  const refreshActivityHistory = async () => {
    try {
      // Only fetch lead tracking data without affecting the loading state
      const trackResponse: FetchLeadTrackResponse = await fetchLeadTrackById(leadId);
      if (trackResponse.isSuccess) {
        setLeadTracks(trackResponse.data);
      
      } else {
       
      }
    } catch (error) {
      console.error("Error refreshing activity history:", error);
      toast({
        title: "Error",
        description: "Failed to refresh activity history",
        variant: "destructive",
      });
    }
  };

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
        <LeadDetailView lead={lead} leadTracks={leadTracks} onRefresh={refreshActivityHistory} />
      </div>
    </DashboardLayout>
  );
};

export default LeadDetailPage;