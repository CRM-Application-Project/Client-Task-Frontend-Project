import React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Mail,
  Phone,
  MapPin,
  Building,
  User,
  Tag,
  MessageSquare,
  Hash,
  RefreshCw,
  History,
  Clock,
  ArrowRight,
  CheckCircle,
  XCircle,
  FileText,
  PhoneCall,
  MailIcon,
  ArrowLeft,
  Edit,
} from "lucide-react";
import { LeadTrack } from "@/lib/data";
import Link from "next/link";

interface Lead {
  leadId: string;
  leadStatus: string;
  leadSource: string;
  leadAddedBy: string;
  leadAssignedTo: string;
  customerMobileNumber: string;
  companyEmailAddress: string;
  customerName: string;
  customerEmailAddress: string;
  leadAddress: string;
  comment?: string;
  leadLabel?: string;
  leadReference?: string;
  leadPriority: LeadPriority;
  companyName?: string;
  company?: string;
  createdAt: string;
  updatedAt: string;
  assignedToName?: string;
}

interface LeadDetailViewProps {
  lead: Lead;
  leadTracks: LeadTrack[];
  onRefresh: () => void;
}

const LeadDetailView: React.FC<LeadDetailViewProps> = ({
  lead,
  leadTracks,
  onRefresh,
}) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "LOW":
        return "bg-gray-100 text-gray-800 border-gray-300";
      case "MEDIUM":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "HIGH":
        return "bg-orange-50 text-orange-800 border-orange-200";
      case "URGENT":
        return "bg-red-50 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "NEW":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "CONTACTED":
        return "bg-indigo-50 text-indigo-800 border-indigo-200";
      case "QUALIFIED":
        return "bg-green-50 text-green-800 border-green-200";
      case "PROPOSAL":
        return "bg-teal-50 text-teal-800 border-teal-200";
      case "DEMO":
        return "bg-yellow-50 text-yellow-800 border-yellow-200";
      case "NEGOTIATIONS":
        return "bg-orange-50 text-orange-800 border-orange-200";
      case "CLOSED_WON":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "CLOSED_LOST":
        return "bg-red-50 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const shouldDisplay = (value: any): boolean => {
    return value !== null && value !== undefined && value !== "";
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return dateString;
    }
  };

  const formatTrackDate = (dateString: string) => {
    let date: Date;
    
    if (/^\d+$/.test(dateString)) {
      const timestamp = parseInt(dateString);
      date = new Date(timestamp > 9999999999 ? timestamp : timestamp * 1000);
    } else {
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    }
  };

  const getActivityIcon = (actionDescription: string) => {
    const desc = actionDescription.toLowerCase();

    if (desc.includes("status"))
      return <RefreshCw className="h-4 w-4 text-blue-600" />;
    if (desc.includes("call"))
      return <PhoneCall className="h-4 w-4 text-green-600" />;
    if (desc.includes("email"))
      return <MailIcon className="h-4 w-4 text-indigo-600" />;
    if (desc.includes("note") || desc.includes("comment"))
      return <FileText className="h-4 w-4 text-amber-600" />;
    if (desc.includes("created"))
      return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    if (desc.includes("closed won"))
      return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    if (desc.includes("closed lost"))
      return <XCircle className="h-4 w-4 text-red-600" />;

    return <Clock className="h-4 w-4 text-gray-600" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header with back button and edit icon */}
      <div className="flex items-center justify-between p-6 border-b">
        <Link
          href="/leads"
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Leads
        </Link>
        
      
      </div>

      <div className="p-6">
        {/* Lead header with improved styling */}
        <div className="flex items-start justify-between gap-4 pb-6 border-b">
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 bg-blue-100">
                <AvatarFallback className="bg-blue-100 text-blue-600 font-medium text-lg">
                  {getInitials(lead.customerName)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                <div className={`h-3 w-3 rounded-full ${
                  lead.leadStatus === "CLOSED_WON" ? "bg-green-500" : 
                  lead.leadStatus === "CLOSED_LOST" ? "bg-red-500" : "bg-blue-500"
                }`} />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold text-gray-900">
                  {lead.customerName}
                </h2>
                <Badge className={`${getPriorityColor(lead.leadPriority)} border`}>
                  {lead.leadPriority}
                </Badge>
              </div>
              
              {shouldDisplay(lead.company) && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Building className="h-4 w-4" />
                  <span>{lead.company}</span>
                </div>
              )}
              
              <div className="flex gap-2 flex-wrap">
                <Badge className={`${getStatusColor(lead.leadStatus)} border`}>
                  {lead.leadStatus.replace("_", " ")}
                </Badge>
                
                {shouldDisplay(lead.leadSource) && (
                  <Badge variant="outline" className="text-gray-600">
                    {lead.leadSource.replace("_", " ")}
                  </Badge>
                )}
                
                {shouldDisplay(lead.leadLabel) && (
                  <Badge variant="outline" className="text-gray-600">
                    {lead.leadLabel}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-right text-sm text-gray-500">
            <div>Lead ID: {lead.leadId}</div>
            <div>Created: {formatDate(lead.createdAt)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
          {/* Left Column - Contact Information */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gray-50 rounded-lg p-5">
              <h3 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Contact Information
              </h3>

              <div className="space-y-4">
                {shouldDisplay(lead.customerEmailAddress) && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500 text-sm">Email</p>
                      <p className="text-gray-900 font-medium">
                        {lead.customerEmailAddress}
                      </p>
                    </div>
                  </div>
                )}

                {shouldDisplay(lead.customerMobileNumber) && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500 text-sm">Phone</p>
                      <p className="text-gray-900 font-medium">
                        {lead.customerMobileNumber}
                      </p>
                    </div>
                  </div>
                )}

                {shouldDisplay(lead.leadAddress) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500 text-sm">Address</p>
                      <p className="text-gray-900 font-medium">
                        {lead.leadAddress}
                      </p>
                    </div>
                  </div>
                )}

                {shouldDisplay(lead.companyEmailAddress) && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500 text-sm">Company Email</p>
                      <p className="text-gray-900 font-medium">
                        {lead.companyEmailAddress}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Lead Details Card */}
            <div className="bg-gray-50 rounded-lg p-5">
              <h3 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-2">
                <Hash className="h-5 w-5 text-blue-600" />
                Lead Details
              </h3>

              <div className="space-y-4">
                {shouldDisplay(lead.leadAddedBy) && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500 text-sm">Added By</p>
                      <p className="text-gray-900 font-medium">
                        {lead.leadAddedBy}
                      </p>
                    </div>
                  </div>
                )}

                {shouldDisplay(lead.leadReference) && (
                  <div className="flex items-start gap-3">
                    <Hash className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500 text-sm">Reference</p>
                      <p className="text-gray-900 font-medium">
                        {lead.leadReference}
                      </p>
                    </div>
                  </div>
                )}
           

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 text-sm">Created</p>
                    <p className="text-gray-900 font-medium text-sm">
                      {formatDate(lead.createdAt)}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500 text-sm">Last Updated</p>
                    <p className="text-gray-900 font-medium text-sm">
                      {formatDate(lead.updatedAt)}
                    </p>
                  </div>
                </div>

              </div>
             
            </div>
            <div className="bg-gray-50 rounded-lg p-5">
               
                        {shouldDisplay(lead.comment) && (
              <div className="bg-white border rounded-lg p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  Comments
                </h3>
                
                <div className="bg-gray-50 rounded-md p-4">
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {lead.comment}
                  </p>
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Middle Column - Comments and Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Comments Card */}
         

            {/* Activity History Card */}
            <div className="bg-white border rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                  <History className="h-5 w-5 text-blue-600" />
                  Activity History
                </h3>
                
                <button
                  onClick={onRefresh}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition"
                  title="Refresh activity"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              {leadTracks.length > 0 ? (
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {leadTracks.map((track, index) => (
                    <div key={index} className="flex gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                      <div className="flex-shrink-0 mt-1">
                        {getActivityIcon(track.actionDescription)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-medium text-gray-900 text-sm">
                            {track.actionBy || 'System'}
                          </h4>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatTrackDate(track.actionTime)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-2">
                          {track.actionDescription}
                        </p>
                        
                        {shouldDisplay(track.message) && (
                          <div className="bg-gray-50 rounded-md p-3 mt-2">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {track.message}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <History className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">No activity recorded yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailView;