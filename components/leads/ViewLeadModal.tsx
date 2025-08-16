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
      case 'LOW': return 'bg-gray-100 text-gray-800';
      case 'MEDIUM': return 'bg-blue-100 text-blue-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'URGENT': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-blue-100 text-blue-800';
      case 'CONTACTED': return 'bg-indigo-100 text-indigo-800';
      case 'QUALIFIED': return 'bg-green-100 text-green-800';
      case 'PROPOSAL': return 'bg-teal-100 text-teal-800';
      case 'DEMO': return 'bg-yellow-100 text-yellow-800';
      case 'NEGOTIATIONS': return 'bg-orange-100 text-orange-800';
      case 'CLOSED_WON': return 'bg-emerald-100 text-emerald-800';
      case 'CLOSED_LOST': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={lead.assignedToAvatar} alt={lead.name} />
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {getInitials(lead.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{lead.name}</h2>
              <p className="text-sm text-gray-500">{lead.company}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Priority */}
          <div className="flex gap-2">
            <Badge className={getStatusColor(lead.status)}>
              {lead.status.replace('_', ' ')}
            </Badge>
            <Badge className={getPriorityColor(lead.priority)}>
              {lead.priority}
            </Badge>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Contact Information</h3>
              
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{lead.email}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{lead.phone}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>{lead.location}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Building className="h-4 w-4 text-gray-400" />
                <span>{lead.company}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Lead Details</h3>
              
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <span>Assigned to: {lead.assignedTo}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4 text-gray-400" />
                <span>Source: {lead.source.replace('_', ' ')}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>Created: {lead.createdAt.toLocaleDateString()}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>Updated: {lead.updatedAt.toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewLeadModal;