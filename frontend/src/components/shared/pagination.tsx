'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function getPageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [];

  // Always show first page
  pages.push(1);

  if (currentPage <= 4) {
    // Near the start: show 1 2 3 4 5 ... last
    for (let i = 2; i <= 5; i++) pages.push(i);
    pages.push('ellipsis');
    pages.push(totalPages);
  } else if (currentPage >= totalPages - 3) {
    // Near the end: show 1 ... last-4 last-3 last-2 last-1 last
    pages.push('ellipsis');
    for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
  } else {
    // In the middle: show 1 ... prev curr next ... last
    pages.push('ellipsis');
    pages.push(currentPage - 1);
    pages.push(currentPage);
    pages.push(currentPage + 1);
    pages.push('ellipsis');
    pages.push(totalPages);
  }

  return pages;
}

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pages.map((page, index) =>
        page === 'ellipsis' ? (
          <span
            key={`ellipsis-${index}`}
            className="flex h-8 w-8 items-center justify-center text-sm text-muted-foreground select-none"
          >
            &hellip;
          </span>
        ) : (
          <Button
            key={page}
            variant={page === currentPage ? 'default' : 'outline'}
            size="icon-sm"
            onClick={() => onPageChange(page)}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </Button>
        )
      )}

      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
