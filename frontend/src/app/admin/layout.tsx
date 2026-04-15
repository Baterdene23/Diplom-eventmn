'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Check if user is logged in and is admin only
    if (!isAuthenticated) {
      router.push('/auth?redirect=/admin');
      return;
    }
    
    // Зөвхөн ADMIN эрхтэй хүн нэвтрэх боломжтой
    if (user?.role !== 'ADMIN') {
      router.push('/auth?mode=login');
      return;
    }

  }, [isAuthenticated, user, router]);

  // Show loading while checking auth
  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Түр хүлээнэ үү...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <AdminSidebar />
      <div className="flex-1 min-w-0">
        <AdminHeader />
        <main className="p-6 overflow-auto max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
