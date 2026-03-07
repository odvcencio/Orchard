'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { useCommandPaletteStore } from '@/lib/stores/command-palette-store';
import { useUserRepos } from '@/lib/api/hooks';
import { GitBranch, Home, Plus, Settings } from 'lucide-react';

export function CommandPalette() {
  const { open, setOpen } = useCommandPaletteStore();
  const router = useRouter();
  const { data: repos } = useUserRepos();
  const [query, setQuery] = useState('');

  // Register ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, setOpen]);

  const navigate = (path: string) => {
    router.push(path);
    setOpen(false);
    setQuery('');
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search repositories, files, entities..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => navigate('/dashboard')}>
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => navigate('/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Repository
          </CommandItem>
          <CommandItem onSelect={() => navigate('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Repositories */}
        <CommandGroup heading="Repositories">
          {(repos || [])
            .filter(
              (repo) =>
                !query ||
                repo.name.toLowerCase().includes(query.toLowerCase()),
            )
            .slice(0, 8)
            .map((repo) => (
              <CommandItem
                key={repo.id}
                onSelect={() => navigate(`/${repo.owner_name}/${repo.name}`)}
              >
                <GitBranch className="mr-2 h-4 w-4" />
                {repo.owner_name}/{repo.name}
              </CommandItem>
            ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
