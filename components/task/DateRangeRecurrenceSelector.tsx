import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Repeat, ChevronDown, X, Plus } from 'lucide-react';

interface DateRange {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  recurrenceType: string;
  recurrenceInterval: number;
  weekdays: number[];
  monthlyType: string;
  endType: string;
  occurrences: number;
  recurrenceEndDate: string;
  excludeWeekends: boolean;
  excludeHolidays: boolean;
}

interface DateRangeRecurrenceSelectorProps {
  onDateRangeChange?: (dateRange: DateRange) => void;
  initialDateRange?: Partial<DateRange>;
  disabled?: boolean;
}

const DateRangeRecurrenceSelector: React.FC<DateRangeRecurrenceSelectorProps> = ({ 
  onDateRangeChange, 
  initialDateRange = {},
  disabled = false 
}) => {
  const [showRecurrence, setShowRecurrence] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '17:00',
    isRecurring: false,
    recurrenceType: 'daily',
    recurrenceInterval: 1,
    weekdays: [],
    monthlyType: 'date',
    endType: 'never',
    occurrences: 10,
    recurrenceEndDate: '',
    excludeWeekends: false,
    excludeHolidays: false
  });

  const weekDays = [
    { value: 0, label: 'Sun', fullName: 'Sunday' },
    { value: 1, label: 'Mon', fullName: 'Monday' },
    { value: 2, label: 'Tue', fullName: 'Tuesday' },
    { value: 3, label: 'Wed', fullName: 'Wednesday' },
    { value: 4, label: 'Thu', fullName: 'Thursday' },
    { value: 5, label: 'Fri', fullName: 'Friday' },
    { value: 6, label: 'Sat', fullName: 'Saturday' }
  ];

  const recurrenceTypes = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'weekdays', label: 'Weekdays Only' },
    { value: 'custom', label: 'Custom' }
  ];

  const getCurrentDate = (): string => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  const getCurrentTime = (): string => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  useEffect(() => {
    if (initialDateRange) {
      setDateRange(prev => ({ ...prev, ...initialDateRange } as DateRange));
      setShowRecurrence(initialDateRange.isRecurring || false);
    }
  }, [initialDateRange]);

  useEffect(() => {
    if (onDateRangeChange) {
      onDateRangeChange(dateRange);
    }
  }, [dateRange, onDateRangeChange]);

  const handleDateRangeUpdate = (field: keyof DateRange, value: any) => {
    setDateRange(prev => {
      const updated = { ...prev, [field]: value } as DateRange;
      
      // Auto-adjust end date if start date is later
      if (field === 'startDate' && updated.endDate && value > updated.endDate) {
        updated.endDate = value;
      }
      
      return updated;
    });
  };

  const handleWeekdayToggle = (dayValue: number) => {
    setDateRange(prev => ({
      ...prev,
      weekdays: prev.weekdays.includes(dayValue)
        ? prev.weekdays.filter(day => day !== dayValue)
        : [...prev.weekdays, dayValue].sort()
    }));
  };

  const handleRecurrenceTypeChange = (type: string) => {
    setDateRange(prev => {
      const updated = { ...prev, recurrenceType: type };
      
      // Set default weekdays for weekdays-only recurrence
      if (type === 'weekdays') {
        updated.weekdays = [1, 2, 3, 4, 5]; // Monday to Friday
        updated.excludeWeekends = true;
      } else if (type === 'weekly' && prev.weekdays.length === 0) {
        // Set current day of week as default for weekly recurrence
        const today = new Date();
        updated.weekdays = [today.getDay()];
      }
      
      return updated;
    });
  };

  const getRecurrencePreview = (): string | null => {
    if (!dateRange.isRecurring) return null;
    
    const { recurrenceType, recurrenceInterval, weekdays, endType, occurrences, recurrenceEndDate } = dateRange;
    
    let preview = '';
    
    switch (recurrenceType) {
      case 'daily':
        preview = recurrenceInterval === 1 ? 'Every day' : `Every ${recurrenceInterval} days`;
        break;
      case 'weekly':
        if (weekdays.length === 0) {
          preview = recurrenceInterval === 1 ? 'Every week' : `Every ${recurrenceInterval} weeks`;
        } else {
          const dayNames = weekdays.map(day => weekDays.find(wd => wd.value === day)?.label).join(', ');
          preview = recurrenceInterval === 1 
            ? `Every week on ${dayNames}` 
            : `Every ${recurrenceInterval} weeks on ${dayNames}`;
        }
        break;
      case 'monthly':
        preview = recurrenceInterval === 1 ? 'Every month' : `Every ${recurrenceInterval} months`;
        break;
      case 'yearly':
        preview = recurrenceInterval === 1 ? 'Every year' : `Every ${recurrenceInterval} years`;
        break;
      case 'weekdays':
        preview = 'Every weekday (Mon-Fri)';
        break;
      default:
        preview = 'Custom recurrence';
    }
    
    if (dateRange.excludeWeekends && recurrenceType !== 'weekdays') {
      preview += ', excluding weekends';
    }
    
    if (endType === 'after') {
      preview += `, for ${occurrences} occurrences`;
    } else if (endType === 'on' && recurrenceEndDate) {
      preview += `, until ${recurrenceEndDate}`;
    }
    
    return preview;
  };

  const toggleRecurrence = () => {
    const newRecurring = !dateRange.isRecurring;
    setDateRange(prev => ({ 
      ...prev, 
      isRecurring: newRecurring,
      // Reset some fields when turning off recurrence
      ...(newRecurring ? {} : {
        recurrenceType: 'daily',
        weekdays: [],
        endType: 'never',
        excludeWeekends: false
      })
    } as DateRange));
    setShowRecurrence(newRecurring);
  };

  const quickSelectWeekdays = (type: 'weekdays' | 'weekend' | 'all' | 'clear') => {
    let days: number[] = [];
    switch (type) {
      case 'weekdays':
        days = [1, 2, 3, 4, 5];
        break;
      case 'weekend':
        days = [0, 6];
        break;
      case 'all':
        days = [0, 1, 2, 3, 4, 5, 6];
        break;
      case 'clear':
        days = [];
        break;
    }
    setDateRange(prev => ({ ...prev, weekdays: days }));
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Date Range & Schedule
        </h3>
        
        <button
          type="button"
          onClick={toggleRecurrence}
          className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            dateRange.isRecurring
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          disabled={disabled}
        >
          <Repeat className="w-4 h-4" />
          {dateRange.isRecurring ? 'Recurring' : 'One-time'}
        </button>
      </div>

      {/* Basic Date & Time Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Start Date & Time
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateRangeUpdate('startDate', e.target.value)}
              min={getCurrentDate()}
              disabled={disabled}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="time"
              value={dateRange.startTime}
              onChange={(e) => handleDateRangeUpdate('startTime', e.target.value)}
              disabled={disabled}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            End Date & Time
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateRangeUpdate('endDate', e.target.value)}
              min={dateRange.startDate || getCurrentDate()}
              disabled={disabled}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="time"
              value={dateRange.endTime}
              onChange={(e) => handleDateRangeUpdate('endTime', e.target.value)}
              disabled={disabled}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Recurrence Options */}
      {showRecurrence && dateRange.isRecurring && (
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-medium text-gray-900">Recurrence Settings</h4>
          </div>

          {/* Recurrence Type & Interval */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Repeat
              </label>
              <select
                value={dateRange.recurrenceType}
                onChange={(e) => handleRecurrenceTypeChange(e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {recurrenceTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {dateRange.recurrenceType !== 'weekdays' && dateRange.recurrenceType !== 'custom' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Every
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={dateRange.recurrenceInterval}
                    onChange={(e) => handleDateRangeUpdate('recurrenceInterval', parseInt(e.target.value) || 1)}
                    disabled={disabled}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="text-sm text-gray-600">
                    {dateRange.recurrenceType === 'daily' ? 'day(s)' :
                     dateRange.recurrenceType === 'weekly' ? 'week(s)' :
                     dateRange.recurrenceType === 'monthly' ? 'month(s)' :
                     dateRange.recurrenceType === 'yearly' ? 'year(s)' : ''}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Weekly Day Selection */}
          {(dateRange.recurrenceType === 'weekly' || dateRange.recurrenceType === 'custom') && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Days of the week
              </label>
              
              <div className="flex flex-wrap gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => quickSelectWeekdays('weekdays')}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  disabled={disabled}
                >
                  Weekdays
                </button>
                <button
                  type="button"
                  onClick={() => quickSelectWeekdays('weekend')}
                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                  disabled={disabled}
                >
                  Weekend
                </button>
                <button
                  type="button"
                  onClick={() => quickSelectWeekdays('all')}
                  className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                  disabled={disabled}
                >
                  All Days
                </button>
                <button
                  type="button"
                  onClick={() => quickSelectWeekdays('clear')}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  disabled={disabled}
                >
                  Clear
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {weekDays.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleWeekdayToggle(day.value)}
                    disabled={disabled}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      dateRange.weekdays.includes(day.value)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Additional Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={dateRange.excludeWeekends}
                  onChange={(e) => handleDateRangeUpdate('excludeWeekends', e.target.checked)}
                  disabled={disabled || dateRange.recurrenceType === 'weekdays'}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Exclude weekends
              </label>
              
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={dateRange.excludeHolidays}
                  onChange={(e) => handleDateRangeUpdate('excludeHolidays', e.target.checked)}
                  disabled={disabled}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Exclude holidays
              </label>
            </div>
          </div>

          {/* End Conditions */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              End recurrence
            </label>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="endType"
                  value="never"
                  checked={dateRange.endType === 'never'}
                  onChange={(e) => handleDateRangeUpdate('endType', e.target.value)}
                  disabled={disabled}
                  className="text-blue-600 focus:ring-blue-500"
                />
                Never
              </label>
              
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="endType"
                  value="after"
                  checked={dateRange.endType === 'after'}
                  onChange={(e) => handleDateRangeUpdate('endType', e.target.value)}
                  disabled={disabled}
                  className="text-blue-600 focus:ring-blue-500"
                />
                After
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={dateRange.occurrences}
                  onChange={(e) => handleDateRangeUpdate('occurrences', parseInt(e.target.value) || 1)}
                  disabled={disabled || dateRange.endType !== 'after'}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                occurrences
              </label>
              
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="endType"
                  value="on"
                  checked={dateRange.endType === 'on'}
                  onChange={(e) => handleDateRangeUpdate('endType', e.target.value)}
                  disabled={disabled}
                  className="text-blue-600 focus:ring-blue-500"
                />
                On
                <input
                  type="date"
                  value={dateRange.recurrenceEndDate}
                  onChange={(e) => handleDateRangeUpdate('recurrenceEndDate', e.target.value)}
                  min={dateRange.startDate || getCurrentDate()}
                  disabled={disabled || dateRange.endType !== 'on'}
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </label>
            </div>
          </div>

          {/* Preview */}
          {getRecurrencePreview() && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Recurrence Summary</p>
                  <p className="text-sm text-blue-700">{getRecurrencePreview()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="bg-gray-50 rounded-md p-3 text-sm">
        <strong>Schedule Summary:</strong>
        <div className="mt-1">
          {dateRange.startDate && dateRange.endDate ? (
            <span>
              From {dateRange.startDate} at {dateRange.startTime} to {dateRange.endDate} at {dateRange.endTime}
              {dateRange.isRecurring && getRecurrencePreview() && (
                <span className="block mt-1 text-blue-600">{getRecurrencePreview()}</span>
              )}
            </span>
          ) : (
            <span className="text-gray-500">Please select start and end dates</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DateRangeRecurrenceSelector;