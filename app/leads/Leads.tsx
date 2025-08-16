"use client";
import { useState } from "react";
import { DragDropContext, DropResult, Draggable } from "react-beautiful-dnd";

import { Lead, LeadStatus } from "../../lib/leads";

// Define LeadFiltersType with status property
import { LeadPriority } from "../../lib/leads";

import { LeadSource } from "../../lib/leads";

type LeadFiltersType = {
  status?: LeadStatus;
  priority?: LeadPriority;
  source?: LeadSource;
  assignedTo?: string;
};
import { Button } from "@/components/ui/button";
import { LeadFilters } from "@/components/leads/LeadFilters";
import { LeadColumn } from "@/components/leads/LeadColumn";

// Sample leads data
const sampleLeads: Lead[] = [
  {
    id: "1",
    name: "Alice Johnson",
    company: "TechCorp Inc.",
    email: "alice@techcorp.com",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA",
    status: "NEW",
    priority: "HIGH",
    source: "WEBSITE",
    assignedTo: "John Smith",
    createdAt: new Date("2025-08-10"),
    updatedAt: new Date("2025-08-14")
  },
  {
    id: "2",
    name: "Bob Martinez",
    company: "StartupXYZ",
    email: "bob@startupxyz.com",
    phone: "+1 (555) 987-6543",
    location: "Austin, TX",
    status: "CONTACTED",
    priority: "MEDIUM",
    source: "REFERRAL",
    assignedTo: "Jane Doe",
    createdAt: new Date("2025-08-12"),
    updatedAt: new Date("2025-08-14")
  },
  {
    id: "3",
    name: "Carol Davis",
    company: "Enterprise Solutions",
    email: "carol@enterprise.com",
    phone: "+1 (555) 456-7890",
    location: "New York, NY",
    status: "QUALIFIED",
    priority: "URGENT",
    source: "EMAIL",
    assignedTo: "Mike Johnson",
    createdAt: new Date("2025-08-13"),
    updatedAt: new Date("2025-08-14")
  },
  {
    id: "4",
    name: "David Wilson",
    company: "Global Systems",
    email: "david@globalsys.com",
    phone: "+1 (555) 321-9876",
    location: "Chicago, IL",
    status: "PROPOSAL",
    priority: "HIGH",
    source: "SOCIAL_MEDIA",
    assignedTo: "Sarah Wilson",
    createdAt: new Date("2025-08-11"),
    updatedAt: new Date("2025-08-14")
  },
  {
    id: "5",
    name: "Eva Rodriguez",
    company: "Innovation Labs",
    email: "eva@innovation.com",
    phone: "+1 (555) 654-3210",
    location: "Seattle, WA",
    status: "DEMO",
    priority: "MEDIUM",
    source: "EVENT",
    assignedTo: "John Smith",
    createdAt: new Date("2025-08-09"),
    updatedAt: new Date("2025-08-14")
  },
  {
    id: "6",
    name: "Frank Thompson",
    company: "Digital Dynamics",
    email: "frank@digital.com",
    phone: "+1 (555) 789-0123",
    location: "Boston, MA",
    status: "NEGOTIATIONS",
    priority: "HIGH",
    source: "PHONE",
    assignedTo: "Jane Doe",
    createdAt: new Date("2025-08-08"),
    updatedAt: new Date("2025-08-14")
  },
  {
    id: "7",
    name: "Grace Chen",
    company: "Future Tech",
    email: "grace@futuretech.com",
    phone: "+1 (555) 012-3456",
    location: "Los Angeles, CA",
    status: "CLOSED_WON",
    priority: "URGENT",
    source: "WEBSITE",
    assignedTo: "Mike Johnson",
    createdAt: new Date("2025-08-07"),
    updatedAt: new Date("2025-08-14")
  },
  {
    id: "8",
    name: "Henry Brown",
    company: "Legacy Corp",
    email: "henry@legacy.com",
    phone: "+1 (555) 345-6789",
    location: "Miami, FL",
    status: "CLOSED_LOST",
    priority: "LOW",
    source: "OTHER",
    assignedTo: "Sarah Wilson",
    createdAt: new Date("2025-08-06"),
    updatedAt: new Date("2025-08-14")
  }
];

const Leads = () => {
  const [leads, setLeads] = useState<Lead[]>(sampleLeads);
  const [filters, setFilters] = useState<LeadFiltersType>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'kanban' | 'grid'>('kanban');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const statuses: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'DEMO', 'NEGOTIATIONS', 'CLOSED_WON', 'CLOSED_LOST'];

  // Filter leads based on search and filters
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lead.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPriority = !filters.priority || lead.priority === filters.priority;
    const matchesStatus = !filters.status || lead.status === filters.status;
    const matchesSource = !filters.source || lead.source === filters.source;
    const matchesAssignedTo = !filters.assignedTo || lead.assignedTo === filters.assignedTo;
    
    return matchesSearch && matchesPriority && matchesStatus && matchesSource && matchesAssignedTo;
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) return;

    const newStatus = destination.droppableId as LeadStatus;
    
    setLeads(prevLeads =>
      prevLeads.map(lead =>
        lead.id === draggableId
          ? { ...lead, status: newStatus, updatedAt: new Date() }
          : lead
      )
    );
  };

  const handleEditLead = (lead: Lead) => {
    console.log('Edit lead:', lead);
    // TODO: Implement edit modal
  };

  const handleDeleteLead = (lead: Lead) => {
    setLeads(prevLeads => prevLeads.filter(l => l.id !== lead.id));
  };

  const handleViewLead = (lead: Lead) => {
    console.log('View lead:', lead);
    // TODO: Implement view modal
  };

  const handleAddLead = () => {
    setIsAddModalOpen(true);
    console.log('Add new lead');
    // TODO: Implement add modal
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-6 py-6">
        {/* Filters */}
        <LeadFilters
          filters={filters}
          onFiltersChange={setFilters}
          onAddLead={handleAddLead}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* Kanban Board */}
        {viewMode === 'kanban' && (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-6 overflow-x-auto pb-6">
              {statuses.map(status => (
                <LeadColumn
                  key={status}
                  status={status}
                  leads={filteredLeads.filter(lead => lead.status === status)}
                  onEditLead={handleEditLead}
                  onDeleteLead={handleDeleteLead}
                  onViewLead={handleViewLead}
                />
              ))}
            </div>
          </DragDropContext>
        )}

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {lead.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                            <div className="text-sm text-gray-500">{lead.location}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lead.company}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          lead.status === 'NEW' ? 'bg-blue-100 text-blue-800' :
                          lead.status === 'CONTACTED' ? 'bg-indigo-100 text-indigo-800' :
                          lead.status === 'QUALIFIED' ? 'bg-green-100 text-green-800' :
                          lead.status === 'PROPOSAL' ? 'bg-teal-100 text-teal-800' :
                          lead.status === 'DEMO' ? 'bg-yellow-100 text-yellow-800' :
                          lead.status === 'NEGOTIATIONS' ? 'bg-orange-100 text-orange-800' :
                          lead.status === 'CLOSED_WON' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {lead.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          lead.priority === 'LOW' ? 'bg-gray-100 text-gray-800' :
                          lead.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800' :
                          lead.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {lead.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lead.source.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lead.assignedTo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{lead.email}</div>
                        <div>{lead.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewLead(lead)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleEditLead(lead)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteLead(lead)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredLeads.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No leads found matching your filters.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leads;