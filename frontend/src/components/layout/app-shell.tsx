'use client';

import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';
import { CommandPalette } from './command-palette';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
