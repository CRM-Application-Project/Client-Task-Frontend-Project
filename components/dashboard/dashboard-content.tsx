"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Plus,
  Filter,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';

const stats = [
  {
    name: 'Total Leads',
    value: '2,651',
    change: '+4.75%',
    changeType: 'positive' as const,
    icon: Users,
  },
  {
    name: 'Conversion Rate',
    value: '24.8%',
    change: '+2.1%',
    changeType: 'positive' as const,
    icon: TrendingUp,
  },
  {
    name: 'Revenue',
    value: '$847,291',
    change: '+12.5%',
    changeType: 'positive' as const,
    icon: DollarSign,
  },
  {
    name: 'Tasks Due',
    value: '47',
    change: '-8.2%',
    changeType: 'negative' as const,
    icon: Calendar,
  },
];

const recentLeads = [
  {
    id: 1,
    name: 'Sarah Johnson',
    company: 'Tech Solutions Inc.',
    email: 'sarah.johnson@techsolutions.com',
    status: 'hot',
    value: '$15,750',
    lastContact: '2 hours ago',
  },
  {
    id: 2,
    name: 'Michael Chen',
    company: 'Digital Marketing Co.',
    email: 'michael.chen@digitalmarketing.com',
    status: 'warm',
    value: '$8,500',
    lastContact: '1 day ago',
  },
  {
    id: 3,
    name: 'Emma Rodriguez',
    company: 'StartupXYZ',
    email: 'emma@startupxyz.com',
    status: 'cold',
    value: '$22,100',
    lastContact: '3 days ago',
  },
  {
    id: 4,
    name: 'David Kim',
    company: 'Enterprise Corp.',
    email: 'david.kim@enterprise.com',
    status: 'hot',
    value: '$45,000',
    lastContact: '4 hours ago',
  },
];

export function DashboardContent() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your leads today.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.name}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <p className="text-xs text-gray-600">
                <span className={`font-medium ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </span>{' '}
                from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Leads */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Recent Leads</CardTitle>
              <CardDescription>
                Your latest leads and their current status
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search leads..."
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentLeads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                    <span className="text-sm font-semibold text-gray-600">
                      {lead.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                    <p className="text-sm text-gray-600">{lead.company}</p>
                    <p className="text-xs text-gray-500">{lead.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{lead.value}</p>
                    <p className="text-xs text-gray-500">{lead.lastContact}</p>
                  </div>
                  <Badge
                    variant={
                      lead.status === 'hot'
                        ? 'destructive'
                        : lead.status === 'warm'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {lead.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Button variant="outline" className="w-full">
              View All Leads
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}