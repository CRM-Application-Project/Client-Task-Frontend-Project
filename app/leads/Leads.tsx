"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { LeadFilters } from "@/components/leads/LeadFilters";
import { LeadColumn } from "@/components/leads/LeadColumn";
import AddLeadModal from "@/components/leads/AddLeadModal";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
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
  ChangeLeadStatusRequest,
  changeLeadStatus,
  createLeadStage,
  fetchLeadStages,
  updateLeadStage,
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
import {
  CreateLeadStageRequest,
  FilterLeadsParams,
  LeadStage,
} from "@/lib/data";
import { CreateLeadStageModal } from "@/components/leads/LeadStageModal";
import { ChangeStatusConfirmModal } from "@/components/leads/ChangeStatusDragConfirmModal";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { useCountryCodes } from "@/hooks/useCountryCodes";
import { Menu } from "@headlessui/react";
import { EllipsisVertical } from "lucide-react"; 

// Updated Lead interface
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

// Updated pagination interface based on API response
interface PaginationData {
  currentPage: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  lastPage: boolean;
}

interface LeadsResponse {
  items: Lead[];
  currentPage: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  lastPage: boolean;
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
  const [allKanbanLeads, setAllKanbanLeads] = useState<Lead[]>([]);
  const [leadStages, setLeadStages] = useState<LeadStage[]>([]);
  const [filters, setFilters] = useState<LeadFiltersType>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "grid">("kanban");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [paginationData, setPaginationData] = useState<PaginationData>({
    currentPage: 0,
    pageSize: 50,
    totalElements: 0,
    totalPages: 0,
    lastPage: true
  });
  
  // Infinite scroll states for kanban
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [kanbanPage, setKanbanPage] = useState(0);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreateStageModalOpen, setIsCreateStageModalOpen] = useState(false);
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
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [isStatusChangeConfirmOpen, setIsStatusChangeConfirmOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>("");
  const [statusChangeMessage, setStatusChangeMessage] = useState("");

  // Optimized state management
  const [isInitialized, setIsInitialized] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const lastFetchParamsRef = useRef<string>("");
  const fetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const initializingRef = useRef(false);

  // Debounce filters and search query with longer delay to reduce API calls
  const debouncedFilters = useDebounce(filters, 500);
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const { toast } = useToast();

  // Consolidated fetch function to prevent duplicate API calls
  const fetchData = useCallback(async (
    page = 0, 
    append = false, 
    forceRefresh = false
  ) => {
    // Prevent multiple simultaneous calls
    if (fetchingRef.current && !forceRefresh) {
      console.log('Fetch already in progress, skipping...');
      return;
    }

    // Create parameters signature to prevent duplicate calls
    const hasActiveFilters = Object.keys(debouncedFilters).length > 0 || debouncedSearchQuery;
    const paramsSignature = JSON.stringify({
      page,
      viewMode,
      filters: debouncedFilters,
      search: debouncedSearchQuery,
      pageSize: viewMode === "kanban" ? 50 : pageSize
    });

    // Skip if same parameters (unless force refresh or appending)
    if (!forceRefresh && !append && lastFetchParamsRef.current === paramsSignature) {
      console.log('Same parameters, skipping fetch');
      return;
    }

    fetchingRef.current = true;

    try {
      // Cancel previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      setIsFetching(true);
      if (!append) setIsLoading(true);

      const effectivePageSize = viewMode === "kanban" ? 50 : pageSize;
      let response;

      if (hasActiveFilters) {
        // Build filter params
        const filterParams: any = {
          page,
          size: effectivePageSize,
        };

        // Add filters only if they exist
        if (debouncedFilters.dateRange?.from) {
          filterParams.startDate = format(debouncedFilters.dateRange.from, "yyyy-MM-dd");
        }
        if (debouncedFilters.dateRange?.to) {
          filterParams.endDate = format(debouncedFilters.dateRange.to, "yyyy-MM-dd");
        }
        if (debouncedFilters.status) {
          filterParams.leadStatus = debouncedFilters.status;
        }
        if (debouncedFilters.priority) {
          filterParams.leadPriority = debouncedFilters.priority;
        }
        if (debouncedFilters.label) {
          filterParams.leadLabel = debouncedFilters.label;
        }
        if (debouncedFilters.source) {
          filterParams.leadSource = debouncedFilters.source;
        }
        if (debouncedFilters.assignedTo && debouncedFilters.assignedTo !== "all") {
          const assignee = assignOptions.find(opt => opt.id === debouncedFilters.assignedTo);
          filterParams.assignedTo = assignee?.label || null;
        }
        if (debouncedFilters.sortBy) {
          filterParams.sortBy = debouncedFilters.sortBy;
        }
        if (debouncedFilters.sortOrder) {
          filterParams.direction = debouncedFilters.sortOrder;
        }

        // Add search query to filters if exists
        if (debouncedSearchQuery) {
          filterParams.searchQuery = debouncedSearchQuery;
        }

        // Remove null/undefined values
        const cleanedParams = Object.fromEntries(
          Object.entries(filterParams).filter(([_, value]) => 
            value !== null && value !== undefined && value !== ""
          )
        );

        response = await filterLeads(cleanedParams);
      } else {
        // No filters, use getAllLeads
        const params = {
          page,
          size: effectivePageSize
        };
        response = await getAllLeads(params);
      }

      // Check if request was aborted
      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      if (response.isSuccess && response.data) {
        const enhancedLeads = response.data.items.map((lead: Lead) =>
          enhanceLeadWithAssigneeName(lead, assignOptions)
        );
        
        if (viewMode === "grid") {
          setLeads(enhancedLeads);
          setCurrentPage(response.data.currentPage);
          setPaginationData({
            currentPage: response.data.currentPage,
            pageSize: response.data.pageSize,
            totalElements: response.data.totalElements,
            totalPages: response.data.totalPages,
            lastPage: response.data.lastPage
          });
        } else {
          if (append) {
            setAllKanbanLeads(prev => [...prev, ...enhancedLeads]);
            setKanbanPage(page);
          } else {
            setAllKanbanLeads(enhancedLeads);
            setKanbanPage(0);
          }
          setHasMoreData(!response.data.lastPage);
        }

        // Update last fetch params
        lastFetchParamsRef.current = paramsSignature;
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Failed to fetch leads:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to fetch leads",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsFetching(false);
      fetchingRef.current = false;
    }
  }, [
    debouncedFilters, 
    debouncedSearchQuery, 
    viewMode, 
    pageSize, 
    assignOptions, 
    toast
  ]);

  // Fetch lead stages from API
  const fetchLeadStagesData = useCallback(async () => {
    try {
      const response = await fetchLeadStages();
      if (response.isSuccess && response.data) {
        const sortedStages = response.data.sort(
          (a, b) => a.leadStagePriority - b.leadStagePriority
        );
        setLeadStages(sortedStages);
      }
    } catch (error) {
      console.error("Failed to fetch lead stages:", error);
      toast({
        title: "Error",
        description: "Failed to fetch lead stages",
        variant: "destructive",
      });
    }
  }, [toast]);

  const sortedLeadStages = useMemo(
    () => [...leadStages].sort((a, b) => a.leadStagePriority - b.leadStagePriority),
    [leadStages]
  );

  const [isReorderingStages, setIsReorderingStages] = useState(false);
  const reorderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize data only once
  useEffect(() => {
    const initializeData = async () => {
      if (isInitialized || initializingRef.current) return;
      
      initializingRef.current = true;
      setIsLoading(true);

      try {
        console.log('Initializing component data...');
        
        // Fetch both assign options and lead stages in parallel
        const [assignResponse] = await Promise.all([
          getAssignDropdown(),
          fetchLeadStagesData()
        ]);

        if (assignResponse.isSuccess && assignResponse.data) {
          setAssignOptions(assignResponse.data);
        }

        setIsInitialized(true);
        console.log('Component data initialized successfully');
      } catch (error) {
        console.error("Failed to initialize data:", error);
        toast({
          title: "Error",
          description: "Failed to load initial data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        initializingRef.current = false;
      }
    };

    initializeData();
  }, []); // No dependencies to prevent re-initialization

  // Single effect to handle all data fetching
  useEffect(() => {
    // Wait for initialization and assign options
    if (!isInitialized || assignOptions.length === 0 || isFetching) {
      return;
    }

    console.log('Fetching data due to filter/search/view changes...');
    
    // Reset pagination when filters/search/view changes
    setKanbanPage(0);
    setCurrentPage(0);
    setHasMoreData(true);
    
    // Clear kanban data for fresh load
    if (viewMode === "kanban") {
      setAllKanbanLeads([]);
    }
    
    // Fetch data
    fetchData(0, false, true);
  }, [
    isInitialized, 
    assignOptions.length, 
    debouncedFilters, 
    debouncedSearchQuery, 
    viewMode,
    fetchData
  ]);

  // Optimized infinite scroll for kanban
  const loadMoreKanbanData = useCallback(async () => {
    if (isLoadingMore || !hasMoreData || fetchingRef.current || viewMode !== "kanban") {
      return;
    }
    
    console.log('Loading more kanban data...');
    setIsLoadingMore(true);
    const nextPage = kanbanPage + 1;
    
    await fetchData(nextPage, true);
  }, [kanbanPage, hasMoreData, isLoadingMore, viewMode, fetchData]);

  // Optimized pagination for grid
  const handlePageChange = useCallback((newPage: number) => {
    if (
      newPage >= 0 && 
      newPage < paginationData.totalPages && 
      !fetchingRef.current &&
      newPage !== currentPage
    ) {
      console.log(`Changing to page ${newPage}`);
      setCurrentPage(newPage);
      fetchData(newPage);
    }
  }, [paginationData.totalPages, currentPage, fetchData]);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (reorderTimeoutRef.current) {
        clearTimeout(reorderTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Infinite scroll hook for kanban view
  useEffect(() => {
    if (viewMode !== "kanban") return;

    const handleScroll = () => {
      const threshold = 1000;
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      
      if (scrollTop + clientHeight >= scrollHeight - threshold) {
        loadMoreKanbanData();
      }
    };

    const throttledScroll = throttle(handleScroll, 200);
    window.addEventListener('scroll', throttledScroll);
    
    return () => window.removeEventListener('scroll', throttledScroll);
  }, [loadMoreKanbanData, viewMode]);

  // Utility function to enhance lead with assignee name
  const enhanceLeadWithAssigneeName = (lead: Lead, assignOptions: AssignDropdown[]): Lead => {
    const assignee = assignOptions.find((opt) => opt.id === lead.leadAddedBy);
    return {
      ...lead,
      assignedToName: assignee ? assignee.label : lead.leadAddedBy,
      companyName: lead.companyName || lead.companyEmailAddress,
    };
  };

  // Optimized filter change handler
  const handleFiltersChange = useCallback((newFilters: LeadFiltersType) => {
    console.log('Filters changed:', newFilters);
    setFilters(newFilters);
  }, []);

  // Optimized search change handler
  const handleSearchChange = useCallback((query: string) => {
    console.log('Search query changed:', query);
    setSearchQuery(query);
  }, []);

  // Optimized view mode change
  const handleViewModeChange = useCallback((mode: "kanban" | "grid") => {
    if (mode !== viewMode) {
      console.log('View mode changed to:', mode);
      setViewMode(mode);
    }
  }, [viewMode]);

  // Optimized clear filters
  const handleClearAllFilters = useCallback(() => {
    console.log('Clearing all filters');
    setFilters({});
    setSearchQuery("");
    setSortConfig(undefined);
  }, []);

  // Search functionality - moved to useMemo for better performance
  const filteredLeads = useMemo(() => {
    const sourceLeads = viewMode === "grid" ? leads : allKanbanLeads;
    
    if (!debouncedSearchQuery) {
      return sourceLeads;
    }

    const searchLower = debouncedSearchQuery.toLowerCase();
    return sourceLeads.filter((lead) => 
      lead.customerName?.toLowerCase().includes(searchLower) ||
      lead.companyEmailAddress?.toLowerCase().includes(searchLower) ||
      lead.customerEmailAddress?.toLowerCase().includes(searchLower)
    );
  }, [debouncedSearchQuery, leads, allKanbanLeads, viewMode]);

  // Stage handlers remain the same but with better error handling
  const handleStageUpdate = (updatedStage: LeadStage, skipRefresh = false) => {
    if (isReorderingStages) return;

    setLeadStages((prevStages) =>
      prevStages.map((s) =>
        s?.leadStageId === updatedStage.leadStageId
          ? { ...s, ...updatedStage }
          : s
      ).filter(Boolean) as LeadStage[]
    );

    setLeads((prevLeads) =>
      prevLeads.map((lead) => {
        const previous = leadStages.find(
          (st) => st?.leadStageId === updatedStage.leadStageId
        );
        if (
          previous &&
          previous.leadStageName !== updatedStage.leadStageName &&
          lead.leadStatus === previous.leadStageName
        ) {
          return { ...lead, leadStatus: updatedStage.leadStageName };
        }
        return lead;
      })
    );

    setAllKanbanLeads((prevLeads) =>
      prevLeads.map((lead) => {
        const previous = leadStages.find(
          (st) => st?.leadStageId === updatedStage.leadStageId
        );
        if (
          previous &&
          previous.leadStageName !== updatedStage.leadStageName &&
          lead.leadStatus === previous.leadStageName
        ) {
          return { ...lead, leadStatus: updatedStage.leadStageName };
        }
        return lead;
      })
    );

    if (!skipRefresh) {
      fetchLeadStagesData();
    }
  };

  const handleStageReorder = async (reorderedStages: LeadStage[]) => {
    if (isReorderingStages) {
      console.log('Reorder operation already in progress, skipping...');
      return;
    }

    if (reorderTimeoutRef.current) {
      clearTimeout(reorderTimeoutRef.current);
    }

    reorderTimeoutRef.current = setTimeout(async () => {
      await performStageReorder(reorderedStages);
    }, 300);
  };

  const performStageReorder = async (reorderedStages: LeadStage[]) => {
    const hasOrderChanged = reorderedStages.some((stage, index) => 
      stage.leadStagePriority !== index + 1
    );
    
    if (!hasOrderChanged) {
      console.log('No order changes needed');
      return;
    }

    setIsReorderingStages(true);

    try {
      setLeadStages(reorderedStages);

      const stagesToUpdate = reorderedStages
        .map((stage, index) => {
          const newPriority = index + 1;
          return stage.leadStagePriority !== newPriority 
            ? { ...stage, newPriority }
            : null;
        })
        .filter((item): item is LeadStage & { newPriority: number } => item !== null);

      if (stagesToUpdate.length === 0) {
        console.log('No stages need priority updates');
        return;
      }

      console.log('Updating stages:', stagesToUpdate.map(s => ({ 
        id: s.leadStageId, 
        name: s.leadStageName,
        oldP: s.leadStagePriority, 
        newP: s.newPriority 
      })));

      const updateResults: Array<{
        stage: LeadStage & { newPriority: number };
        response?: any;
        error?: any;
      }> = [];
      
      for (const stageToUpdate of stagesToUpdate) {
        try {
          const updatePayload = {
            leadStageId: stageToUpdate.leadStageId,
            leadStageName: stageToUpdate.leadStageName,
            leadStageDescription: stageToUpdate.leadStageDescription || '',
            leadStagePriority: stageToUpdate.newPriority,
          };

          console.log('Updating stage:', { 
            name: updatePayload.leadStageName, 
            priority: updatePayload.leadStagePriority 
          });
          
          const response = await updateLeadStage(updatePayload);
          updateResults.push({ stage: stageToUpdate, response });
          
          if (!response.isSuccess) {
            console.error(`API returned error for stage ${stageToUpdate.leadStageName}:`, response.message);
          }
          
          await new Promise(resolve => setTimeout(resolve, 150));
          
        } catch (error) {
          console.error(`Failed to update stage ${stageToUpdate.leadStageName}:`, error);
          updateResults.push({ stage: stageToUpdate, error });
        }
      }

      const failedUpdates = updateResults.filter(result => 
        result.error || !result.response?.isSuccess
      );

      if (failedUpdates.length > 0) {
        console.error('Failed updates:', failedUpdates.map(f => ({
          stageName: f.stage?.leadStageName,
          error: (f.error as Error)?.message || f.response?.message || 'Unknown error'
        })));
        
        await fetchLeadStagesData();
        
        toast({
          title: "Error",
          description: `Failed to update ${failedUpdates.length} stage(s). Order has been reverted.`,
          variant: "destructive",
        });
      } else {
        const updatedStages = reorderedStages.map((stage, index) => ({
          ...stage,
          leadStagePriority: index + 1
        }));
        
        setLeadStages(updatedStages);
        console.log('Stage reorder completed successfully');
      }
    } catch (error: any) {
      console.error("Failed to reorder stages:", error);
      await fetchLeadStagesData();
      
      toast({
        title: "Error",
        description: error.message || "Failed to reorder stages",
        variant: "destructive",
      });
    } finally {
      setIsReorderingStages(false);
    }
  };

  const handleStageDelete = (deletedStageId: string) => {
    const deletedStage = leadStages.find(
      (stage) => stage.leadStageId === deletedStageId
    );

    if (deletedStage) {
      const remainingStages = leadStages.filter(
        (stage) => stage.leadStageId !== deletedStageId
      );
      const firstRemainingStage = remainingStages.sort(
        (a, b) => a.leadStagePriority - b.leadStagePriority
      )[0];

      if (firstRemainingStage) {
        setLeads((prevLeads) =>
          prevLeads.map((lead) =>
            lead.leadStatus === deletedStage.leadStageName
              ? { ...lead, leadStatus: firstRemainingStage.leadStageName }
              : lead
          )
        );
        setAllKanbanLeads((prevLeads) =>
          prevLeads.map((lead) =>
            lead.leadStatus === deletedStage.leadStageName
              ? { ...lead, leadStatus: firstRemainingStage.leadStageName }
              : lead
          )
        );
      } else {
        setLeads((prevLeads) =>
          prevLeads.filter(
            (lead) => lead.leadStatus !== deletedStage.leadStageName
          )
        );
        setAllKanbanLeads((prevLeads) =>
          prevLeads.filter(
            (lead) => lead.leadStatus !== deletedStage.leadStageName
          )
        );
      }
    }

    setLeadStages((prevStages) => {
      const filteredStages = prevStages.filter(
        (stage) => stage.leadStageId !== deletedStageId
      );
      return filteredStages.sort(
        (a, b) => a.leadStagePriority - b.leadStagePriority
      );
    });
  };

  const handleCreateStage = async (stageData: {
    name: string;
    description: string;
    orderNumber: number;
  }) => {
    try {
      const createStageRequest: CreateLeadStageRequest = {
        leadStageName: stageData.name,
        leadStageDescription: stageData.description,
        leadStagePriority: stageData.orderNumber,
      };

      const response = await createLeadStage(createStageRequest);

      if (response.isSuccess) {
        toast({
          title: "Success",
          description: "Lead stage created successfully",
        });
        await fetchLeadStagesData();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to create lead stage",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Failed to create lead stage:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create lead stage",
        variant: "destructive",
      });
    }
  };

  const handleAddNewLead = (apiLeadData: any) => {
    if (!apiLeadData) return;

    const newLead = enhanceLeadWithAssigneeName(apiLeadData, assignOptions);
    setLeads((prevLeads) => [newLead, ...prevLeads]);
    setAllKanbanLeads((prevLeads) => [newLead, ...prevLeads]);
  };

  const [restrictToFirstStage, setRestrictToFirstStage] = useState(false);
  const [presetStageId, setPresetStageId] = useState<string | undefined>();

  const handleAddLead = () => {
    setRestrictToFirstStage(false);
    setPresetStageId(undefined);
    setIsAddModalOpen(true);
  };

  const handleAddLeadForStage = (stageId?: string) => {
    setRestrictToFirstStage(true);
    setPresetStageId(stageId);
    setIsAddModalOpen(true);
  };

  const handleAddStage = () => {
    setIsCreateStageModalOpen(true);
  };

  const handleAddNewLeadOptimistic = (formData: any) => {
    const assignee = assignOptions.find(
      (opt) => opt.id === formData.leadAddedBy
    );

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
      companyName: formData.companyName || formData.companyEmailAddress,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedToName: assignee ? assignee.label : formData.leadAddedBy,
      leadFollowUp: formData.leadFollowUp || "",
      nextFollowUpDate: formData.nextFollowUpDate || null,
    };

    setLeads((prevLeads) => [newLead, ...prevLeads]);
    setAllKanbanLeads((prevLeads) => [newLead, ...prevLeads]);
  };

  // Pagination component for grid view
  const PaginationComponent = () => {
    if (paginationData.totalPages === 0) return null;

    const generatePageNumbers = () => {
      const pages = [];
      const current = paginationData.currentPage;
      const total = paginationData.totalPages;
      
      pages.push(0);
      
      if (current > 3) {
        pages.push(-1);
      }
      
      for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }
      
      if (current < total - 4) {
        pages.push(-2);
      }
      
      if (total > 1 && !pages.includes(total - 1)) {
        pages.push(total - 1);
      }
      
      return pages;
    };

    return (
      <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
        <div className="flex items-center text-sm text-gray-700">
          <span>
            Showing {paginationData.currentPage * paginationData.pageSize + 1} to{" "}
            {Math.min(
              (paginationData.currentPage + 1) * paginationData.pageSize,
              paginationData.totalElements
            )}{" "}
            of {paginationData.totalElements} results
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(paginationData.currentPage - 1)}
            disabled={paginationData.currentPage === 0}
            className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          <div className="flex space-x-1">
            {generatePageNumbers().map((pageNum, index) => {
              if (pageNum === -1 || pageNum === -2) {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="relative inline-flex items-center px-3 py-2 text-sm font-medium bg-white text-gray-500 border border-gray-200 cursor-default"
                  >
                    ...
                  </span>
                );
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`relative inline-flex items-center px-3 py-2 text-sm font-medium border rounded-md ${
                    paginationData.currentPage === pageNum
                      ? "bg-brand-primary text-white border-brand-primary"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {pageNum + 1}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(paginationData.currentPage + 1)}
            disabled={paginationData.lastPage}
            className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, lead: Lead) => {
    setDraggedLead(lead);
    e.dataTransfer.setData("text/plain", lead.leadId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, stageName: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stageName);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, newStatus: string) => {
    e.preventDefault();
    setDragOverStage(null);

    if (!draggedLead) return;
    if (draggedLead.leadStatus === newStatus) return;

    setTargetStatus(newStatus);
    setStatusChangeMessage("");
    setIsStatusChangeConfirmOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!draggedLead || !targetStatus) return;

    try {
      const leadToUpdate = (viewMode === "grid" ? leads : allKanbanLeads).find(
        (lead) => lead.leadId === draggedLead.leadId
      );
      if (!leadToUpdate) return;

      // Update UI optimistically for both views
      if (viewMode === "grid") {
        setLeads((prevLeads) =>
          prevLeads.map((lead) =>
            lead.leadId === draggedLead.leadId
              ? {
                  ...lead,
                  leadStatus: targetStatus,
                  updatedAt: new Date().toISOString(),
                }
              : lead
          )
        );
      } else {
        setAllKanbanLeads((prevLeads) =>
          prevLeads.map((lead) =>
            lead.leadId === draggedLead.leadId
              ? {
                  ...lead,
                  leadStatus: targetStatus,
                  updatedAt: new Date().toISOString(),
                }
              : lead
          )
        );
      }

      const payload: ChangeLeadStatusRequest = {
        leadId: leadToUpdate.leadId,
        leadStatus: targetStatus,
        message: statusChangeMessage || undefined,
      };

      const response = await changeLeadStatus(payload);

      if (!response.isSuccess) {
        // Revert on error
        const revertUpdate = (prevLeads: Lead[]) =>
          prevLeads.map((lead) =>
            lead.leadId === draggedLead.leadId
              ? { ...lead, leadStatus: draggedLead.leadStatus }
              : lead
          );

        if (viewMode === "grid") {
          setLeads(revertUpdate);
        } else {
          setAllKanbanLeads(revertUpdate);
        }
        
        toast({
          title: "Error",
          description: response.message || "Failed to update lead status",
          variant: "destructive",
        });
      } else {
        if (response.data) {
          const updateWithResponse = (prevLeads: Lead[]) =>
            prevLeads.map((lead) =>
              lead.leadId === draggedLead.leadId
                ? {
                    ...lead,
                    leadStatus: targetStatus,
                    updatedAt: response.data!.updatedAt,
                  }
                : lead
            );

          if (viewMode === "grid") {
            setLeads(updateWithResponse);
          } else {
            setAllKanbanLeads(updateWithResponse);
          }
          
          toast({
            title: "Status updated",
            description: "Lead status has been successfully updated.",
          });
        }
      }
    } catch (error: any) {
      console.error("Failed to update lead status:", error);
      
      const revertUpdate = (prevLeads: Lead[]) =>
        prevLeads.map((lead) =>
          lead.leadId === draggedLead.leadId
            ? { ...lead, leadStatus: draggedLead.leadStatus }
            : lead
        );

      if (viewMode === "grid") {
        setLeads(revertUpdate);
      } else {
        setAllKanbanLeads(revertUpdate);
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to update lead status",
        variant: "destructive",
      });
    } finally {
      setDraggedLead(null);
      setIsStatusChangeConfirmOpen(false);
      setTargetStatus("");
      setStatusChangeMessage("");
    }
  };

  // Other handler functions remain the same...
  const handleUpdateLead = (updatedLead: Lead) => {
    const updateFunction = (prevLeads: Lead[]) =>
      prevLeads.map((lead) =>
        lead.leadId === updatedLead.leadId ? updatedLead : lead
      );

    if (viewMode === "grid") {
      setLeads(updateFunction);
    } else {
      setAllKanbanLeads(updateFunction);
    }
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
        const filterFunction = (prevLeads: Lead[]) =>
          prevLeads.filter((l) => l.leadId !== leadToDelete.leadId);

        if (viewMode === "grid") {
          setLeads(filterFunction);
        } else {
          setAllKanbanLeads(filterFunction);
        }
        
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
    setSelectedLead(lead);
    setIsViewModalOpen(true);

    try {
      const response = await getLeadById(lead.leadId);

      if (response.isSuccess && response.data) {
        const detailedLead = enhanceLeadWithAssigneeName(
          response.data,
          assignOptions
        );
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
    const updateFunction = (prevLeads: Lead[]) =>
      prevLeads.map((lead) =>
        lead.leadId === leadId
          ? {
              ...lead,
              comment: followUp.notes,
              updatedAt: new Date().toISOString(),
            }
          : lead
      );

    if (viewMode === "grid") {
      setLeads(updateFunction);
    } else {
      setAllKanbanLeads(updateFunction);
    }
    
    toast({
      title: "Follow-up scheduled",
      description: "Follow-up has been successfully scheduled.",
    });
  };

  const handleChangeAssign = (lead: Lead) => {
    setSelectedLead(lead);
    setIsChangeAssignModalOpen(true);
  };

  const handleUpdateAssignment = async (
    leadId: string,
    assignedToId: string,
    assignedToLabel: string
  ) => {
    try {
      const updateFunction = (prevLeads: Lead[]) =>
        prevLeads.map((lead) =>
          lead.leadId === leadId
            ? {
                ...lead,
                leadAddedBy: assignedToId,
                leadAssignedTo: assignedToLabel,
                assignedToName: assignedToLabel,
                updatedAt: new Date().toISOString(),
              }
            : lead
        );

      if (viewMode === "grid") {
        setLeads(updateFunction);
      } else {
        setAllKanbanLeads(updateFunction);
      }

      toast({
        title: "Assignment updated",
        description: "Lead has been reassigned successfully.",
      });
    } catch (error: any) {
      console.error("Failed to refresh leads after assignment:", error);
      toast({
        title: "Assignment updated",
        description: "Lead has been reassigned (refresh may be needed for full sync).",
      });
    }
  };

  const handleImportLead = () => {
    setIsImportModalOpen(true);
  };

  const handleImportLeads = (importedLeads: any[]) => {
    if (!importedLeads || !Array.isArray(importedLeads) || importedLeads.length === 0) {
      console.warn("No leads to import or invalid data");
      return;
    }

    try {
      const enhancedLeads = importedLeads.map((lead) =>
        enhanceLeadWithAssigneeName(lead, assignOptions)
      );

      const updateFunction = (prevLeads: Lead[]) => {
        const existingIds = new Set(prevLeads.map((lead) => lead.leadId));
        const newLeads = enhancedLeads.filter(
          (lead) => !existingIds.has(lead.leadId)
        );
        return [...newLeads, ...prevLeads];
      };

      if (viewMode === "grid") {
        setLeads(updateFunction);
      } else {
        setAllKanbanLeads(updateFunction);
      }

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
    }
  };
 const { codes: countryCodes, loading: loadingCountryCodes } = useCountryCodes();
  const handleLeadSorting = () => {
    setIsSortingModalOpen(true);
  };

  const handleApplySort = async (sortBy: string, sortOrder: "asc" | "desc") => {
    try {
      console.log('Applying sort:', { sortBy, sortOrder });
      
      const newFilters = {
        ...filters,
        sortBy,
        sortOrder,
      };
      
      setSortConfig({ sortBy, sortOrder });
      setFilters(newFilters);
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sort leads",
        variant: "destructive",
      });
    }
  };

  const handleChangeStatus = (lead: Lead) => {
    setSelectedLead(lead);
    setIsChangeStatusModalOpen(true);
  };

  const handleUpdateStatus = (leadId: string, status: LeadStatus, notes?: string) => {
    const updateFunction = (prevLeads: Lead[]) =>
      prevLeads.map((lead) =>
        lead.leadId === leadId
          ? {
              ...lead,
              leadStatus: status,
              updatedAt: new Date().toISOString(),
              comment: notes || lead.comment,
            }
          : lead
      );

    if (viewMode === "grid") {
      setLeads(updateFunction);
    } else {
      setAllKanbanLeads(updateFunction);
    }
    
    toast({
      title: "Status updated",
      description: "Lead status has been successfully updated.",
    });
  };

  // Loading state
  if (!isInitialized || (isLoading && (viewMode === "grid" ? leads.length === 0 : allKanbanLeads.length === 0))) {
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
          onFiltersChange={handleFiltersChange}
           assignees={assignOptions}
          onAddLead={handleAddLead}
          onAddStage={handleAddStage}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onClearAllFilters={handleClearAllFilters}
          onImportLead={() => setIsImportModalOpen(true)}
          onApplyFilters={() => {
            // No need to trigger here - handled by useEffect
          }}
          onSortLeads={() => setIsSortingModalOpen(true)}
          leadStages={leadStages}
        />

        {/* Kanban View with Infinite Scroll */}
        {viewMode === "kanban" && (
          <div>
            <div className="flex gap-4 overflow-x-auto pb-6 kanban-board-container">
              {sortedLeadStages.map((stage, index) => (
                <LeadColumn
                  key={stage.leadStageId}
                  stage={stage}
                   assignees={assignOptions}
                  stageIndex={index}
                  leads={filteredLeads?.filter(
                    (lead) => lead.leadStatus === stage.leadStageName
                  )}
                  onEditLead={handleEditLead}
                  onDeleteLead={handleDeleteClick}
                  onViewLead={async (lead) => {
                    setSelectedLead(lead);
                    setIsViewModalOpen(true);
                    try {
                      const response = await getLeadById(lead.leadId);
                      if (response.isSuccess && response.data) {
                        const detailedLead = enhanceLeadWithAssigneeName(
                          response.data,
                          assignOptions
                        );
                        setSelectedLead(detailedLead);
                      }
                    } catch (error: any) {
                      console.error("Failed to fetch lead details:", error);
                    }
                  }}
                  onAddFollowUp={(lead) => {
                    setSelectedLead(lead);
                    setIsFollowUpModalOpen(true);
                  }}
                  onChangeAssign={(lead) => {
                    setSelectedLead(lead);
                    setIsChangeAssignModalOpen(true);
                  }}
                  onImportLead={() => setIsImportModalOpen(true)}
                  onLeadSorting={() => setIsSortingModalOpen(true)}
                  onChangeStatus={(lead) => {
                    setSelectedLead(lead);
                    setIsChangeStatusModalOpen(true);
                  }}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  isDragOver={dragOverStage === stage.leadStageName}
                  onStageUpdate={handleStageUpdate}
                  onStageDelete={handleStageDelete}
                  allStages={sortedLeadStages}
                  onStageReorder={handleStageReorder}
                  onAddLeadForStage={() => handleAddLeadForStage(stage.leadStageId)}
                />
              ))}
            </div>
            
            {/* Loading indicator for infinite scroll */}
            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
              </div>
            )}
            
            {/* End of data indicator */}
            {!hasMoreData && allKanbanLeads.length > 0 && (
              <div className="text-center py-4 text-gray-500">
                <p>No more leads to load</p>
              </div>
            )}
          </div>
        )}

        {/* Grid View with Traditional Pagination */}
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
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {lead.leadStatus}
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
                        {lead?.leadSource?.replace("_", " ")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lead.leadAssignedTo || lead.leadAddedBy}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{lead.customerEmailAddress}</div>
                        <div>{lead.customerMobileNumber}</div>
                      </td>
   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium relative">
  <Menu as="div" className="relative inline-block text-left">
    <div>
      <Menu.Button className="flex items-center text-gray-500 hover:text-gray-700">
        <EllipsisVertical className="h-5 w-5" aria-hidden="true" />
      </Menu.Button>
    </div>
    <Menu.Items className="absolute right-6 mt-2 w-28 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50" style={{ position: 'fixed' }}>
      <div className="py-1">
        <Menu.Item>
          {({ active }) => (
            <button
              onClick={() => handleViewLead(lead)}
              className={`${
                active ? "bg-gray-100" : ""
              } block w-full px-4 py-2 text-sm text-gray-700 text-left`}
            >
              View
            </button>
          )}
        </Menu.Item>
        <Menu.Item>
          {({ active }) => (
            <button
              onClick={() => handleEditLead(lead)}
              className={`${
                active ? "bg-gray-100" : ""
              } block w-full px-4 py-2 text-sm text-gray-700 text-left`}
            >
              Edit
            </button>
          )}
        </Menu.Item>
        <Menu.Item>
          {({ active }) => (
            <button
              onClick={() => handleDeleteClick(lead)}
              className={`${
                active ? "bg-gray-100" : ""
              } block w-full px-4 py-2 text-sm text-red-600 text-left`}
            >
              Delete
            </button>
          )}
        </Menu.Item>
      </div>
    </Menu.Items>
  </Menu>
</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredLeads.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  No leads found matching your filters.
                </p>
              </div>
            )}
            
            {/* Pagination Component */}
            <PaginationComponent />
          </div>
        )}

        {/* All Modals */}
        <AddLeadModal
           codes={countryCodes}
        loading={loadingCountryCodes}
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setRestrictToFirstStage(false);
            setPresetStageId(undefined);
          }}
          onAddLead={handleAddNewLeadOptimistic}
          onNewLeadCreated={handleAddNewLead}
          leadStages={leadStages}
          restrictToFirstStage={restrictToFirstStage}
          presetStageId={presetStageId}
        />
        <CreateLeadStageModal
          isOpen={isCreateStageModalOpen}
          onClose={() => setIsCreateStageModalOpen(false)}
          onSubmit={handleCreateStage}
          existingStagesCount={leadStages.length}
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
        <ChangeStatusConfirmModal
          isOpen={isStatusChangeConfirmOpen}
          onClose={() => {
            setIsStatusChangeConfirmOpen(false);
            setDraggedLead(null);
            setTargetStatus("");
            setStatusChangeMessage("");
          }}
          onConfirm={handleConfirmStatusChange}
          leadName={draggedLead?.customerName || "this lead"}
          currentStatus={draggedLead?.leadStatus || ""}
          newStatus={targetStatus}
          message={statusChangeMessage}
          onMessageChange={setStatusChangeMessage}
        />
        <ViewLeadModal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          lead={selectedLead}
        />
        <EditLeadModal
           countryCodes={countryCodes}
        loadingCountryCodes={loadingCountryCodes}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onUpdateLead={handleUpdateLead}
          lead={selectedLead}
          leadStages={leadStages}
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

// Throttle utility function
function throttle<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;
  
  return (...args: Parameters<T>) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}

export default Leads;