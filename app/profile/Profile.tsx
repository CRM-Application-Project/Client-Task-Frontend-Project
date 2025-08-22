"use client";
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PersonalInfoTab } from '@/components/profile/PersonalInfoTab';
import { ChangePasswordTab } from '@/components/profile/ChangePasswordTab';

export default function ProfileAccountPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('personal-info');

  useEffect(() => {
    // Check if there's a tab query parameter
    const tab = searchParams.get('tab');
    if (tab === 'change-password') {
      setActiveTab('change-password');
    }
  }, [searchParams]);

  return (
    <div>
      <div>
        <Card>
          <CardContent className="p-6 sm:p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Account Settings</h1>
              <p className="text-gray-500">Manage your personal information and security settings</p>
            </div>
            
            {/* Tab Navigation */}
            <div className="mb-8">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-lg h-auto">
                  <TabsTrigger 
                    value="personal-info" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700 py-2.5 px-4 rounded-md transition-all"
                  >
                    Personal Info
                  </TabsTrigger>
                  <TabsTrigger 
                    value="change-password"
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700 py-2.5 px-4 rounded-md transition-all"
                  >
                    Change Password
                  </TabsTrigger>
                </TabsList>
                
                {/* Tab Content */}
                <TabsContent value="personal-info" className="mt-6 focus:outline-none">
                  <PersonalInfoTab />
                </TabsContent>
                
                <TabsContent value="change-password" className="mt-6 focus:outline-none">
                  <ChangePasswordTab />
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}