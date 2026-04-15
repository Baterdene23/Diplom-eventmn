import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'EventMN - Арга хэмжээ зохион байгуулах, захиалах',
  description: 'Шилдэг арга хэмжээ уулзалт зохион байгуулалт, захиалгын платформ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mn">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
