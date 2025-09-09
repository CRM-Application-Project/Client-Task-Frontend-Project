"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Clock, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CreateTimesheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (timesheetData: TimesheetEntry) => void;
}

interface TimesheetEntry {
  date: string;
  startTime: string;
  endTime: string;
  workedHours: number;
  comment: string;
}

export function CreateTimesheetModal({ isOpen, onClose, onSubmit }: CreateTimesheetModalProps) {
  const [formData, setFormData] = useState<TimesheetEntry>({
    date: new Date().toISOString().split('T')[0], // Default to today
    startTime: '',
    endTime: '',
    workedHours: 0,
    comment: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Calculate worked hours based on start and end time
  const calculateWorkedHours = (start: string, end: string): number => {
    if (!start || !end) return 0;
    
    const startTime = new Date(`1970-01-01T${start}:00`);
    const endTime = new Date(`1970-01-01T${end}:00`);
    
    if (endTime <= startTime) return 0;
    
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return Math.round(diffHours * 100) / 100; // Round to 2 decimal places
  };

  const handleStartTimeChange = (value: string) => {
    const newFormData = { ...formData, startTime: value };
    newFormData.workedHours = calculateWorkedHours(value, formData.endTime);
    setFormData(newFormData);
  };

  const handleEndTimeChange = (value: string) => {
    const newFormData = { ...formData, endTime: value };
    newFormData.workedHours = calculateWorkedHours(formData.startTime, value);
    setFormData(newFormData);
  };

  const handleWorkedHoursChange = (value: string) => {
    const hours = parseFloat(value) || 0;
    setFormData({ ...formData, workedHours: hours });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.date) {
      toast({
        title: "Missing Information",
        description: "Please provide a date",
        variant: "destructive",
      });
      return;
    }

    // Check if date is not in the future
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of today
    
    if (selectedDate > today) {
      toast({
        title: "Invalid Date",
        description: "Date cannot be in the future",
        variant: "destructive",
      });
      return;
    }

    if (!formData.startTime || !formData.endTime) {
      toast({
        title: "Missing Information",
        description: "Please provide both start and end times",
        variant: "destructive",
      });
      return;
    }

    // Validate that end time is after start time
    const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.date}T${formData.endTime}`);
    
    if (endDateTime <= startDateTime) {
      toast({
        title: "Invalid Time Range",
        description: "End time must be after start time",
        variant: "destructive",
      });
      return;
    }

    if (formData.workedHours <= 0) {
      toast({
        title: "Invalid Hours",
        description: "Worked hours must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (!formData.comment.trim()) {
      toast({
        title: "Missing Comment",
        description: "Please provide a comment describing your work",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        workedHours: 0,
        comment: ''
      });
      
      toast({
        title: "Timesheet Created",
        description: "Your timesheet entry has been saved successfully",
      });
      
      onClose();
    } catch (error) {
      console.error('Error creating timesheet:', error);
      toast({
        title: "Error",
        description: "Failed to create timesheet entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      startTime: '',
      endTime: '',
      workedHours: 0,
      comment: ''
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Create Timesheet Entry
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Start Time */}
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                required
              />
            </div>

            {/* End Time */}
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Worked Hours */}
          <div className="space-y-2">
            <Label htmlFor="workedHours">Worked Hours</Label>
            <Input
              id="workedHours"
              type="number"
              step="0.25"
              min="0"
              max="24"
              value={formData.workedHours}
              onChange={(e) => handleWorkedHoursChange(e.target.value)}
              placeholder="Hours worked (auto-calculated)"
              required
            />
            <p className="text-xs text-gray-500">
              This is automatically calculated based on start and end times, but you can adjust it manually
            </p>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Work Description</Label>
            <Textarea
              id="comment"
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              placeholder="Describe the work you performed during this time..."
              className="min-h-[100px]"
              required
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              className='bg-brand-primary text-white hover:bg-brand-primary/90'
              disabled={isSubmitting}
            >
              <Save className="h-4 w-4 mr-2 " />
              {isSubmitting ? 'Creating...' : 'Create Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
