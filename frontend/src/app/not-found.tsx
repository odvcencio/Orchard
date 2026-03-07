import Link from "next/link";
import { TreePine } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 text-center px-4">
        {/* Large faded 404 */}
        <p className="text-8xl font-bold text-muted-foreground/20 select-none leading-none">
          404
        </p>

        {/* Message */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-semibold text-foreground">
            Page not found
          </h1>
          <p className="text-muted-foreground max-w-sm">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-row items-center gap-3">
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/explore">Explore Repositories</Link>
          </Button>
        </div>

        {/* Branding */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground/50 mt-4">
          <TreePine className="size-4" />
          <span>Orchard</span>
        </div>
      </div>
    </div>
  );
}
