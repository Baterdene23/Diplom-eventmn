'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Header } from './Header';
import { Footer } from './Footer';
import { useAuthStore } from '@/store';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAdminRoute = useMemo(() => pathname.startsWith('/admin'), [pathname]);
  const isAuthRoute = useMemo(() => pathname.startsWith('/auth'), [pathname]);
  const hideGlobalLayout = isAdminRoute || isAuthRoute;

  useEffect(() => {
    if (!mounted) return;

    // Admin user should stay in admin dashboard area only.
    if (isAuthenticated && user?.role?.toUpperCase() === 'ADMIN' && !isAdminRoute) {
      router.replace('/admin');
    }
  }, [mounted, isAuthenticated, user, isAdminRoute, router]);

  if (!mounted) {
    return <main className="min-h-screen">{children}</main>;
  }

  if (hideGlobalLayout) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-16 md:pt-20">{children}</main>
      <Footer />
    </>
  );
}