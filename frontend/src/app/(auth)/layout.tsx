export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Orchard</h1>
          <p className="text-sm text-muted-foreground mt-1">Code hosting that understands your code</p>
        </div>
        {children}
      </div>
    </div>
  );
}
