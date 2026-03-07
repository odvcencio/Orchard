import Link from 'next/link';
import { NavButtons } from '@/components/landing/nav-buttons';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Link href="/" className="text-xl font-semibold text-foreground tracking-tight">
          Orchard
        </Link>
        <NavButtons />
      </nav>
      {children}
    </div>
  );
}
