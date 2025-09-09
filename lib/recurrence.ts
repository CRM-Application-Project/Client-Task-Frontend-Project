/**
 * Utility functions for handling recurrence rules
 */

export function parseRecurrenceRule(rrule: string): string {
  if (!rrule) return '';

  try {
    const parts = rrule.split(';');
    const ruleMap: Record<string, string> = {};
    
    parts.forEach(part => {
      const [key, value] = part.split('=');
      if (key && value) {
        ruleMap[key] = value;
      }
    });

    const freq = ruleMap.FREQ;
    const interval = parseInt(ruleMap.INTERVAL || '1');
    const byday = ruleMap.BYDAY;
    const count = ruleMap.COUNT;
    const until = ruleMap.UNTIL;

    let result = '';

    // Handle frequency
    switch (freq) {
      case 'DAILY':
        if (interval === 1) {
          result = 'Daily';
        } else {
          result = `Every ${interval} days`;
        }
        break;
      case 'WEEKLY':
        if (interval === 1) {
          result = 'Weekly';
        } else {
          result = `Every ${interval} weeks`;
        }
        
        if (byday) {
          const dayMap: Record<string, string> = {
            'MO': 'Monday',
            'TU': 'Tuesday', 
            'WE': 'Wednesday',
            'TH': 'Thursday',
            'FR': 'Friday',
            'SA': 'Saturday',
            'SU': 'Sunday'
          };
          
          const days = byday.split(',').map(day => dayMap[day] || day);
          
          if (days.length === 5 && days.every(day => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(day))) {
            result += ' (Weekdays)';
          } else if (days.length === 2 && days.every(day => ['Saturday', 'Sunday'].includes(day))) {
            result += ' (Weekends)';
          } else if (days.length === 1) {
            result += ` on ${days[0]}s`;
          } else if (days.length <= 3) {
            result += ` on ${days.join(', ')}`;
          } else {
            result += ` on ${days.slice(0, -1).join(', ')} and ${days[days.length - 1]}`;
          }
        }
        break;
      case 'MONTHLY':
        if (interval === 1) {
          result = 'Monthly';
        } else {
          result = `Every ${interval} months`;
        }
        break;
      case 'YEARLY':
        if (interval === 1) {
          result = 'Yearly';
        } else {
          result = `Every ${interval} years`;
        }
        break;
      default:
        result = freq?.toLowerCase() || 'Unknown frequency';
    }

    // Handle count/until
    if (count) {
      result += ` (${count} times)`;
    } else if (until) {
      const untilDate = new Date(until);
      result += ` (until ${untilDate.toLocaleDateString()})`;
    }

    return result;
  } catch (error) {
    console.error('Error parsing recurrence rule:', error);
    return 'Invalid recurrence rule';
  }
}

export function getRecurrenceIcon(): string {
  return '🔄'; // Unicode repeat symbol
}

export function isTaskRecurring(task: { isRecurring?: boolean; recurrenceRule?: string }): boolean {
  return Boolean(task.isRecurring && task.recurrenceRule);
}
