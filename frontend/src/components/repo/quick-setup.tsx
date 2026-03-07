'use client';

import { useMemo } from 'react';
import { Terminal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QuickSetupProps {
  owner: string;
  repo: string;
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-muted/30 border border-border/50 rounded-md p-3 font-mono text-sm text-foreground overflow-x-auto whitespace-pre">
      {children}
    </pre>
  );
}

export function QuickSetup({ owner, repo }: QuickSetupProps) {
  const origin = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return process.env.NEXT_PUBLIC_SITE_ORIGIN ?? 'http://localhost:3001';
  }, []);

  const fullCloneUrl = `${origin}/git/${owner}/${repo}.git`;

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            Quick Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            This repository is empty. Get started by cloning it or pushing an existing repository.
          </p>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Clone this repository</h3>
            <CodeBlock>{`git clone ${fullCloneUrl}`}</CodeBlock>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Push an existing repository</h3>
            <CodeBlock>{`git remote add origin ${fullCloneUrl}
git branch -M main
git push -u origin main`}</CodeBlock>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Create a new repository on the command line</h3>
            <CodeBlock>{`echo "# ${repo}" >> README.md
git init
git add README.md
git commit -m "first commit"
git branch -M main
git remote add origin ${fullCloneUrl}
git push -u origin main`}</CodeBlock>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
