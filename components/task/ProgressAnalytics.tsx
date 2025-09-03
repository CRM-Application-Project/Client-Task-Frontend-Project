import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, FileText, TrendingUp, Clock, AlertTriangle, CheckCircle, Target, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  onClose: () => void;
  viewType?: 'graph' | 'report'; // Determine which view to show
}

const ProgressAnalytics: React.FC<ProgressAnalyticsProps> = ({ 
  task, 
  onClose,
  viewType = 'graph'
}) => {
  // Calculate analytics data
  const totalAllowedHours = task.estimatedHours + task.graceHours;
  const efficiency = (task.estimatedHours / task.actualHours) * 100;
  const overrun = Math.max(0, task.actualHours - task.estimatedHours);
  const utilizationRate = (task.actualHours / totalAllowedHours) * 100;

  // Generate chart data
  const hoursBreakdown = [
    { name: 'Estimated', hours: task.estimatedHours, fill: '#3b82f6' },
    { name: 'Actual', hours: task.actualHours, fill: '#ef4444' },
    { name: 'Grace', hours: task.graceHours, fill: '#f59e0b' }
  ];

  const dailyProgress = Array.from({ length: 10 }, (_, i) => ({
    day: `Day ${i + 1}`,
    cumulative: Math.min(task.actualHours, (i + 1) * (task.actualHours / 10)),
    planned: Math.min(task.estimatedHours, (i + 1) * (task.estimatedHours / 10))
  }));

  const efficiencyData = [
    { category: 'On Time', value: Math.max(0, 100 - overrun), fill: '#10b981' },
    { category: 'Overrun', value: Math.min(100, (overrun / task.estimatedHours) * 100), fill: '#ef4444' }
  ];

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
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dailyProgress}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="cumulative" stroke="#ef4444" strokeWidth={2} name="Actual" />
              <Line type="monotone" dataKey="planned" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" name="Planned" />
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
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Utilization Rate</span>
              <span className="font-semibold text-blue-600">
                {utilizationRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Hours Overrun</span>
              <span className={`font-semibold ${overrun > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {overrun.toFixed(1)}h
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const ReportView = () => (
    <div className="space-y-6 p-4 bg-white border rounded-lg">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="h-5 w-5 text-green-500" />
          Progress Analytics - Report View
        </h4>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onClose}
        >
          Close
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Executive Summary */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-lg">
          <h5 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Executive Summary
          </h5>
          <div className="space-y-3 text-sm">
            <p className="text-gray-700">
              Task <strong>{task.subject}</strong> has been completed with the following performance metrics:
            </p>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Status: <strong className="text-gray-800">{task.status}</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>Time utilization: <strong className="text-gray-800">{utilizationRate.toFixed(1)}%</strong> of allocated time</span>
              </li>
              <li className="flex items-start gap-2">
                {efficiency >= 100 ? (
                  <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                )}
                <span>Efficiency: <strong className="text-gray-800">{efficiency.toFixed(1)}%</strong> efficiency rate</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Time Analysis */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-lg">
          <h5 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time Analysis
          </h5>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-white rounded-md">
                <div className="text-2xl font-bold text-blue-600">{task.estimatedHours}h</div>
                <div className="text-xs text-gray-500">Estimated</div>
              </div>
              <div className="text-center p-3 bg-white rounded-md">
                <div className="text-2xl font-bold text-red-600">{task.actualHours}h</div>
                <div className="text-xs text-gray-500">Actual</div>
              </div>
            </div>
            
            <div className="bg-white p-3 rounded-md">
              <div className="text-center">
                <div className={`text-lg font-bold ${overrun > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {overrun > 0 ? '+' : ''}{(task.actualHours - task.estimatedHours).toFixed(1)}h
                </div>
                <div className="text-xs text-gray-500">Variance from Estimate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="lg:col-span-2 bg-gradient-to-br from-purple-50 to-pink-100 p-6 rounded-lg">
          <h5 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Performance Insights
          </h5>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white p-4 rounded-md text-center">
              <div className={`text-xl font-bold ${efficiency >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                {efficiency.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Efficiency Rate</div>
              <div className="text-xs text-gray-500 mt-1">
                {efficiency >= 100 ? 'Above target' : 'Below target'}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-md text-center">
              <div className="text-xl font-bold text-blue-600">
                {utilizationRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Resource Utilization</div>
              <div className="text-xs text-gray-500 mt-1">
                Of total allocated time
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-md text-center">
              <div className={`text-xl font-bold ${overrun <= task.graceHours ? 'text-green-600' : 'text-red-600'}`}>
                {task.graceHours}h
              </div>
              <div className="text-sm text-gray-600">Grace Period</div>
              <div className="text-xs text-gray-500 mt-1">
                {overrun <= task.graceHours ? 'Within limits' : 'Exceeded'}
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-md">
            <h6 className="font-medium text-gray-700 mb-3">Recommendations</h6>
            <div className="space-y-2 text-sm text-gray-600">
              {efficiency >= 100 ? (
                <p className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Excellent time management - task completed within estimated timeframe.
                </p>
              ) : (
                <p className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  Consider reviewing estimation methodology for future similar tasks.
                </p>
              )}
              
              {utilizationRate > 90 ? (
                <p className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  High resource utilization detected - consider adding buffer time for future tasks.
                </p>
              ) : (
                <p className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Good resource management with adequate buffer maintained.
                </p>
              )}
              
              <p className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                Task duration: {Math.ceil((new Date(task.endDate).getTime() - new Date(task.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Only render the requested view type
  if (viewType === 'graph') {
    return <GraphView />;
  } else if (viewType === 'report') {
    return <ReportView />;
  }

  // Fallback
  return <GraphView />;
};

export default ProgressAnalytics;