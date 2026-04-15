'use client';

import { useAuthStore } from '@/store';
import UserDashboard from '@/components/dashboard/UserDashboard';
import OrganizerDashboard from '@/components/dashboard/OrganizerDashboard';

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return null;
  }

  const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';

  // Show different dashboard based on role
  if (isOrganizer) {
    return <OrganizerDashboard />;
  }

  return <UserDashboard />;
}
