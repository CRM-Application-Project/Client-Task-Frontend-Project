import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  isWithinInterval,
} from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { RiResetRightLine } from "react-icons/ri";
import clsx from "clsx";
// import { DateRange,DateRangePickerProps } from "../types/dateRangePicker/type";

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

const isFutureDate = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to compare only dates
  return date > today;
};

export interface DateRangePickerProps {
  onDateRangeChange: (range: DateRange) => void;
  initialRange: DateRange;
  dropdownPosition?: "left" | "right";
}

const quickRanges = [
  {
    label: "Today",
    range: {
      startDate: new Date(),
      endDate: new Date(),
    },
  },
  {
    label: "Yesterday",
    range: {
      startDate: subDays(new Date(), 1),
      endDate: subDays(new Date(), 1),
    },
  },
  {
    label: "Last Week",
    range: {
      startDate: startOfWeek(subDays(new Date(), 7)),
      endDate: endOfWeek(subDays(new Date(), 7)),
    },
  },
  {
    label: "Last Month",
    range: {
      startDate: startOfMonth(subDays(new Date(), 30)),
      endDate: endOfMonth(subDays(new Date(), 30)),
    },
  },
  {
    label: "Last 30 Days",
    range: {
      startDate: subDays(new Date(), 30),
      endDate: new Date(),
    },
  },
];

const DateRangePicker = ({
  onDateRangeChange,
  initialRange,
  dropdownPosition = "right",
}: DateRangePickerProps) => {
  const [selectedRange, setSelectedRange] = useState<DateRange>(initialRange);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [selectingStart, setSelectingStart] = useState(true);
  const pickerRef = useRef<HTMLDivElement>(null);

  const daysInMonth = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
      }),
    [currentMonth]
  );

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      pickerRef.current &&
      !pickerRef.current.contains(event.target as Node)
    ) {
      setShowPicker(false);
      setSelectingStart(true);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  const handleDateClick = useCallback(
    (date: Date) => {
      // Prevent selecting future dates
      if (isFutureDate(date)) {
        return;
      }

      if (selectingStart) {
        const newRange = { startDate: date, endDate: date };
        setSelectedRange(newRange);
        onDateRangeChange(newRange);
        setSelectingStart(false);
      } else {
        setSelectedRange((prevRange: DateRange) => {
          const [newStart, newEnd] = [prevRange.startDate, date].sort(
            (a: Date, b: Date) => a.getTime() - b.getTime()
          );
          const finalRange: DateRange = {
            startDate: newStart,
            endDate: newEnd,
          };

          onDateRangeChange(finalRange);

          return finalRange;
        });

        setShowPicker(false);
        setSelectingStart(true);
      }
    },
    [selectingStart, onDateRangeChange]
  );

  const handleQuickRangeSelect = useCallback(
    (range: DateRange) => {
      // Ensure end date is not in the future
      const today = new Date();
      const safeRange = {
        startDate: range.startDate,
        endDate: range.endDate > today ? today : range.endDate,
      };

      setSelectedRange(safeRange);
      onDateRangeChange(safeRange);
      setCurrentMonth(safeRange.startDate);
      setShowPicker(false);
      setSelectingStart(true);
    },
    [onDateRangeChange]
  );

  const clearSelection = useCallback(() => {
    const defaultRange = {
      startDate: subDays(new Date(), 30),
      endDate: new Date(),
    };
    setSelectedRange(defaultRange);
    onDateRangeChange(defaultRange);
    setCurrentMonth(defaultRange.startDate);
    setShowPicker(false);
    setSelectingStart(true);
  }, [onDateRangeChange]);

  const dateState = useCallback(
    (date: Date) => ({
      isSelected: isWithinInterval(date, {
        start: selectedRange.startDate,
        end: selectedRange.endDate,
      }),
      isStart: isSameDay(date, selectedRange.startDate),
      isEnd: isSameDay(date, selectedRange.endDate),
      isCurrentMonth: isSameMonth(date, currentMonth),
    }),
    [selectedRange, currentMonth]
  );

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => {
          setShowPicker(!showPicker);
          setSelectingStart(true);
        }}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-100 text-sm"
        aria-label="Select date range"
      >
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-gray-500" />
          <span>
            {format(selectedRange.startDate, "d MMM")} -{" "}
            {format(selectedRange.endDate, "d MMM")}
          </span>
        </div>
        <ChevronDown
          className={clsx(
            "w-4 h-4 text-gray-500 transition-transform",
            showPicker ? "rotate-180" : ""
          )}
        />
      </button>

      {showPicker && (
        <div
          className={clsx(
            "absolute z-10 bg-white border border-gray-200 rounded-md shadow-lg p-2",
            "w-full sm:w-[450px] max-w-[95vw]",
            dropdownPosition === "left" ? "left-0" : "right-0"
          )}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Previous month"
              >
                <ChevronDown className="w-4 h-4 rotate-90 text-gray-500" />
              </button>
              <h3 className="text-sm font-medium">
                {format(currentMonth, "MMMM yyyy")}
              </h3>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Next month"
              >
                <ChevronDown className="w-4 h-4 -rotate-90 text-gray-500" />
              </button>
            </div>
            <button
              onClick={clearSelection}
              className="p-1 rounded hover:bg-gray-100 flex items-center gap-1 text-xs"
              aria-label="Reset date range"
            >
              <RiResetRightLine className="w-4 h-4 text-gray-500" />
              <span>Reset</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="sm:w-40 pl-0 sm:pl-2">
              <h4 className="text-xs font-medium mb-2">Quick Range</h4>
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
                {quickRanges.map((option) => (
                  <button
                    key={option.label}
                    onClick={() => handleQuickRangeSelect(option.range)}
                    className="text-xs p-1.5 border rounded hover:bg-gray-50 text-left"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <div
                    key={day}
                    className="text-xs text-center text-gray-500 font-medium"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {daysInMonth.map((day) => {
                  const { isSelected, isStart, isEnd, isCurrentMonth } =
                    dateState(day);
                  const futureDate = isFutureDate(day);

                  return (
                    <button
                      key={day.toString()}
                      onClick={() => !futureDate && handleDateClick(day)}
                      className={clsx(
                        "h-8 w-8 rounded-full text-sm flex items-center justify-center",
                        "transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300",
                        futureDate && "opacity-50 cursor-not-allowed",
                        !futureDate && isCurrentMonth && "text-gray-900",
                        !futureDate && !isCurrentMonth && "text-gray-400",
                        !futureDate && isSelected && "bg-blue-100",
                        !futureDate &&
                          isStart &&
                          "bg-blue-500 text-white rounded-l-full",
                        !futureDate &&
                          isEnd &&
                          "bg-blue-500 text-white rounded-r-full",
                        !futureDate && !isStart && !isEnd && "hover:bg-gray-100"
                      )}
                      disabled={futureDate}
                      aria-label={`Select ${format(day, "MMMM do, yyyy")}`}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
