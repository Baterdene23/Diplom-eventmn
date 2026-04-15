'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store';
import { 
  User, 
  CalendarDays,
  Settings,
  LayoutDashboard,
  Calendar,
  MapPin,
  BarChart3,
  Ticket,
  Plus,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth?redirect=/dashboard');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
  const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';
  const hideSidebar = pathname.startsWith('/dashboard/profile');

  // User navigation
  const userNavigation = [
    {
      name: 'Хянах самбар',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    },
    {
      name: 'Хуанли',
      href: '/dashboard/calendar',
      icon: CalendarDays,
      active: pathname.startsWith('/dashboard/calendar'),
    },
    {
      name: 'Миний тасалбар',
      href: '/dashboard/tickets',
      icon: Ticket,
      active: pathname.startsWith('/dashboard/tickets'),
    },
  ];

  // Organizer navigation
  const organizerNavigation = [
    {
      name: 'Хянах самбар',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    },
    {
      name: 'Миний үүсгэсэн арга хэмжээ',
      href: '/dashboard/events',
      icon: Calendar,
      active: pathname.startsWith('/dashboard/events'),
    },
    {
      name: 'Хуанли',
      href: '/dashboard/calendar',
      icon: CalendarDays,
      active: pathname.startsWith('/dashboard/calendar'),
    },
    {
      name: 'Миний тасалбар',
      href: '/dashboard/tickets',
      icon: Ticket,
      active: pathname.startsWith('/dashboard/tickets'),
    },
    {
      name: 'Байршлууд',
      href: '/dashboard/venues',
      icon: MapPin,
      active: pathname.startsWith('/dashboard/venues'),
    },
    {
      name: 'Шинжилгээ',
      href: '/dashboard/analytics',
      icon: BarChart3,
      active: pathname.startsWith('/dashboard/analytics'),
    },
    {
      name: 'Тохиргоо',
      href: '/dashboard/settings',
      icon: Settings,
      active: pathname.startsWith('/dashboard/settings'),
    },
  ];

  // Choose navigation based on role
  const navigation = isOrganizer ? organizerNavigation : userNavigation;

  // Role label
  const roleLabel = isAdmin ? 'Админ' : isOrganizer ? 'Зохион байгуулагч' : 'Хэрэглэгч';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.firstName || 'User'}
                  className="w-12 h-12 rounded-xl object-cover shadow-lg"
                />
              ) : (
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
                  isOrganizer 
                    ? "bg-gradient-to-br from-primary-500 to-purple-600" 
                    : "bg-gray-100"
                )}>
                  <User className={cn("w-6 h-6", isOrganizer ? "text-white" : "text-gray-400")} />
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {user?.firstName} {user?.lastName}
                </h1>
                <p className="text-sm text-gray-500">{roleLabel}</p>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-3">
              {isOrganizer && (
                <Link
                  href="/events/create"
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Арга хэмжээ үүсгэх</span>
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium text-sm"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Админ</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className={cn('flex flex-col md:flex-row gap-6', hideSidebar && 'md:flex-col')}>
          {/* Sidebar */}
          {!hideSidebar && (
            <aside className="w-full md:w-64 flex-shrink-0">
              <nav className="bg-white rounded-2xl shadow-sm p-3 sticky top-24 flex flex-col min-h-[420px]">
                <div className="space-y-1">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm',
                        item.active
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  ))}
                  
                  <hr className="my-2 border-gray-100" />
                  
                  <Link
                    href="/dashboard/profile"
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm',
                      pathname.startsWith('/dashboard/profile')
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <User className="w-5 h-5" />
                    Хувийн мэдээлэл
                  </Link>
                </div>

                <div className="mt-auto pt-3 border-t border-gray-100">
                  <button
                    onClick={() => {
                      logout();
                      router.push('/');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-5 h-5" />
                    Гарах
                  </button>
                </div>
              </nav>
            </aside>
          )}

          {/* Main Content */}
          <main className={cn('flex-1 min-w-0', hideSidebar && 'w-full')}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
