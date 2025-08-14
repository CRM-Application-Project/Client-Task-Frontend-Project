"use client";

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Users, 
  CheckSquare, 
  UserCheck, 
  Building2, 
  UserCog, 
  ChevronDown,
  X,
  BarChart3
} from 'lucide-react';

interface NavItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  current?: boolean;
  children?: {
    name: string;
    href: string;
    current?: boolean;
  }[];
}

const navigation: NavItem[] = [
  {
    name: 'Leads',
    icon: Users,
    href: '/leads',
    current: true,
  },
  {
    name: 'Tasks',
    icon: CheckSquare,
    href: '/tasks',
  },
  {
    name: 'Employees',
    icon: UserCheck,
    href: '/employees',
    children: [
      { name: 'HR', href: '/employees/hr' },
      { name: 'Department', href: '/employees/department' },
      { name: 'Staff', href: '/employees/staff' },
    ],
  },
];

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DashboardSidebar({ isOpen, onClose }: DashboardSidebarProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>(['Employees']);

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-[#3b3b3b] px-6 py-4">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
                <BarChart3 className="h-5 w-5 text-[#3b3b3b]" />
              </div>
              <h1 className="text-xl font-bold text-white">CRM Pro</h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col">
            <ScrollArea className="flex-1">
              <ul className="flex flex-1 flex-col gap-y-2">
                {navigation.map((item) => (
                  <li key={item.name}>
                    {item.children ? (
                      <Collapsible 
                        open={expandedItems.includes(item.name)}
                        onOpenChange={() => toggleExpanded(item.name)}
                      >
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-full justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-white hover:text-[#3b3b3b]",
                              item.current
                                ? "bg-white text-[#3b3b3b] shadow-sm"
                                : "text-white"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <item.icon className="h-5 w-5" />
                              {item.name}
                            </div>
                            <ChevronDown className={cn(
                              "h-4 w-4 transition-transform duration-200",
                              expandedItems.includes(item.name) && "rotate-180"
                            )} />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-1 pl-6 pt-2">
                          {item.children.map((child) => (
                            <Button
                              key={child.name}
                              variant="ghost"
                              className={cn(
                                "w-full justify-start rounded-lg px-3 py-2 text-sm transition-all duration-200 hover:bg-white hover:text-[#3b3b3b]",
                                child.current
                                  ? "bg-white text-[#3b3b3b] shadow-sm"
                                  : "text-gray-300"
                              )}
                            >
                              {child.name}
                            </Button>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    ) : (
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-white hover:text-[#3b3b3b]",
                          item.current
                            ? "bg-white text-[#3b3b3b] shadow-sm"
                            : "text-white"
                        )}
                      >
                        <item.icon className="mr-3 h-5 w-5" />
                        {item.name}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </nav>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className={cn(
        "fixed inset-y-0 z-50 flex w-64 flex-col transition-transform duration-300 ease-in-out lg:hidden",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-[#3b3b3b] px-6 py-4">
          {/* Header with close button */}
          <div className="flex h-16 shrink-0 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
                <BarChart3 className="h-5 w-5 text-[#3b3b3b]" />
              </div>
              <h1 className="text-xl font-bold text-white">CRM Pro</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white hover:text-[#3b3b3b]"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col">
            <ScrollArea className="flex-1">
              <ul className="flex flex-1 flex-col gap-y-2">
                {navigation.map((item) => (
                  <li key={item.name}>
                    {item.children ? (
                      <Collapsible 
                        open={expandedItems.includes(item.name)}
                        onOpenChange={() => toggleExpanded(item.name)}
                      >
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-full justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-white hover:text-[#3b3b3b]",
                              item.current
                                ? "bg-white text-[#3b3b3b] shadow-sm"
                                : "text-white"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <item.icon className="h-5 w-5" />
                              {item.name}
                            </div>
                            <ChevronDown className={cn(
                              "h-4 w-4 transition-transform duration-200",
                              expandedItems.includes(item.name) && "rotate-180"
                            )} />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-1 pl-6 pt-2">
                          {item.children.map((child) => (
                            <Button
                              key={child.name}
                              variant="ghost"
                              className={cn(
                                "w-full justify-start rounded-lg px-3 py-2 text-sm transition-all duration-200 hover:bg-white hover:text-[#3b3b3b]",
                                child.current
                                  ? "bg-white text-[#3b3b3b] shadow-sm"
                                  : "text-gray-300"
                              )}
                            >
                              {child.name}
                            </Button>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    ) : (
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-white hover:text-[#3b3b3b]",
                          item.current
                            ? "bg-white text-[#3b3b3b] shadow-sm"
                            : "text-white"
                        )}
                      >
                        <item.icon className="mr-3 h-5 w-5" />
                        {item.name}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </nav>
        </div>
      </div>
    </>
  );
}