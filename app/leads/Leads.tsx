"use client";
import { useState, useEffect } from "react";
import { DragDropContext, DropResult, Draggable } from "react-beautiful-dnd";
import { Button } from "@/components/ui/button";
import { LeadFilters } from "@/components/leads/LeadFilters";
import { LeadColumn } from "@/components/leads/LeadColumn";
import AddLeadModal from "@/components/leads/AddLeadModal";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { LeadStatus } from "../../lib/leads";
import { LeadPriority } from "../../lib/leads";
import { LeadSource } from "../../lib/leads";
import {
  deleteLeadById,
  getAllLeads,
  filterLeads,
  updateLead,
  AssignDropdown,
  getAssignDropdown,
  getLeadById,
} from "../services/data.service";
import { useToast } from "@/hooks/use-toast";
import ChangeStatusModal from "@/components/leads/ChangeStatusModal";
import LeadSortingModal from "@/components/leads/LeadSortingModal";
import ImportLeadModal from "@/components/leads/ImportLeadModal";
import ChangeAssignModal from "@/components/leads/ChangeAssignModal";
import AddFollowUpModal from "@/components/leads/AddFollowUpModal";
import EditLeadModal from "@/components/leads/EditLeadModal";
import ViewLeadModal from "@/components/leads/ViewLeadModal";
import { format } from "date-fns";
import { FilterLeadsParams } from "@/lib/data";

// Updated Lead interface
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
  company?: string;
  createdAt: string;
  updatedAt: string;
  // Additional properties for display
  assignedToName?: string; // For display purposes
}
type LeadFiltersType = {
  status?: LeadStatus;
  priority?: LeadPriority;
  source?: LeadSource;
  assignedTo?: string;
  label?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

const Leads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filters, setFilters] = useState<LeadFiltersType>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "grid">("kanban");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isChangeAssignModalOpen, setIsChangeAssignModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [assignOptions, setAssignOptions] = useState<AssignDropdown[]>([]);

  const [isSortingModalOpen, setIsSortingModalOpen] = useState(false);
  const [isChangeStatusModalOpen, setIsChangeStatusModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [sortConfig, setSortConfig] = useState<
    { sortBy: string; sortOrder: "asc" | "desc" } | undefined
  >();

  const { toast } = useToast();

  const statuses: LeadStatus[] = [
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "PROPOSAL",
    "DEMO",
    "NEGOTIATIONS",
    "CLOSED_WON",
    "CLOSED_LOST",
  ];
  const [assignees, setAssignees] = useState<AssignDropdown[]>([]);
const refreshAssignees = async () => {
  try {
    const response = await getAssignDropdown();
    if (response.isSuccess && response.data) {
      setAssignees(response.data);
    }
  } catch (error) {
    console.error("Failed to fetch assignees:", error);
  }
};
  useEffect(() => {
    const fetchAssignOptions = async () => {
      try {
        const response = await getAssignDropdown();
        if (response.isSuccess && response.data) {
          setAssignOptions(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch assign options:", error);
      }
    };

    fetchAssignOptions();
  }, []);

  const getAssignedToLabel = (id: string | undefined): string | null => {
    if (!id) return null;
    const option = assignOptions.find((opt) => opt.id === id);
    return option ? option.label : null;
  };

  // Enhanced Lead transformation - now maintains original structure
  const enhanceLeadWithAssigneeName = (lead: Lead, assignOptions: AssignDropdown[]): Lead => {
  // If leadAssignedTo exists, use it as the primary assignee
  let assignedToName = lead.leadAssignedTo;
  
  if (lead.leadAssignedTo) {
    assignedToName = lead.leadAssignedTo;
  } else if (lead.leadAddedBy) {
    // Fallback to leadAddedBy if leadAssignedTo is not set
    const assignee = assignOptions.find(opt => opt.id === lead.leadAddedBy);
    assignedToName = assignee ? assignee.label : lead.leadAddedBy;
  }

  return {
    ...lead,
    assignedToName,
    company: lead.company || lead.companyEmailAddress,
  };
};

  // FIXED: Simplified add lead handler
  const handleAddNewLead = (apiLeadData: any) => {
    if (!apiLeadData) return;

    const newLead = enhanceLeadWithAssigneeName(apiLeadData, assignOptions);
    setLeads((prevLeads) => [newLead, ...prevLeads]);
    fetchLeads();
  };

  const handleAddLead = () => {
    setIsAddModalOpen(true);
    fetchLeads();
    fetchFilteredLeads();
  };

  const handleAddNewLeadOptimistic = (formData: any) => {
    const assignee = assignOptions.find(opt => opt.id === formData.leadAddedBy);

    const newLead: Lead = {
      leadId: formData.leadId || `temp-${Date.now()}`,
      leadStatus: formData.leadStatus,
      leadSource: formData.leadSource,
      leadAddedBy: formData.leadAddedBy,
      leadAssignedTo: formData.leadAssignedTo || formData.leadAddedBy,
      customerMobileNumber: formData.customerMobileNumber,
      companyEmailAddress: formData.companyEmailAddress,
      customerName: formData.customerName,
      customerEmailAddress: formData.customerEmailAddress,
      leadAddress: formData.leadAddress,
      comment: formData.comment || "",
      leadLabel: formData.leadLabel,
      leadReference: formData.leadReference,
      leadPriority: formData.leadPriority || "MEDIUM",
      company: formData.company || formData.companyEmailAddress,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedToName: assignee ? assignee.label : formData.leadAddedBy,
    };

    setLeads((prevLeads) => [newLead, ...prevLeads]);
  };

  const fetchFilteredLeads = async () => {
    try {
      setIsLoading(true);

      // Prepare filter parameters with proper type conversion
      const filterParams: FilterLeadsParams = {
        startDate: filters.dateRange?.from
          ? format(filters.dateRange.from, "yyyy-MM-dd")
          : null,
        endDate: filters.dateRange?.to
          ? format(filters.dateRange.to, "yyyy-MM-dd")
          : null,
        leadLabel: filters.label || null,
        leadSource: filters.source || null,
        assignedTo: getAssignedToLabel(filters.assignedTo) || null,
        sortBy: filters.sortBy || null,
        direction: filters.sortOrder || null,
      };

      // Clean null/undefined values
      const cleanedParams = Object.fromEntries(
        Object.entries(filterParams).filter(
          ([_, value]) => value !== null && value !== undefined
        )
      );

      const response = await filterLeads(cleanedParams);

      if (response.isSuccess && response.data) {
        const enhancedLeads = response.data.map(lead => 
          enhanceLeadWithAssigneeName(lead, assignOptions)
        );
        setLeads(enhancedLeads);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to filter leads",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // FIXED: Improved useEffect for filters
  useEffect(() => {
    const hasActiveFilters = Object.keys(filters).length > 0;

    if (hasActiveFilters && !searchQuery) {
      fetchFilteredLeads();
    } else if (!hasActiveFilters && !searchQuery) {
      // If no filters, fetch all leads
      fetchLeads();
    }
  }, [filters]);

  // Fetch leads only on initial load
  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const response = await getAllLeads();
      if (response.isSuccess && response.data) {
        const enhancedLeads = response.data.map(lead => 
          enhanceLeadWithAssigneeName(lead, assignOptions)
        );
        setLeads(enhancedLeads);
      }
    } catch (error: any) {
      console.error("Failed to fetch leads:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch leads",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Refresh leads when assignOptions are loaded to update names
    if (assignOptions.length > 0 && leads.length > 0) {
      const updatedLeads = leads.map(lead => {
        // If we only have IDs but not names, update them
        if (lead.leadAddedBy && !lead.leadAssignedTo) {
          const assignee = assignOptions.find(opt => opt.id === lead.leadAddedBy);
          return {
            ...lead,
            assignedToName: assignee ? assignee.label : lead.leadAddedBy
          };
        }
        return lead;
      });
      setLeads(updatedLeads);
    }
  }, [assignOptions]);

  useEffect(() => {
    fetchLeads();
  }, []);

  // FIXED: Filter leads based on search and filters (local filtering for search)
  const filteredLeads = searchQuery
    ? leads.filter((lead) => {
        return (
          lead.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lead.companyEmailAddress?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lead.customerEmailAddress?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
    : leads;

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    // Don't do anything if dropped in the same place
    if (source.droppableId === destination.droppableId) return;

    const newStatus = destination.droppableId as LeadStatus;

    try {
      // Find the lead being dragged
      const leadToUpdate = leads.find((lead) => lead.leadId === draggableId);
      if (!leadToUpdate) return;

      // Optimistically update local state first
      setLeads((prevLeads) =>
        prevLeads.map((lead) =>
          lead.leadId === draggableId
            ? { ...lead, leadStatus: newStatus, updatedAt: new Date().toISOString() }
            : lead
        )
      );

      // Prepare payload for API call
      const payload = {
        leadId: leadToUpdate.leadId,
        leadStatus: newStatus,
        leadSource: leadToUpdate.leadSource,
        leadAddedBy: leadToUpdate.leadAddedBy,
        customerMobileNumber: leadToUpdate.customerMobileNumber,
        companyEmailAddress: leadToUpdate.companyEmailAddress,
        customerName: leadToUpdate.customerName,
        customerEmailAddress: leadToUpdate.customerEmailAddress,
        leadLabel: leadToUpdate.leadLabel || "",
        leadReference: leadToUpdate.leadReference || "",
        leadAddress: leadToUpdate.leadAddress || "",
        comment: leadToUpdate.comment || "",
      };

      // Make API call to update status
      const response = await updateLead(payload);

      if (!response.isSuccess) {
        // Revert local state if API call fails
        setLeads((prevLeads) =>
          prevLeads.map((lead) =>
            lead.leadId === draggableId
              ? { ...lead, leadStatus: source.droppableId as LeadStatus }
              : lead
          )
        );
        toast({
          title: "Error",
          description: "Failed to update lead status",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Failed to update lead status:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update lead status",
        variant: "destructive",
      });
    }
  };

  // Update existing lead in local state
  const handleUpdateLead = (updatedLead: Lead) => {
    setLeads((prevLeads) =>
      prevLeads.map((lead) => (lead.leadId === updatedLead.leadId ? updatedLead : lead))
    );
  };

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (lead: Lead) => {
    setLeadToDelete(lead);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!leadToDelete) return;

    try {
      const response = await deleteLeadById(leadToDelete.leadId);
      if (response.isSuccess) {
        // Remove from local state immediately
        setLeads((prevLeads) =>
          prevLeads.filter((l) => l.leadId !== leadToDelete.leadId)
        );
        toast({
          title: "Lead deleted",
          description: "Lead has been successfully deleted.",
        });
      }
    } catch (error: any) {
      console.error("Failed to delete lead:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete lead",
        variant: "destructive",
      });
    } finally {
      setIsDeleteModalOpen(false);
      setLeadToDelete(null);
    }
  };

  const handleViewLead = async (lead: Lead) => {
    setSelectedLead(lead); // Set initial lead data for quick display
    setIsViewModalOpen(true);
    
    try {
      // Fetch detailed lead data from API
      const response = await getLeadById(lead.leadId);
      
      if (response.isSuccess && response.data) {
        const detailedLead = enhanceLeadWithAssigneeName(response.data, assignOptions);
        setSelectedLead(detailedLead);
      }
    } catch (error: any) {
      console.error("Failed to fetch lead details:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load lead details",
        variant: "destructive",
      });
    }
  };

  const handleAddFollowUp = (lead: Lead) => {
    setSelectedLead(lead);
    setIsFollowUpModalOpen(true);
  };

  const handleCreateFollowUp = (leadId: string, followUp: any) => {
    setLeads((prevLeads) =>
      prevLeads.map((lead) =>
        lead.leadId === leadId
          ? {
              ...lead,
              comment: followUp.notes,
              updatedAt: new Date().toISOString(),
            }
          : lead
      )
    );
    toast({
      title: "Follow-up scheduled",
      description: "Follow-up has been successfully scheduled.",
    });
  };

  const handleChangeAssign = (lead: Lead) => {
    setSelectedLead(lead);
    setIsChangeAssignModalOpen(true);
  };

const handleUpdateAssignment = (leadId: string, assignedTo: string) => {
  // Find the assignee details from assignOptions
  const assignee = assignOptions.find(opt => opt.label === assignedTo);
  
  setLeads((prevLeads) =>
    prevLeads.map((lead) =>
      lead.leadId === leadId
        ? { 
            ...lead, 
            leadAssignedTo: assignedTo, // Update leadAssignedTo instead of leadAddedBy
            assignedToName: assignedTo, // Keep this for display
            updatedAt: new Date().toISOString() 
          }
        : lead
    )
  );
  
  toast({
    title: "Assignment updated",
    description: "Lead has been reassigned successfully.",
  });
};

  const handleImportLead = () => {
    setIsImportModalOpen(true);
  };

  // FIXED: Improved import leads handler to prevent duplication
  const handleImportLeads = (importedLeads: any[]) => {
    if (
      !importedLeads ||
      !Array.isArray(importedLeads) ||
      importedLeads.length === 0
    ) {
      console.warn("No leads to import or invalid data");
      // Refresh leads after import to ensure consistency
      fetchLeads();
      return;
    }

    try {
      const enhancedLeads = importedLeads.map((lead) =>
        enhanceLeadWithAssigneeName(lead, assignOptions)
      );

      // FIXED: Instead of adding to existing leads, replace with fresh data to avoid duplicates
      // Option 1: Add only new leads (check for duplicates)
      setLeads((prevLeads) => {
        const existingIds = new Set(prevLeads.map((lead) => lead.leadId));
        const newLeads = enhancedLeads.filter(
          (lead) => !existingIds.has(lead.leadId)
        );
        return [...newLeads, ...prevLeads];
      });

      toast({
        title: "Leads imported",
        description: `${enhancedLeads.length} leads have been successfully imported.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process imported leads",
        variant: "destructive",
      });
      // Fallback: refresh all leads
      fetchLeads();
    }
  };

  const handleLeadSorting = () => {
    setIsSortingModalOpen(true);
  };

  const handleApplySort = async (sortBy: string, sortOrder: "asc" | "desc") => {
    try {
      setIsLoading(true);
      const response = await filterLeads({
        ...filters,
        sortBy,
        direction: sortOrder,
      });

      if (response.isSuccess && response.data) {
        const enhancedLeads = response.data.map(lead => 
          enhanceLeadWithAssigneeName(lead, assignOptions)
        );
        setLeads(enhancedLeads);
        setSortConfig({ sortBy, sortOrder });
        setFilters((prev) => ({
          ...prev,
          sortBy,
          sortOrder,
        }));
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sort leads",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeStatus = (lead: Lead) => {
    setSelectedLead(lead);
    setIsChangeStatusModalOpen(true);
  };

  const handleUpdateStatus = (
    leadId: string,
    status: LeadStatus,
    notes?: string
  ) => {
    setLeads((prevLeads) =>
      prevLeads.map((lead) =>
        lead.leadId === leadId ? { 
          ...lead, 
          leadStatus: status, 
          updatedAt: new Date().toISOString(),
          comment: notes || lead.comment
        } : lead
      )
    );
    toast({
      title: "Status updated",
      description: "Lead status has been successfully updated.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div>
      <div>
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
            setSortConfig(undefined);
          }}
          onImportLead={() => setIsImportModalOpen(true)}
          onApplyFilters={() => fetchFilteredLeads()}
            onSortLeads={() => setIsSortingModalOpen(true)}
        />

        {viewMode === "kanban" && (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-6">
              {statuses.map((status) => (
                <LeadColumn
                  key={status}
                  status={status}
                  leads={filteredLeads.filter((lead) => lead.leadStatus === status)}
                  onEditLead={handleEditLead}
                  onDeleteLead={handleDeleteClick}
                  onViewLead={handleViewLead}
                  onAddFollowUp={handleAddFollowUp}
                  onChangeAssign={handleChangeAssign}
                  onImportLead={handleImportLead}
                  onLeadSorting={handleLeadSorting}
                  onChangeStatus={handleChangeStatus}
                />
              ))}
            </div>
          </DragDropContext>
        )}

        {/* Grid View */}
        {viewMode === "grid" && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lead
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Assigned To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.leadId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {lead?.customerName
                              ?.split(" ")
                              ?.map((n) => n[0])
                              ?.join("")}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {lead.customerName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {lead.leadAddress}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lead.companyEmailAddress}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            lead.leadStatus === "NEW"
                              ? "bg-blue-100 text-blue-800"
                              : lead.leadStatus === "CONTACTED"
                              ? "bg-indigo-100 text-indigo-800"
                              : lead.leadStatus === "QUALIFIED"
                              ? "bg-green-100 text-green-800"
                              : lead.leadStatus === "PROPOSAL"
                              ? "bg-teal-100 text-teal-800"
                              : lead.leadStatus === "DEMO"
                              ? "bg-yellow-100 text-yellow-800"
                              : lead.leadStatus === "NEGOTIATIONS"
                              ? "bg-orange-100 text-orange-800"
                              : lead.leadStatus === "CLOSED_WON"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {lead.leadStatus.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            lead.leadPriority === "LOW"
                              ? "bg-gray-100 text-gray-800"
                              : lead.leadPriority === "MEDIUM"
                              ? "bg-blue-100 text-blue-800"
                              : lead.leadPriority === "HIGH"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {lead.leadPriority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lead.leadSource.replace("_", " ")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lead.leadAssignedTo || lead.leadAddedBy}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{lead.customerEmailAddress}</div>
                        <div>{lead.customerMobileNumber}</div>
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
                <p className="text-gray-500">
                  No leads found matching your filters.
                </p>
              </div>
            )}
          </div>
        )}

        <AddLeadModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddLead={handleAddNewLeadOptimistic} // Try this if the API response method doesn't work
          onNewLeadCreated={handleAddNewLead} // Keep this for API response method
        />

        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Delete Lead"
          description={`Are you sure you want to delete the lead "${leadToDelete?.customerName}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
        />

        <ViewLeadModal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          lead={selectedLead}
        />

        <EditLeadModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onUpdateLead={handleUpdateLead}
          lead={selectedLead}
        />

        <AddFollowUpModal
          isOpen={isFollowUpModalOpen}
          onClose={() => setIsFollowUpModalOpen(false)}
          lead={selectedLead}
          onAddFollowUp={handleCreateFollowUp}
        />

        <ChangeAssignModal
          isOpen={isChangeAssignModalOpen}
          onClose={() => setIsChangeAssignModalOpen(false)}
          lead={selectedLead}
          onChangeAssign={handleUpdateAssignment}
        />

        <ImportLeadModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImportLeads={handleImportLeads}
        />

        <LeadSortingModal
          isOpen={isSortingModalOpen}
          onClose={() => setIsSortingModalOpen(false)}
          onApplySort={handleApplySort}
          currentSort={sortConfig}
        />

        <ChangeStatusModal
          isOpen={isChangeStatusModalOpen}
          onClose={() => setIsChangeStatusModalOpen(false)}
          lead={selectedLead}
          onChangeStatus={handleUpdateStatus}
        />
      </div>
    </div>
  );
};

export default Leads;