import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
  Clock
} from 'lucide-react';
import { FetchLeadTrackResponse, LeadTrack } from '@/lib/data';
import { fetchLeadTrackById } from '@/app/services/data.service';

interface Lead {
  leadId: string;
  leadStatus: string;
  leadSource: string;
  leadAddedBy: string;
  customerMobileNumber: string;
  companyEmailAddress: string;
  customerName: string;
  customerEmailAddress: string;
  leadAddress: string;
  comment?: string;
  leadLabel?: string;
  leadReference?: string;
  leadPriority: string;
  company?: string;
  createdAt: string;
  updatedAt: string;
}

interface ViewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

const ViewLeadModal: React.FC<ViewLeadModalProps> = ({ isOpen, onClose, lead }) => {
  const [leadTracks, setLeadTracks] = useState<LeadTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && lead) {
      fetchLeadTracks();
    }
  }, [isOpen, lead]);

  const fetchLeadTracks = async () => {
    if (!lead) return;
    
    setLoading(true);
    setError(null);
    try {
      const response: FetchLeadTrackResponse = await fetchLeadTrackById(lead.leadId);
      if (response.isSuccess) {
        setLeadTracks(response.data);
      } else {
        setError(response.message || 'Failed to fetch lead tracking data');
      }
    } catch (err) {
      setError('Error fetching lead tracking data');
      console.error('Error fetching lead tracks:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!lead) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPriorityColor = (priority: string) => {
    console.log("aaaaaaaaaaaaaaaaaaaaa", priority);
    switch (priority) {
      case 'LOW': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'MEDIUM': return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'HIGH': return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'URGENT': return 'bg-red-50 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'CONTACTED': return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'QUALIFIED': return 'bg-green-50 text-green-800 border-green-200';
      case 'PROPOSAL': return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'DEMO': return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case 'NEGOTIATIONS': return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'CLOSED_WON': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'CLOSED_LOST': return 'bg-red-50 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Helper function to check if a value exists and should be displayed
  const shouldDisplay = (value: any): boolean => {
    return value !== null && value !== undefined && value !== '';
  };

  // Format date string for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString; // Return original string if parsing fails
    }
  };

  const formatTrackDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-4 pb-4 border-b">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-blue-50 text-blue-600 font-medium">
                {getInitials(lead.customerName)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-gray-900">{lead.customerName}</h2>
              {shouldDisplay(lead.company) && (
                <p className="text-sm text-gray-600">{lead.company}</p>
              )}
              <div className="flex gap-2 pt-1 flex-wrap">
                <Badge className={`${getStatusColor(lead.leadStatus)} border`}>
                  {lead.leadStatus.replace('_', ' ')}
                </Badge>
                <Badge className={`${getPriorityColor(lead.leadPriority)} border`}>
                  {lead.leadPriority}
                </Badge>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 text-sm uppercase tracking-wider">Contact Information</h3>
              
              <div className="space-y-3">
                {shouldDisplay(lead.customerEmailAddress) && (
                  <div className="flex items-start gap-3 text-sm">
                    <Mail className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500">Email</p>
                      <p className="text-gray-900 font-medium">{lead.customerEmailAddress}</p>
                    </div>
                  </div>
                )}
                
                {shouldDisplay(lead.customerMobileNumber) && (
                  <div className="flex items-start gap-3 text-sm">
                    <Phone className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500">Phone</p>
                      <p className="text-gray-900 font-medium">{lead.customerMobileNumber}</p>
                    </div>
                  </div>
                )}
                
                {shouldDisplay(lead.leadAddress) && (
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500">Address</p>
                      <p className="text-gray-900 font-medium">{lead.leadAddress}</p>
                    </div>
                  </div>
                )}
                
                {shouldDisplay(lead.company) && (
                  <div className="flex items-start gap-3 text-sm">
                    <Building className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500">Company</p>
                      <p className="text-gray-900 font-medium">{lead.company}</p>
                    </div>
                  </div>
                )}

                {shouldDisplay(lead.companyEmailAddress) && (
                  <div className="flex items-start gap-3 text-sm">
                    <Mail className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500">Company Email</p>
                      <p className="text-gray-900 font-medium">{lead.companyEmailAddress}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Lead Details */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 text-sm uppercase tracking-wider">Lead Details</h3>
              
              <div className="space-y-3">
                {shouldDisplay(lead.leadAddedBy) && (
                  <div className="flex items-start gap-3 text-sm">
                    <User className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500">Added By</p>
                      <p className="text-gray-900 font-medium">{lead.leadAddedBy}</p>
                    </div>
                  </div>
                )}

                {shouldDisplay(lead.leadSource) && (
                  <div className="flex items-start gap-3 text-sm">
                    <Tag className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500">Source</p>
                      <p className="text-gray-900 font-medium">{lead.leadSource.replace('_', ' ')}</p>
                    </div>
                  </div>
                )}

                {shouldDisplay(lead.leadLabel) && (
                  <div className="flex items-start gap-3 text-sm">
                    <Tag className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500">Lead Label</p>
                      <p className="text-gray-900 font-medium">{lead.leadLabel}</p>
                    </div>
                  </div>
                )}

                {shouldDisplay(lead.leadReference) && (
                  <div className="flex items-start gap-3 text-sm">
                    <Hash className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500">Lead Reference</p>
                      <p className="text-gray-900 font-medium">{lead.leadReference}</p>
                    </div>
                  </div>
                )}

                {shouldDisplay(lead.leadPriority) && (
                  <div className="flex items-start gap-3 text-sm">
                    <Hash className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500">Priority</p>
                      <p className="text-gray-900 font-medium">{lead.leadPriority}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lead Tracking History */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium text-gray-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <History className="h-4 w-4" />
              Lead Activity History
            </h3>
            
            {loading && (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-500" />
                <span className="ml-2 text-gray-600">Loading activity history...</span>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
            
            {!loading && !error && leadTracks.length === 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-center">
                <p className="text-gray-600 text-sm">No activity history found</p>
              </div>
            )}
            
            {!loading && !error && leadTracks.length > 0 && (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {leadTracks.map((track, index) => (
                  <div key={index} className="flex gap-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <p className="text-sm font-medium text-gray-900">{track.actionBy}</p>
                        <p className="text-xs text-gray-500">{formatTrackDate(track.actionTime)}</p>
                      </div>
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                        {track.actionDescription}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Additional Information */}
          {(shouldDisplay(lead.comment) || shouldDisplay(lead.createdAt) || shouldDisplay(lead.updatedAt)) && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-medium text-gray-900 text-sm uppercase tracking-wider">Additional Information</h3>
              
              <div className="space-y-3">
                {shouldDisplay(lead.comment) && (
                  <div className="flex items-start gap-3 text-sm">
                    <MessageSquare className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-gray-500">Comments</p>
                      <p className="text-gray-900 font-medium whitespace-pre-wrap">{lead.comment}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {shouldDisplay(lead.createdAt) && (
                    <div className="flex items-start gap-3 text-sm">
                      <Calendar className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-500">Created</p>
                        <p className="text-gray-900 font-medium">{formatDate(lead.createdAt)}</p>
                      </div>
                    </div>
                  )}

                  {shouldDisplay(lead.updatedAt) && (
                    <div className="flex items-start gap-3 text-sm">
                      <RefreshCw className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-500">Last Updated</p>
                        <p className="text-gray-900 font-medium">{formatDate(lead.updatedAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* System Information */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium text-gray-900 text-sm uppercase tracking-wider">System Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Lead ID</p>
                <p className="text-gray-900 font-medium text-md">{lead.leadId}</p>
              </div>
              
              <div>
                <p className="text-gray-500">Status</p>
                <p className="text-gray-900 font-medium">{lead.leadStatus.replace('_', ' ')}</p>
              </div>
              
              <div>
                <p className="text-gray-500">Priority</p>
                <p className="text-gray-900 font-medium">{lead.leadPriority}</p>
              </div>
              
              <div>
                <p className="text-gray-500">Source</p>
                <p className="text-gray-900 font-medium">{lead.leadSource.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewLeadModal;