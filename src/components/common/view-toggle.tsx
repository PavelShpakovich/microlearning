'use client';

import { LayoutGrid, List } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

interface ViewToggleProps {
  viewMode: 'grid' | 'list';
  onViewChange: (mode: 'grid' | 'list') => void;
}

export function ViewToggle({ viewMode, onViewChange }: ViewToggleProps) {
  const t = useTranslations();

  return (
    <div className="flex items-center gap-1 rounded-md border p-1 bg-background">
      <Button
        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
        size="icon"
        className="h-8 w-8"
        onClick={() => onViewChange('grid')}
        aria-label={t('dashboard.gridView')}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
        size="icon"
        className="h-8 w-8"
        onClick={() => onViewChange('list')}
        aria-label={t('dashboard.listView')}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}
