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
      return "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200 hover:border-gray-400";
    case "MEDIUM":
      return "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100 hover:border-blue-300";
    case "HIGH":
      return "bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100 hover:border-orange-300";
    case "URGENT":
      return "bg-red-50 text-red-800 border-red-200 hover:bg-red-100 hover:border-red-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200 hover:border-gray-400";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "NEW":
      return "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100 hover:border-blue-300";
    case "CONTACTED":
      return "bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300";
    case "QUALIFIED":
      return "bg-green-50 text-green-800 border-green-200 hover:bg-green-100 hover:border-green-300";
    case "PROPOSAL":
      return "bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100 hover:border-teal-300";
    case "DEMO":
      return "bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100 hover:border-yellow-300";
    case "NEGOTIATIONS":
      return "bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100 hover:border-orange-300";
    case "CLOSED_WON":
      return "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300";
    case "CLOSED_LOST":
      return "bg-red-50 text-red-800 border-red-200 hover:bg-red-100 hover:border-red-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200 hover:border-gray-400";
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
      // Format as DD-MM-YYYY for older dates
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
      {/* Header with back button */}
      <div className="flex items-center justify-between p-6 border-b">
        <Link
          href="/leads"
          className="flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Leads
        </Link>
      </div>

      <div className="p-6">
        {/* Lead header */}
        <div className="flex items-start gap-4 pb-6 border-b">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-blue-50 text-blue-600 font-medium">
              {getInitials(lead.customerName)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-900">
              {lead.customerName}
            </h2>
            {shouldDisplay(lead.company) && (
              <p className="text-sm text-gray-600">{lead.company}</p>
            )}
            <div className="flex gap-2 pt-1 flex-wrap">
              <Badge className={`${getStatusColor(lead.leadStatus)} border`}>
                {lead.leadStatus.replace("_", " ")}
              </Badge>
              <Badge
                className={`${getPriorityColor(lead.leadPriority)} border`}
              >
                {lead.leadPriority}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1  gap-6 py-6">
          {/* Left Card - Lead Information */}
          <div className="bg-white border rounded-lg p-5 shadow-sm">
            <div className="space-y-6">
              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 text-sm uppercase tracking-wider">
                  Contact Information
                </h3>

                <div className="space-y-3">
                  {shouldDisplay(lead.customerEmailAddress) && (
                    <div className="flex items-start gap-3 text-sm">
                      <Mail className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-500">Email</p>
                        <p className="text-gray-900 font-medium">
                          {lead.customerEmailAddress}
                        </p>
                      </div>
                    </div>
                  )}

                  {shouldDisplay(lead.customerMobileNumber) && (
                    <div className="flex items-start gap-3 text-sm">
                      <Phone className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-500">Phone</p>
                        <p className="text-gray-900 font-medium">
                          {lead.customerMobileNumber}
                        </p>
                      </div>
                    </div>
                  )}

                  {shouldDisplay(lead.leadAddress) && (
                    <div className="flex items-start gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-500">Address</p>
                        <p className="text-gray-900 font-medium">
                          {lead.leadAddress}
                        </p>
                      </div>
                    </div>
                  )}

                  {shouldDisplay(lead.companyName) && (
                    <div className="flex items-start gap-3 text-sm">
                      <Building className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-500">Company</p>
                        <p className="text-gray-900 font-medium">
                          {lead.companyName}
                        </p>
                      </div>
                    </div>
                  )}

                  {shouldDisplay(lead.companyEmailAddress) && (
                    <div className="flex items-start gap-3 text-sm">
                      <Mail className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-500">Company Email</p>
                        <p className="text-gray-900 font-medium">
                          {lead.companyEmailAddress}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Lead Details */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 text-sm uppercase tracking-wider">
                  Lead Details
                </h3>

                <div className="space-y-3">
                  {shouldDisplay(lead.leadAddedBy) && (
                    <div className="flex items-start gap-3 text-sm">
                      <User className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-500">Added By</p>
                        <p className="text-gray-900 font-medium">
                          {lead.leadAddedBy}
                        </p>
                      </div>
                    </div>
                  )}

                  {shouldDisplay(lead.leadSource) && (
                    <div className="flex items-start gap-3 text-sm">
                      <Tag className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-500">Source</p>
                        <p className="text-gray-900 font-medium">
                          {lead.leadSource.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                  )}

                  {shouldDisplay(lead.leadLabel) && (
                    <div className="flex items-start gap-3 text-sm">
                      <Tag className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-500">Lead Label</p>
                        <p className="text-gray-900 font-medium">
                          {lead.leadLabel}
                        </p>
                      </div>
                    </div>
                  )}

                  {shouldDisplay(lead.leadReference) && (
                    <div className="flex items-start gap-3 text-sm">
                      <Hash className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-500">Lead Reference</p>
                        <p className="text-gray-900 font-medium">
                          {lead.leadReference}
                        </p>
                      </div>
                    </div>
                  )}

                  {shouldDisplay(lead.leadPriority) && (
                    <div className="flex items-start gap-3 text-sm">
                      <Hash className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-500">Priority</p>
                        <p className="text-gray-900 font-medium">
                          {lead.leadPriority}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              {(shouldDisplay(lead.comment) ||
                shouldDisplay(lead.createdAt) ||
                shouldDisplay(lead.updatedAt)) && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium text-gray-900 text-sm uppercase tracking-wider">
                    Additional Information
                  </h3>

                  <div className="space-y-3">
                    {shouldDisplay(lead.comment) && (
                      <div className="flex items-start gap-3 text-sm">
                        <MessageSquare className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-gray-500">Comments</p>
                          <p className="text-gray-900 font-medium whitespace-pre-wrap">
                            {lead.comment}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {shouldDisplay(lead.createdAt) && (
                        <div className="flex items-start gap-3 text-sm">
                          <Calendar className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-gray-500">Created</p>
                            <p className="text-gray-900 font-medium">
                              {formatDate(lead.createdAt)}
                            </p>
                          </div>
                        </div>
                      )}

                      {shouldDisplay(lead.updatedAt) && (
                        <div className="flex items-start gap-3 text-sm">
                          <RefreshCw className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-gray-500">Last Updated</p>
                            <p className="text-gray-900 font-medium">
                              {formatDate(lead.updatedAt)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* System Information */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-medium text-gray-900 text-sm uppercase tracking-wider">
                  System Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Lead ID</p>
                    <p className="text-gray-900 font-medium text-md">
                      {lead.leadId}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Status</p>
                    <p className="text-gray-900 font-medium">
                      {lead.leadStatus.replace("_", " ")}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Priority</p>
                    <p className="text-gray-900 font-medium">
                      {lead.leadPriority}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Source</p>
                    <p className="text-gray-900 font-medium">
                      {lead.leadSource.replace("_", " ")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Card - Activity History */}
          <div className="bg-white/70 backdrop-blur border rounded-xl p-6 shadow-md">
            <div className="space-y-5">
              {/* Header */}
              <h3 className="font-semibold text-gray-900 text-base tracking-tight flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                Lead Activity History
                <button
                  onClick={onRefresh}
                  className="ml-auto p-2 rounded-full hover:bg-blue-50 text-blue-600 transition"
                  title="Sync history"
                >
                  <RefreshCw className="h-4 w-4 hover:animate-spin" />
                </button>
              </h3>

              {/* Activity Timeline */}
              {leadTracks.length > 0 ? (
                <div className="max-h-[600px] overflow-y-auto px-1 py-2 pb-11">
                  <div className="space-y-3">
                    {leadTracks.map((track, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {track.actionBy?.split(' ').map(n => n[0]).join('').toUpperCase() || '??'}
                              </span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-1">
                              <div>
                                <h4 className="font-medium text-gray-900 text-sm">
                                  {track.actionBy || 'Unknown User'}
                                </h4>
                              </div>
                              <span className="text-xs text-gray-400">
                                {formatTrackDate(track.actionTime)}
                              </span>
                            </div>

                            {/* Activity Description */}
                            <p className="text-sm text-gray-700 mb-2">
                              {track.actionDescription}
                            </p>
                            
                            {/* Message content if available */}
                            {shouldDisplay(track.message) && (
                              <div className="bg-gray-50 rounded-md p-3 mt-2 border border-gray-200">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                  {track.message}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <History className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">No activity yet</p>
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