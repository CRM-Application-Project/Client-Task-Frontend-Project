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
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return dateString;
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-6">
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

              {/* Timeline */}
              {leadTracks.length > 0 ? (
                <div className="space-y-6 max-h-[calc(120vh-200px)] overflow-y-auto pr-2">
                  {leadTracks.map((track, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[40px_1fr] gap-4 items-start"
                    >
                      {/* Timeline column */}
                      <div className="flex flex-col items-center relative">
                        {/* Circle */}
                        <div className="h-4 w-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-md border-2 border-white z-10" />
                        {/* Line (except last item) */}
                        {index !== leadTracks.length - 1 && (
                          <div className="flex-1 w-px bg-gradient-to-b from-blue-400 to-purple-400" />
                        )}
                      </div>

                      {/* Card column */}
                      <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs">
                              {track.actionBy?.charAt(0) ?? "?"}
                            </div>
                            <p className="text-sm font-semibold text-gray-900">
                              {track.actionBy}
                            </p>
                          </div>
                          <span className="text-[11px] font-mono px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                            {formatTrackDate(track.actionTime)}
                          </span>
                        </div>

                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {track.actionDescription}
                        </p>

                        {track.actionDescription.includes("changed from") && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-blue-500 font-medium">
                            <ArrowRight className="h-3 w-3" />
                            Status updated
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <p className="text-gray-500 text-sm">
                    ✨ No activity history yet
                  </p>
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