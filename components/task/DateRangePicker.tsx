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
  isBefore,
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

export const DateRangePicker = ({
  isOpen,
  onClose,
  onSelect,
  initialRange,
}: DateRangePickerProps) => {
  const [selectedRange, setSelectedRange] = useState<DateRange>(
    initialRange || { from: new Date(), to: new Date() }
  );
  const [fromDate, setFromDate] = useState<Date | undefined>(
    selectedRange.from
  );
  const [toDate, setToDate] = useState<Date | undefined>(selectedRange.to);

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
    if (fromDate && toDate) {
      onSelect({ from: fromDate, to: toDate });
      onClose();
    }
  };

  const handleFromDateChange = (date: Date | undefined) => {
    if (!date) return;
    
    // If the new from date is after the current to date, adjust both dates
    if (toDate && isBefore(toDate, date)) {
      setToDate(date);
      setSelectedRange({ from: date, to: date });
    } else {
      setSelectedRange((prev) => ({ ...prev, from: date }));
    }
    
    setFromDate(date);
  };

  const handleToDateChange = (date: Date | undefined) => {
    if (!date) return;
    
    // If the new to date is before the current from date, adjust both dates
    if (fromDate && isBefore(date, fromDate)) {
      setFromDate(date);
      setSelectedRange({ from: date, to: date });
    } else {
      setSelectedRange((prev) => ({ ...prev, to: date }));
    }
    
    setToDate(date);
  };

  return (
    <Dialog open={isOpen}>
      <CustomDialogContent
        className="max-w-3xl p-0 overflow-hidden bg-white"
        onInteractOutside={onClose}
        hideCloseButton
      >
        <div className="  p-4 flex items-center justify-between border-b">
          <h3 className="text-base font-semibold">Select Date Range</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary-foreground/50"
            aria-label="Close date picker"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Preset Options */}
            <div className="space-y-1">
              {presetRanges.map((preset) => {
                const isActive = selectedPreset?.label === preset.label; // your active condition
                return (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    className={`w-full justify-start text-xs font-normal py-1 h-8 border rounded-md transition-colors 
          ${isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent"}`}
                    onClick={() => handlePresetSelect(preset)}
                  >
                    {preset.label}
                  </Button>
                );
              })}
            </div>

            {/* Date Inputs and Calendars */}
            <div className="lg:col-span-3 space-y-3">
              {/* Date Input Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">From Date</Label>
                  <Input
                    type="date"
                    value={fromDate ? format(fromDate, "yyyy-MM-dd") : ""}
                    onChange={(e) =>
                      handleFromDateChange(
                        e.target.value ? new Date(e.target.value) : undefined
                      )
                    }
                    className="w-full h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">To Date</Label>
                  <Input
                    type="date"
                    value={toDate ? format(toDate, "yyyy-MM-dd") : ""}
                    onChange={(e) =>
                      handleToDateChange(
                        e.target.value ? new Date(e.target.value) : undefined
                      )
                    }
                    className="w-full h-8 text-xs"
                  />
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                      day: "h-8 w-8 text-xs rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors",
                      day_selected: "bg-brand-primary hover:bg-brand-primary text-white rounded-full",
                      day_today:
                        "border border-primary text-primary font-semibold",
                      caption: "flex justify-center pt-1 relative items-center",
                      nav_button: "h-6 w-6",
                      head_cell:
                        "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-center">To Date</h4>
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={handleToDateChange}
                    className={cn(
                      "w-full p-1 pointer-events-auto border rounded-md"
                    )}
                    classNames={{
                      day: "h-8 w-8 text-xs rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors",
                      day_selected: "bg-brand-primary hover:bg-brand-primary text-white rounded-full",
                      day_today:
                        "border border-primary text-primary font-semibold",
                      caption: "flex justify-center pt-1 relative items-center",
                      nav_button: "h-6 w-6",
                      head_cell:
                        "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!fromDate || !toDate}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Apply
            </Button>
          </div>
        </div>
      </CustomDialogContent>
    </Dialog>
  );
};