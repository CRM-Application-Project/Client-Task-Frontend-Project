import { DashboardLayout } from '@/components/layout/dashboard-layout'
import React from 'react'
import MyProfilePage from './Profile'

function page() {
  return (
    <DashboardLayout>
      <MyProfilePage />
    </DashboardLayout>
  )
}

export default page