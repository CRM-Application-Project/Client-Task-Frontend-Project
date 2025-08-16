"use client";
import { useState, useEffect } from "react";
import { DragDropContext, DropResult, Draggable } from "react-beautiful-dnd";
import { Button } from "@/components/ui/button";
import { LeadFilters } from "@/components/leads/LeadFilters";
import { LeadColumn } from "@/components/leads/LeadColumn";
import AddLeadModal from "@/components/leads/AddLeadModal";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { Lead, LeadStatus } from "../../lib/leads";
import { LeadPriority } from "../../lib/leads";
import { LeadSource } from "../../lib/leads";
import { deleteLeadById, getAllLeads } from "../services/data.service";

type LeadFiltersType = {
  status?: LeadStatus;
  priority?: LeadPriority;
  source?: LeadSource;
  assignedTo?: string;
};

const Leads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filters, setFilters] = useState<LeadFiltersType>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'kanban' | 'grid'>('kanban');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const statuses: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'DEMO', 'NEGOTIATIONS', 'CLOSED_WON', 'CLOSED_LOST'];

useEffect(() => {
  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const response = await getAllLeads();
      if (response.isSuccess && response.data) {
        // Transform API data to match our Lead interface
        const transformedLeads = response.data.map((apiLead) => ({
          id: apiLead.leadId,
          name: apiLead.customerName,
          company: apiLead.companyEmailAddress, // Using companyEmailAddress as company for now
          email: apiLead.customerEmailAddress,
          phone: apiLead.customerMobileNumber,
          location: apiLead.leadAddress,
          status: apiLead.leadStatus as LeadStatus,
          priority: "MEDIUM" as LeadPriority, // Explicitly type as LeadPriority
          source: apiLead.leadSource as LeadSource,
          assignedTo: apiLead.leadAddedBy,
          createdAt: new Date(apiLead.createdAt),
          updatedAt: new Date(apiLead.updatedAt),
          comment: apiLead.comment,
          leadLabel: apiLead.leadLabel,
          leadReference: apiLead.leadReference,
        }));
        setLeads(transformedLeads);
      }
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  fetchLeads();
}, []);

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

  const handleDeleteClick = (lead: Lead) => {
    setLeadToDelete(lead);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!leadToDelete) return;
    
    try {
      const response = await deleteLeadById(leadToDelete.id);
      if (response.isSuccess) {
        setLeads(prevLeads => prevLeads.filter(l => l.id !== leadToDelete.id));
      }
    } catch (error) {
      console.error("Failed to delete lead:", error);
    } finally {
      setIsDeleteModalOpen(false);
      setLeadToDelete(null);
    }
  };

  const handleViewLead = (lead: Lead) => {
    console.log('View lead:', lead);
    // TODO: Implement view modal
  };

  const handleAddLead = () => {
    setIsAddModalOpen(true);
  };

  const handleCreateLead = (newLead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    const lead: Lead = {
      ...newLead,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setLeads(prevLeads => [...prevLeads, lead]);
    setIsAddModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
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
          onClearAllFilters={() => {
            setFilters({});
            setSearchQuery("");
          }}
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
                  onDeleteLead={handleDeleteClick}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Assigned To</th>
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
                            onClick={() => handleDeleteClick(lead)}
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

        <AddLeadModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddLead={handleCreateLead}
        />

        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Delete Lead"
          description={`Are you sure you want to delete the lead "${leadToDelete?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
        />
      </div>
    </div>
  );
};

export default Leads;