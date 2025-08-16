import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Lead } from '../../lib/leads';
import { Calendar, Mail, Phone, MapPin, Building, User, Tag } from 'lucide-react';

interface ViewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

const ViewLeadModal: React.FC<ViewLeadModalProps> = ({ isOpen, onClose, lead }) => {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-4 pb-4 border-b">
            <Avatar className="h-14 w-14">
              <AvatarImage src={lead.assignedToAvatar} alt={lead.name} />
              <AvatarFallback className="bg-blue-50 text-blue-600 font-medium">
                {getInitials(lead.name)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-gray-900">{lead.name}</h2>
              <p className="text-sm text-gray-600">{lead.company}</p>
              <div className="flex gap-2 pt-1">
                <Badge className={`${getStatusColor(lead.status)} border`}>
                  {lead.status.replace('_', ' ')}
                </Badge>
                <Badge className={`${getPriorityColor(lead.priority)} border`}>
                  {lead.priority}
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
                <div className="flex items-start gap-3 text-sm">
                  <Mail className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500">Email</p>
                    <p className="text-gray-900 font-medium">{lead.email}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 text-sm">
                  <Phone className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500">Phone</p>
                    <p className="text-gray-900 font-medium">{lead.phone}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500">Location</p>
                    <p className="text-gray-900 font-medium">{lead.location}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 text-sm">
                  <Building className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500">Company</p>
                    <p className="text-gray-900 font-medium">{lead.company}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lead Details */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 text-sm uppercase tracking-wider">Lead Details</h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <User className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500">Assigned To</p>
                    <p className="text-gray-900 font-medium">{lead.assignedTo}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 text-sm">
                  <Tag className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500">Source</p>
                    <p className="text-gray-900 font-medium">{lead.source.replace('_', ' ')}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500">Created</p>
                    <p className="text-gray-900 font-medium">
                      {lead.createdAt.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500">Last Updated</p>
                    <p className="text-gray-900 font-medium">
                      {lead.updatedAt.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewLeadModal;