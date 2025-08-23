"use client";
import React, { useState } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
} from "date-fns";
import { X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { CustomDialogContent } from "../ui/custom-dialog-content";
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

export const TaskDateRangePicker = ({
  isOpen,
  onClose,
  onSelect,
  initialRange,
}: DateRangePickerProps) => {
  // Helper functions to check if dates are placeholder dates
  const isPlaceholderFromDate = (date: Date) => 
    date.getTime() <= new Date('1970-01-02').getTime();
  
  const isPlaceholderToDate = (date: Date) => 
    date.getTime() >= new Date('2099-12-30').getTime();

  // Initialize with actual dates if they're not placeholders
  const initialFromDate = initialRange?.from && !isPlaceholderFromDate(initialRange.from) 
    ? initialRange.from 
    : undefined;
  
  const initialToDate = initialRange?.to && !isPlaceholderToDate(initialRange.to) 
    ? initialRange.to 
    : undefined;

  const [selectedRange, setSelectedRange] = useState<DateRange>(
    initialRange || { from: new Date(), to: new Date() }
  );
  const [fromDate, setFromDate] = useState<Date | undefined>(initialFromDate);
  const [toDate, setToDate] = useState<Date | undefined>(initialToDate);

  const presetRanges = [
    {
      label: "Today",
      value: () => ({ from: new Date(), to: new Date() }),
    },
    {
      label: "Yesterday",
      value: () => {
        const yesterday = subDays(new Date(), 1);
        return { from: yesterday, to: yesterday };
      },
    },
    {
      label: "This Week",
      value: () => ({
        from: startOfWeek(new Date(), { weekStartsOn: 1 }),
        to: endOfWeek(new Date(), { weekStartsOn: 1 }),
      }),
    },
    {
      label: "Last Week",
      value: () => {
        const lastWeek = subWeeks(new Date(), 1);
        return {
          from: startOfWeek(lastWeek, { weekStartsOn: 1 }),
          to: endOfWeek(lastWeek, { weekStartsOn: 1 }),
        };
      },
    },
    {
      label: "This Month",
      value: () => ({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      }),
    },
    {
      label: "Last Month",
      value: () => {
        const lastMonth = subMonths(new Date(), 1);
        return {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        };
      },
    },
  ];

  const [selectedPreset, setSelectedPreset] = useState<{
    label: string;
    startDate: Date;
    endDate: Date;
  } | null>(null);

  const handlePresetSelect = (preset: (typeof presetRanges)[0]) => {
    const range = preset.value();
    setSelectedRange(range);
    setSelectedPreset({
      label: preset.label,
      startDate: range.from,
      endDate: range.to,
    });
    setFromDate(range.from);
    setToDate(range.to);
  };

  const handleSubmit = () => {
    // Allow submission if at least one date is selected
    if (fromDate || toDate) {
      onSelect({ 
        from: fromDate || new Date('1970-01-01'), // Use placeholder for missing from date
        to: toDate || new Date('2099-12-31') // Use placeholder for missing to date
      });
      onClose();
    }
  };

  const handleFromDateChange = (date: Date | undefined) => {
    setFromDate(date);
    if (date) {
      setSelectedRange((prev) => ({ ...prev, from: date }));
      // Clear preset selection when manually selecting dates
      setSelectedPreset(null);
    }
  };

  const handleToDateChange = (date: Date | undefined) => {
    setToDate(date);
    if (date) {
      setSelectedRange((prev) => ({ ...prev, to: date }));
      // Clear preset selection when manually selecting dates
      setSelectedPreset(null);
    }
  };

  const clearFromDate = () => {
    setFromDate(undefined);
    setSelectedPreset(null);
  };

  const clearToDate = () => {
    setToDate(undefined);
    setSelectedPreset(null);
  };

  return (
    <Dialog open={isOpen}>
      <CustomDialogContent
        className="max-w-4xl max-h-[90vh] p-0 overflow-hidden"
        onInteractOutside={onClose}
        hideCloseButton
      >
        <div className="px-3 py-2 flex items-center justify-between border-b">
          <h3 className="text-sm font-semibold">Select Date Range</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary-foreground/50"
            aria-label="Close date picker"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-3 max-h-[calc(85vh-80px)] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Preset Options */}
            <div className="space-y-1">
              {presetRanges.map((preset) => {
                const isActive = selectedPreset?.label === preset.label;
                return (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    className={`w-full justify-start text-xs font-normal py-1 h-7 border rounded-md transition-colors 
          ${isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent"}`}
                    onClick={() => handlePresetSelect(preset)}
                  >
                    {preset.label}
                  </Button>
                );
              })}
            </div>

            {/* Date Inputs and Calendars */}
            <div className="lg:col-span-2 space-y-2">
              {/* Date Input Fields with Clear Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">From (Optional)</Label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={fromDate ? format(fromDate, "yyyy-MM-dd") : ""}
                      onChange={(e) =>
                        handleFromDateChange(
                          e.target.value ? new Date(e.target.value) : undefined
                        )
                      }
                      className="w-full h-7 text-xs pr-7"
                      placeholder="Select start date"
                    />
                    {fromDate && (
                      <button
                        type="button"
                        onClick={clearFromDate}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">To (Optional)</Label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={toDate ? format(toDate, "yyyy-MM-dd") : ""}
                      onChange={(e) =>
                        handleToDateChange(
                          e.target.value ? new Date(e.target.value) : undefined
                        )
                      }
                      className="w-full h-7 text-xs pr-7"
                      placeholder="Select end date"
                    />
                    {toDate && (
                      <button
                        type="button"
                        onClick={clearToDate}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-center">From Date</h4>
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={handleFromDateChange}
                    className={cn(
                      "w-full p-1 pointer-events-auto border rounded-md"
                    )}
                    classNames={{
                      day: "h-6 w-6 text-xs rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors",
                      day_selected: "bg-primary text-white rounded-full",
                      day_today:
                        "border border-primary text-primary font-semibold",
                      caption: "flex justify-center pt-0.5 relative items-center text-xs",
                      nav_button: "h-5 w-5",
                      head_cell:
                        "text-muted-foreground rounded-md w-6 font-normal text-[0.7rem]",
                      table: "w-full border-collapse space-y-0",
                      head_row: "flex mb-1",
                      row: "flex w-full mt-0.5",
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-center">To Date</h4>
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={handleToDateChange}
                    disabled={(date) => fromDate ? date < fromDate : false}
                    className={cn(
                      "w-full p-1 pointer-events-auto border rounded-md"
                    )}
                    classNames={{
                      day: "h-6 w-6 text-xs rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors",
                      day_selected: "bg-primary text-white rounded-full",
                      day_today:
                        "border border-primary text-primary font-semibold",
                      caption: "flex justify-center pt-0.5 relative items-center text-xs",
                      nav_button: "h-5 w-5",
                      head_cell:
                        "text-muted-foreground rounded-md w-6 font-normal text-[0.7rem]",
                      day_disabled: "text-gray-300 cursor-not-allowed",
                      table: "w-full border-collapse space-y-0",
                      head_row: "flex mb-1",
                      row: "flex w-full mt-0.5",
                    }}
                  />
                </div>
              </div>

              {/* Selection Summary */}
              {(fromDate || toDate) && (
                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs text-blue-800">
                    <strong>Filter: </strong>
                    {fromDate && toDate ? (
                      `Tasks between ${format(fromDate, "MMM dd, yyyy")} and ${format(toDate, "MMM dd, yyyy")}`
                    ) : fromDate ? (
                      `Tasks from ${format(fromDate, "MMM dd, yyyy")} onwards`
                    ) : (
                      `Tasks until ${format(toDate!, "MMM dd, yyyy")}`
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2 mt-2 border-t">
            <Button variant="outline" size="sm" onClick={onClose} className="h-7 px-3 text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!fromDate && !toDate} // Enable when at least one date is selected
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-7 px-3 text-xs"
            >
              Apply
            </Button>
          </div>
        </div>
      </CustomDialogContent>
    </Dialog>
  );
};