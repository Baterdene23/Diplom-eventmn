'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore, useFavoritesStore } from '@/store';
import { 
  Menu, 
  X, 
  User, 
  Bell,
  Heart,
  Plus,
  Ticket
} from 'lucide-react';
import { notificationsApi } from '@/lib/api';

interface Notification {
  _id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  
  const notificationRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated, user, accessToken } = useAuthStore();
  const { getFavorites } = useFavoritesStore();
  const favorites = getFavorites(user?.id);

  // Fetch notifications when authenticated
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!isAuthenticated || !accessToken) return;
      
      try {
        setLoadingNotifications(true);
        const response = await notificationsApi.getAll(accessToken, { unread: true }) as { 
          notifications: Notification[]; 
          total: number;
          unreadCount: number;
        };
        setNotifications(response.notifications || []);
        setUnreadCount(response.unreadCount || response.notifications?.filter(n => !n.read).length || 0);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      } finally {
        setLoadingNotifications(false);
      }
    };

    fetchNotifications();
  }, [isAuthenticated, accessToken]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    if (!accessToken) return;
    try {
      await notificationsApi.markAllAsRead(accessToken);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
  const role = user?.role?.toUpperCase();
  const canCreateEvent = role === 'ORGANIZER' || role === 'ADMIN';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200/70">
      <div className="w-full px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0 min-w-0 px-2 py-1 rounded-xl hover:bg-gray-100 transition-all">
            <span className="text-[clamp(1.8rem,2.4vw,3rem)] font-semibold text-primary-600 tracking-tight leading-none">EventMN</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex flex-1 items-center justify-end gap-3 lg:gap-5 px-3 lg:px-5 min-w-0">
            <nav className="flex items-center gap-3 lg:gap-5 whitespace-nowrap shrink-0">
              <Link href="/events" className="px-3 py-2 rounded-xl text-[14px] lg:text-[16px] font-medium text-primary-600 hover:bg-gray-100 transition-all">Арга хэмжээ</Link>
            </nav>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {/* Create Event Button */}
                {canCreateEvent && (
                  <Link 
                    href="/events/create"
                    className="hidden sm:flex items-center gap-2 px-3 py-2 text-primary-600 hover:bg-primary-50 rounded-xl transition-all font-medium text-sm"
                    title="Арга хэмжээ үүсгэх"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden lg:inline">Үүсгэх</span>
                  </Link>
                )}

                {/* Favorites */}
                <Link 
                  href="/favorites"
                  className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all relative"
                  title="Хадгалсан"
                >
                  <Heart className="w-5 h-5" />
                  {favorites.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                      {favorites.length > 9 ? '9+' : favorites.length}
                    </span>
                  )}
                </Link>

                {/* Notifications */}
                <div className="relative" ref={notificationRef}>
                  <button 
                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all relative"
                    title="Мэдэгдэл"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-500 text-white text-xs rounded-full flex items-center justify-center font-medium animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown */}
                  {isNotificationOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-slide-down">
                      <div className="flex items-center justify-between p-4 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-900">Мэдэгдэл</h3>
                        {unreadCount > 0 && (
                          <button 
                            onClick={handleMarkAllRead}
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                          >
                            Бүгдийг уншсан болгох
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {loadingNotifications ? (
                          <div className="p-4 text-center text-gray-500">
                            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="p-8 text-center">
                            <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">Мэдэгдэл байхгүй</p>
                          </div>
                        ) : (
                          notifications.slice(0, 5).map((notification) => (
                            <div 
                              key={notification._id}
                              className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${
                                !notification.read ? 'bg-primary-50/50' : ''
                              }`}
                            >
                              <p className="font-medium text-sm text-gray-900">{notification.title}</p>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notification.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                       {notifications.length > 0 && (
                         <Link 
                           href="/notifications"
                           className="block p-3 text-center text-sm text-primary-600 hover:bg-gray-50 font-medium"
                           onClick={() => setIsNotificationOpen(false)}
                         >
                           Бүгдийг үзэх
                         </Link>
                       )}
                    </div>
                  )}
                </div>

                {/* User Shortcut */}
                <Link href="/dashboard" className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-gray-100 transition-all">
                    {user?.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.firstName || 'User'} 
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                    <span className="hidden sm:block text-sm font-medium text-gray-700">
                      {user?.firstName || 'Хэрэглэгч'}
                    </span>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth?mode=login" className="h-10 lg:h-11 px-5 lg:px-8 inline-flex items-center justify-center bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-full transition-colors text-sm lg:text-base">
                  Нэвтрэх
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all md:hidden"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white animate-slide-down">
          <nav className="p-4 space-y-1">
            <Link 
              href="/events" 
              className="block px-4 py-3 text-gray-700 font-medium rounded-xl hover:bg-gray-50"
              onClick={() => setIsMenuOpen(false)}
            >
              Арга хэмжээ
            </Link>
            
            {isAuthenticated && (
              <>
                <hr className="my-2 border-gray-100" />
                {canCreateEvent && (
                  <Link 
                    href="/events/create" 
                    className="flex items-center gap-3 px-4 py-3 text-primary-600 font-medium rounded-xl hover:bg-primary-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Plus className="w-5 h-5" />
                    Арга хэмжээ үүсгэх
                  </Link>
                )}
                <Link 
                  href="/favorites" 
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 font-medium rounded-xl hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Heart className="w-5 h-5" />
                  Хадгалсан ({favorites.length})
                </Link>
                <Link 
                  href="/dashboard" 
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 font-medium rounded-xl hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Ticket className="w-5 h-5" />
                  Миний захиалгууд
                </Link>
                <Link 
                  href="/dashboard/profile" 
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 font-medium rounded-xl hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="w-5 h-5" />
                  Профайл
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
