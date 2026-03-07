'use client';

import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBlob } from '@/lib/api/hooks';
import { MarkdownViewer } from '@/components/shared/markdown-viewer';

interface ReadmeSectionProps {
  owner: string;
  repo: string;
  gitRef: string;
}

export function ReadmeSection({ owner, repo, gitRef }: ReadmeSectionProps) {
  const { data, isError, isLoading } = useBlob(owner, repo, gitRef, 'README.md');

  if (isLoading) {
    return null;
  }

  if (isError || !data) {
    return null;
  }

  let content: string;
  try {
    const bytes = Uint8Array.from(atob(data.data), (c) => c.charCodeAt(0));
    content = new TextDecoder().decode(bytes);
  } catch {
    return null;
  }

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4 text-muted-foreground" />
          README.md
        </CardTitle>
      </CardHeader>
      <CardContent>
        <MarkdownViewer filename="README.md" source={content} />
      </CardContent>
    </Card>
  );
}
