import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

interface CustomDateTimePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minDate?: Date;
}

const CustomDateTimePicker: React.FC<CustomDateTimePickerProps> = ({
  value,
  onChange,
  placeholder = "Select date and time",
  disabled = false,
  className = "",
  minDate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('09:00');
  const containerRef = useRef<HTMLDivElement>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    if (value) {
      setCurrentDate(new Date(value.getFullYear(), value.getMonth(), 1));
      const hours = value.getHours().toString().padStart(2, '0');
      const minutes = value.getMinutes().toString().padStart(2, '0');
      setSelectedTime(`${hours}:${minutes}`);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return '';
    const dateStr = date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return `${dateStr} ${timeStr}`;
  };

  const isDateDisabled = (date: Date) => {
    if (!minDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return;
    
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    onChange(newDate);
  };

  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
    if (value) {
      const [hours, minutes] = time.split(':').map(Number);
      const newDate = new Date(value);
      newDate.setHours(hours, minutes, 0, 0);
      onChange(newDate);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(timeString);
      }
    }
    return options;
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input Field */}
      <div
        className={`
          w-full h-10 px-3 border border-gray-300 rounded-md bg-white text-sm
          flex items-center justify-between cursor-pointer
          hover:border-gray-400 focus-within:ring-1 focus-within:ring-gray-400
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-500'}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>
        <Calendar className="w-4 h-4 text-gray-400" />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-11 left-0 z-[10000] bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[320px]">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => navigateMonth('prev')}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="font-medium text-gray-900">
              {months[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <button
              type="button"
              onClick={() => navigateMonth('next')}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekdays.map(day => (
              <div key={day} className="text-xs font-medium text-gray-500 text-center py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {getDaysInMonth(currentDate).map((date, index) => {
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              const isSelected = value && 
                date.getDate() === value.getDate() &&
                date.getMonth() === value.getMonth() &&
                date.getFullYear() === value.getFullYear();
              const isDisabled = isDateDisabled(date);
              const isToday = 
                date.getDate() === new Date().getDate() &&
                date.getMonth() === new Date().getMonth() &&
                date.getFullYear() === new Date().getFullYear();

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDateClick(date)}
                  disabled={isDisabled}
                  className={`
                    w-8 h-8 text-xs rounded flex items-center justify-center
                    transition-colors duration-200
                    ${!isCurrentMonth ? 'text-gray-300' : ''}
                    ${isSelected ? 'bg-gray-900 text-white' : ''}
                    ${!isSelected && isCurrentMonth && !isDisabled ? 'hover:bg-gray-100 text-gray-900' : ''}
                    ${isDisabled ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer'}
                    ${isToday && !isSelected ? 'bg-blue-50 text-blue-600 font-medium' : ''}
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Time Selection */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Time</span>
            </div>
            <select
              value={selectedTime}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
            >
              {generateTimeOptions().map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 text-sm bg-brand-primary text-text-white rounded hover:bg-brand-primary/90"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDateTimePicker;