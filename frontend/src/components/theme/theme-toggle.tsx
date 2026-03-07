'use client';

import { useEffect, useMemo, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ThemePreference = 'system' | 'light' | 'dark';

const THEME_STORAGE_KEY = 'orchard-theme';

function readThemePreference(): ThemePreference {
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === 'system' || saved === 'light' || saved === 'dark') {
    return saved;
  }
  return 'system';
}

function applyTheme(theme: ThemePreference) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldUseDark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', shouldUseDark);
  document.documentElement.dataset.theme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemePreference>(() => {
    if (typeof window === 'undefined') return 'system';
    return readThemePreference();
  });

  useEffect(() => {
    applyTheme(theme);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (readThemePreference() === 'system') {
        applyTheme('system');
      }
    };
    media.addEventListener('change', handleSystemChange);
    return () => media.removeEventListener('change', handleSystemChange);
  }, [theme]);

  const activeIcon = useMemo(() => {
    if (theme === 'system') return Monitor;
    return theme === 'dark' ? Moon : Sun;
  }, [theme]);

  const ActiveIcon = activeIcon;

  const setPreference = (next: ThemePreference) => {
    setTheme(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Theme"
        >
          <ActiveIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onClick={() => setPreference('system')}>
          <Monitor className="h-4 w-4" />
          System
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setPreference('light')}>
          <Sun className="h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setPreference('dark')}>
          <Moon className="h-4 w-4" />
          Dark
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
