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
  MoreVertical,
  PlusCircle,
  CalendarDays,
  RotateCcw,
} from "lucide-react";
import { LeadTrack } from "@/lib/data";
import Link from "next/link";

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

interface LeadDetailViewProps {
  lead: Lead;
  leadTracks: LeadTrack[];
  onRefresh: () => Promise<void>;
}

const LeadDetailView: React.FC<LeadDetailViewProps> = ({
  lead,
  leadTracks,
  onRefresh,
}) => {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };
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
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
      case "MEDIUM":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "HIGH":
        return "bg-orange-100 text-orange-800 hover:bg-orange-200";
      case "URGENT":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "NEW":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "CONTACTED":
        return "bg-indigo-100 text-indigo-800 hover:bg-indigo-200";
      case "QUALIFIED":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "PROPOSAL":
        return "bg-teal-100 text-teal-800 hover:bg-teal-200";
      case "DEMO":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case "NEGOTIATIONS":
        return "bg-orange-100 text-orange-800 hover:bg-orange-200";
      case "CLOSED_WON":
        return "bg-emerald-100 text-emerald-800 hover:bg-emerald-200";
      case "CLOSED_LOST":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  const getFollowUpIcon = (followUpType?: string) => {
    switch (followUpType?.toUpperCase()) {
      case "CALL":
        return <PhoneCall className="h-4 w-4 text-green-500 hover:text-green-600" />;
      case "EMAIL":
        return <MailIcon className="h-4 w-4 text-indigo-500 hover:text-indigo-600" />;
      case "MEETING":
        return <Calendar className="h-4 w-4 text-blue-500 hover:text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500 hover:text-gray-600" />;
    }
  };

  const shouldDisplay = (value: any): boolean => {
    return value !== null && value !== undefined && value !== "";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
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
      return <RefreshCw className="h-4 w-4 text-blue-500 hover:text-blue-600" />;
    if (desc.includes("call"))
      return <PhoneCall className="h-4 w-4 text-green-500 hover:text-green-600" />;
    if (desc.includes("email"))
      return <MailIcon className="h-4 w-4 text-indigo-500 hover:text-indigo-600" />;
    if (desc.includes("note") || desc.includes("comment"))
      return <FileText className="h-4 w-4 text-amber-500 hover:text-amber-600" />;
    if (desc.includes("created"))
      return <CheckCircle className="h-4 w-4 text-emerald-500 hover:text-emerald-600" />;
    if (desc.includes("closed won"))
      return <CheckCircle className="h-4 w-4 text-emerald-500 hover:text-emerald-600" />;
    if (desc.includes("closed lost"))
      return <XCircle className="h-4 w-4 text-red-500 hover:text-red-600" />;

    return <Clock className="h-4 w-4 text-gray-500 hover:text-gray-600" />;
  };

  return (
    <div className="bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link
            href="/leads"
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-md hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads
          </Link>
          <div className="h-5 w-px bg-gray-300 mx-2"></div>
          <h1 className="text-xl font-semibold text-gray-900">Lead Details</h1>
        </div>
    
      </div>

      {/* Lead Summary Card */}
      <div className="bg-white rounded-lg shadow-sm border mb-6 p-6">
  <div className="flex items-start justify-between">
    
    {/* Left section */}
    <div className="flex items-start gap-4">
      <Avatar className="h-14 w-14 bg-blue-50">
        <AvatarFallback className="bg-blue-50 text-blue-700 font-medium text-lg">
          {getInitials(lead.customerName)}
        </AvatarFallback>
      </Avatar>
      
      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">
          {lead.customerName}
        </h2>

        {shouldDisplay(lead.companyName) && (
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <Building className="h-4 w-4" />
            <span>{lead.companyName}</span>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <Badge className={`${getStatusColor(lead.leadStatus)}`}>
            {lead.leadStatus.replace("_", " ")}
          </Badge>

          {shouldDisplay(lead.leadSource) && (
            <Badge variant="outline" className="text-gray-600 bg-gray-50">
              {lead.leadSource.replace("_", " ")}
            </Badge>
          )}

          {shouldDisplay(lead.leadLabel) && (
            <Badge variant="outline" className="text-gray-600 bg-gray-50">
              {lead.leadLabel}
            </Badge>
          )}
        </div>
      </div>
    </div>

    {/* Right section → Lead Priority */}
    <Badge className={`${getPriorityColor(lead.leadPriority)}`}>
      {lead.leadPriority}
    </Badge>
  </div>
</div>


      {/* Contact and Lead Information Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Contact Information Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-2 pb-3 border-b">
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
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-2 pb-3 border-b">
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

            {shouldDisplay(lead.assignedToName) && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-500 text-sm">Assigned To</p>
                  <p className="text-gray-900 font-medium">
                    {lead.assignedToName}
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

            {/* Follow-up Information */}
            {shouldDisplay(lead.leadFollowUp) && (
              <div className="flex items-start gap-3">
                {getFollowUpIcon(lead.leadFollowUp)}
                <div>
                  <p className="text-gray-500 text-sm">Follow-up Type</p>
                  <p className="text-gray-900 font-medium">
                    {lead.leadFollowUp}
                  </p>
                </div>
              </div>
            )}

            {shouldDisplay(lead.nextFollowUpDate) && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-500 text-sm">Next Follow-up</p>
                  <p className="text-gray-900 font-medium">
                    {formatDate(lead.nextFollowUpDate!)}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <PlusCircle className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-500 text-sm">Created</p>
                  <p className="text-gray-900 font-medium text-sm">
                    {formatDate(lead.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CalendarDays className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-500 text-sm">Last Updated</p>
                  <p className="text-gray-900 font-medium text-sm">
                    {formatDate(lead.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comments Card */}
      {shouldDisplay(lead.comment) && (
        <div className="bg-white rounded-lg shadow-sm border mb-6 p-6">
          <h3 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-2 pb-3 border-b">
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

      {/* Activity History Card */}
      <div className="bg-white border rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            Activity History
          </h3>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh activity"
          >
            <RotateCcw className={`h-4 w-4 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {leadTracks.length > 0 ? (
          <div className={`space-y-4 ${isRefreshing ? 'opacity-50 pointer-events-none' : ''}`}>
            {leadTracks.map((track, index) => (
              <div key={index} className="flex gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0 mt-1">
                  <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center">
                    {getActivityIcon(track.actionDescription)}
                  </div>
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
            {isRefreshing ? (
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <RotateCcw className="h-6 w-6 text-blue-600 animate-spin" />
              </div>
            ) : (
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <History className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <p className="text-gray-500 text-sm">
              {isRefreshing ? "Refreshing activity..." : "No activity recorded yet"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadDetailView;