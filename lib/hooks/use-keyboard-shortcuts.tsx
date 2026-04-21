'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
  category?: string;
}

const shortcuts: KeyboardShortcut[] = [
  {
    key: 'k',
    ctrlKey: true,
    metaKey: true,
    action: () => {
      // This will be handled by the search component
      const event = new CustomEvent('open-command-palette');
      window.dispatchEvent(event);
    },
    description: 'Open command palette',
    category: 'Navigation'
  },
  {
    key: 'd',
    ctrlKey: true,
    metaKey: true,
    action: () => {
      window.location.href = '/dashboard';
    },
    description: 'Go to dashboard',
    category: 'Navigation'
  },
  {
    key: 't',
    ctrlKey: true,
    metaKey: true,
    action: () => {
      window.location.href = '/dashboard/timesheet';
    },
    description: 'Go to timesheet',
    category: 'Navigation'
  },
  {
    key: 'e',
    ctrlKey: true,
    metaKey: true,
    action: () => {
      window.location.href = '/dashboard/employees';
    },
    description: 'Go to employees',
    category: 'Navigation'
  },
  {
    key: 's',
    ctrlKey: true,
    metaKey: true,
    action: () => {
      window.location.href = '/dashboard/scheduling';
    },
    description: 'Go to scheduling',
    category: 'Navigation'
  },
  {
    key: '/',
    action: () => {
      const event = new CustomEvent('focus-search');
      window.dispatchEvent(event);
    },
    description: 'Focus search',
    category: 'Search'
  },
  {
    key: '?',
    shiftKey: true,
    action: () => {
      const event = new CustomEvent('show-shortcuts');
      window.dispatchEvent(event);
    },
    description: 'Show keyboard shortcuts',
    category: 'Help'
  }
];

export function useKeyboardShortcuts() {
  const router = useRouter();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement ||
      (event.target as HTMLElement)?.contentEditable === 'true'
    ) {
      return;
    }

    const matchingShortcut = shortcuts.find(shortcut => {
      const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey;
      const metaMatches = !!shortcut.metaKey === event.metaKey;
      const shiftMatches = !!shortcut.shiftKey === event.shiftKey;
      const altMatches = !!shortcut.altKey === event.altKey;

      return keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches;
    });

    if (matchingShortcut) {
      event.preventDefault();
      matchingShortcut.action();
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { shortcuts };
}

// Keyboard shortcuts help component
export function KeyboardShortcutsHelp() {
  const { shortcuts } = useKeyboardShortcuts();

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const keys = [];
    if (shortcut.ctrlKey || shortcut.metaKey) {
      keys.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
    }
    if (shortcut.shiftKey) keys.push('⇧');
    if (shortcut.altKey) keys.push(navigator.platform.includes('Mac') ? '⌥' : 'Alt');
    keys.push(shortcut.key.toUpperCase());
    return keys.join(' + ');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Keyboard Shortcuts</h2>
        <p className="text-sm text-muted-foreground">
          Use these shortcuts to navigate quickly through the application.
        </p>
      </div>
      
      {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
        <div key={category}>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            {category}
          </h3>
          <div className="space-y-2">
            {categoryShortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <span className="text-sm">{shortcut.description}</span>
                <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border">
                  {formatShortcut(shortcut)}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}