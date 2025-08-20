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
    <div className="min-h-screen bg-muted/20 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="border-0 shadow-lg bg-white">
          <CardContent className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Profile Account</h1>
              
              {/* Tab Navigation */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                <TabsList className="grid w-full grid-cols-2 bg-transparent p-0 h-auto">
                  <TabsTrigger 
                    value="personal-info" 
                    className="text-gray-600 border-b-2 border-transparent data-[state=active]:border-[#3D2C8D] data-[state=active]:text-[#3D2C8D] data-[state=active]:bg-transparent bg-transparent rounded-none pb-2 px-6"
                  >
                    Personal Info
                  </TabsTrigger>
                  <TabsTrigger 
                    value="change-password"
                    className="text-gray-600 border-b-2 border-transparent data-[state=active]:border-[#3D2C8D] data-[state=active]:text-[#3D2C8D] data-[state=active]:bg-transparent bg-transparent rounded-none pb-2 px-6"
                  >
                    Change Password
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Tab Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="personal-info" className="mt-0">
                <PersonalInfoTab />
              </TabsContent>
              
              <TabsContent value="change-password" className="mt-0">
                <ChangePasswordTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}