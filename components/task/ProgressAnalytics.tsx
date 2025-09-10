import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, FileText, TrendingUp, Clock, AlertTriangle, CheckCircle, Target, Calendar, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadWorklogExcel, TaskWorklog, TaskEffortReport, WorklogExcelRequest } from '@/app/services/data.service';
import { useToast } from '@/hooks/use-toast';

// Props interface
interface ProgressAnalyticsProps {
  task: {
    estimatedHours: number;
    actualHours: number;
    graceHours: number;
    startDate: string;
    endDate: string;
    status: string;
    priority: string;
    subject: string;
  };
  timesheetEntries?: TaskWorklog[];
  effortReports?: TaskEffortReport[];
  onClose: () => void;
  viewType?: 'graph' | 'timesheet';
  taskId: number;
}

const ProgressAnalytics: React.FC<ProgressAnalyticsProps> = ({ 
  task, 
  timesheetEntries = [],
  effortReports = [],
  onClose,
  viewType = 'graph',
  taskId
}) => {
  const { toast } = useToast();

  // Calculate analytics data
  const totalAllowedHours = task.estimatedHours + task.graceHours;
  const efficiency = (task.estimatedHours / task.actualHours) * 100;
  const overrun = Math.max(0, task.actualHours - task.estimatedHours);
  const utilizationRate = (task.actualHours / totalAllowedHours) * 100;

  // Generate chart data from effort reports
  const hoursBreakdown = [
    { name: 'Estimated', hours: task.estimatedHours, fill: '#3b82f6' },
    { name: 'Actual', hours: task.actualHours, fill: '#ef4444' },
    { name: 'Grace', hours: task.graceHours, fill: '#f59e0b' }
  ];

  // Generate daily progress from effort reports
  const dailyProgress = effortReports.length > 0 
    ? Object.entries(effortReports[0]?.dailyWorkedHours || {}).map(([date, hours], index) => ({
        day: new Date(date).toLocaleDateString(),
        cumulative: hours,
        planned: Math.min(task.estimatedHours, (index + 1) )
      }))
    : Array.from({ length: 10 }, (_, i) => ({
        day: `Day ${i + 1}`,
        cumulative: Math.min(task.actualHours, (i + 1) * (task.actualHours / 10)),
        planned: Math.min(task.estimatedHours, (i + 1) * (task.estimatedHours / 10))
      }));

  const efficiencyData = [
    { category: 'On Time', value: Math.max(0, 100 - overrun), fill: '#10b981' },
    { category: 'Overrun', value: Math.min(100, (overrun / task.estimatedHours) * 100), fill: '#ef4444' }
  ];

  // Use real timesheet data or fallback to empty array
  const getTimesheetData = () => {
    if (timesheetEntries && timesheetEntries.length > 0) {
      return timesheetEntries.map(entry => ({
        date: new Date(entry.startTime).toLocaleDateString(),
        hours: entry.workedHours,
        description: entry.comment || 'No description provided',
        user: entry.actionDoneBy.label
      }));
    }
    
    // Fallback to empty array if no timesheet entries
    return [];
  };

  const timesheetData = getTimesheetData();

  // Function to download timesheet as CSV using the API
  const downloadTimesheet = async () => {
    try {
      const response = await downloadWorklogExcel({
        taskId: taskId
      });
      
      const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `worklog-${task.subject.replace(/\s+/g, '-').toLowerCase()}.xlsx`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Worklog Excel file downloaded successfully",
      });
    } catch (error:any) {
      console.error('Error downloading worklog:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const GraphView = () => (
    <div className="space-y-6 p-4 bg-white border rounded-lg">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          Progress Analytics - Graph View
        </h4>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onClose}
        >
          Close
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hours Breakdown Bar Chart */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h5 className="font-medium text-gray-700 mb-3">Hours Breakdown</h5>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hoursBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Progress Line Chart */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h5 className="font-medium text-gray-700 mb-3">Progress Over Time</h5>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyProgress} margin={{ top: 5, right: 30, left: 60, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="day" 
                label={{ value: 'Date', position: 'insideBottomMiddle', offset: 0 }}
              />
              <YAxis 
                label={{ value: 'Time in Hours', angle: -90, position: 'insideMiddle', textAnchor: 'middle' }}
              />
              <Tooltip />
              <Line type="monotone" dataKey="cumulative" stroke="#ef4444" strokeWidth={2} name="Actual" />
              <Line type="monotone" dataKey="planned" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" name="Estimated" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Efficiency Pie Chart */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h5 className="font-medium text-gray-700 mb-3">Time Efficiency</h5>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={efficiencyData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                dataKey="value"
              >
                {efficiencyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>On Time</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Overrun</span>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h5 className="font-medium text-gray-700 mb-3">Key Metrics</h5>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Efficiency Rate</span>
              <span className={`font-semibold ${efficiency >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                {efficiency.toFixed(1)}%
              </span>
            </div>
            {/* <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Utilization Rate</span>
              <span className="font-semibold text-blue-600">
                {utilizationRate.toFixed(1)}%
              </span>
            </div> */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Hours Overrun</span>
              <span className={`font-semibold ${overrun > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {overrun.toFixed(1)}h
              </span>
            </div>
            {effortReports.length > 0 && (
              <>
                {/* <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Task Status</span>
                  <span className={`font-semibold ${effortReports[0].isCompleted ? 'text-green-600' : 'text-blue-600'}`}>
                    {effortReports[0].isCompleted ? 'Completed' : 'In Progress'}
                  </span>
                </div> */}
                {effortReports[0].isOverdue && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Delay Hours</span>
                    <span className="font-semibold text-red-600">
                      {effortReports[0].delayHours || 0}h
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const TimesheetView = () => (
    <div className="space-y-6 p-4 bg-white border rounded-lg">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="h-5 w-5 text-green-500" />
          Timesheet - {task.subject}
        </h4>
        <div className="flex gap-2">
          {(timesheetData.length > 0 || timesheetEntries.length > 0) && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={downloadTimesheet}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Download Excel
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h5 className="font-medium text-gray-700 mb-4">Daily Work Log</h5>
        
        {timesheetData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No timesheet entries found</p>
            <p className="text-sm">Start logging your work hours to see them here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timesheetData.map((entry, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entry.date}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {entry.hours}h
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {entry.user || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {entry.description}
                    </td>
                  </tr>
                ))}
                {timesheetData.length > 0 && (
                  <tr className="bg-gray-100 font-semibold">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      Total
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {timesheetData.reduce((sum, entry) => sum + entry.hours, 0)}h
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      -
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      Completed {task.status.toLowerCase()}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1">
        {/* Summary Card */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h5 className="font-medium text-gray-700 mb-3">Time Summary</h5>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Estimated Hours:</span>
              <span className="text-sm font-medium">{task.estimatedHours}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Actual Hours:</span>
              <span className={`text-sm font-medium ${task.actualHours > task.estimatedHours ? 'text-red-600' : 'text-green-600'}`}>
                {task.actualHours}h
              </span>
            </div>
            {/* <div className="flex justify-between">
              <span className="text-sm text-gray-600">Variance:</span>
              <span className={`text-sm font-medium ${overrun > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {overrun > 0 ? '+' : ''}{(task.actualHours - task.estimatedHours).toFixed(1)}h
              </span>
            </div> */}
          </div>
        </div>

      </div>
    </div>
  );

  // Only render the requested view type
  if (viewType === 'graph') {
    return <GraphView />;
  } else if (viewType === 'timesheet') {
    return <TimesheetView />;
  }

  // Fallback
  return <GraphView />;
};

export default ProgressAnalytics;