"use client";
import React, { useState } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (range: DateRange) => void;
  initialRange?: DateRange;
}

export const DateRangePicker = ({ isOpen, onClose, onSelect, initialRange }: DateRangePickerProps) => {
  const [selectedRange, setSelectedRange] = useState<DateRange>(
    initialRange || { from: new Date(), to: new Date() }
  );
  const [fromDate, setFromDate] = useState<Date | undefined>(selectedRange.from);
  const [toDate, setToDate] = useState<Date | undefined>(selectedRange.to);

  const presetRanges = [
    {
      label: "Today",
      value: () => ({ from: new Date(), to: new Date() })
    },
    {
      label: "Yesterday", 
      value: () => {
        const yesterday = subDays(new Date(), 1);
        return { from: yesterday, to: yesterday };
      }
    },
    {
      label: "This Week",
      value: () => ({ 
        from: startOfWeek(new Date(), { weekStartsOn: 1 }), 
        to: endOfWeek(new Date(), { weekStartsOn: 1 }) 
      })
    },
    {
      label: "Last Week",
      value: () => {
        const lastWeek = subWeeks(new Date(), 1);
        return { 
          from: startOfWeek(lastWeek, { weekStartsOn: 1 }), 
          to: endOfWeek(lastWeek, { weekStartsOn: 1 }) 
        };
      }
    },
    {
      label: "This Month",
      value: () => ({ 
        from: startOfMonth(new Date()), 
        to: endOfMonth(new Date()) 
      })
    },
    {
      label: "Last Month",
      value: () => {
        const lastMonth = subMonths(new Date(), 1);
        return { 
          from: startOfMonth(lastMonth), 
          to: endOfMonth(lastMonth) 
        };
      }
    }
  ];

  const handlePresetSelect = (preset: typeof presetRanges[0]) => {
    const range = preset.value();
    setSelectedRange(range);
    setFromDate(range.from);
    setToDate(range.to);
  };

  const handleSubmit = () => {
    if (fromDate && toDate) {
      onSelect({ from: fromDate, to: toDate });
      onClose();
    }
  };

  const handleFromDateChange = (date: Date | undefined) => {
    setFromDate(date);
    if (date) {
      setSelectedRange(prev => ({ ...prev, from: date }));
    }
  };

  const handleToDateChange = (date: Date | undefined) => {
    setToDate(date);
    if (date) {
      setSelectedRange(prev => ({ ...prev, to: date }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader className="bg-primary text-primary-foreground p-4 -m-6 mb-6 rounded-t-lg">
          <DialogTitle className="text-lg font-semibold flex items-center justify-between">
            Date Range
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="text-primary-foreground hover:bg-primary-foreground/20 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Preset Options */}
          <div className="space-y-2">
            {presetRanges.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                className="w-full justify-start text-sm font-normal hover:bg-accent"
                onClick={() => handlePresetSelect(preset)}
              >
                {preset.label}
              </Button>
            ))}
            
            <div className="pt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="bg-primary text-primary-foreground rounded px-1.5 py-0.5 text-xs">1</span>
                days up to today
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="bg-primary text-primary-foreground rounded px-1.5 py-0.5 text-xs">1</span>
                days starting today
              </div>
            </div>
          </div>

          {/* Date Inputs and Calendars */}
          <div className="lg:col-span-3 space-y-4">
            {/* Date Input Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">From Date</Label>
                <Input
                  type="date"
                  value={fromDate ? format(fromDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => handleFromDateChange(e.target.value ? new Date(e.target.value) : undefined)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">To Date</Label>
                <Input
                  type="date"
                  value={toDate ? format(toDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => handleToDateChange(e.target.value ? new Date(e.target.value) : undefined)}
                  className="w-full"
                />
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-center">From Date</h4>
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={handleFromDateChange}
                  className={cn("w-full p-3 pointer-events-auto border rounded-md")}
                />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-center">To Date</h4>
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={handleToDateChange}
                  className={cn("w-full p-3 pointer-events-auto border rounded-md")}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!fromDate || !toDate}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Submit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};