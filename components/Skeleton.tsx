'use client';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-muted/50 rounded ${className}`} />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Left: Scorecard skeleton */}
      <div className="lg:col-span-1 space-y-4">
        {/* Risk Score Card */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-3">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </div>

        {/* Entity profile */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <Skeleton className="h-3 w-20 mb-3" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>

        {/* Counterparties */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <Skeleton className="h-3 w-28 mb-3" />
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="w-2 h-2 rounded-full" />
                <Skeleton className="h-3 flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Middle: Graph skeleton */}
      <div className="lg:col-span-2">
        <div className="bg-card border border-border rounded-2xl p-6 h-[500px] flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 border-2 border-muted rounded-full" />
              <div className="absolute inset-0 border-2 border-t-foreground/30 rounded-full animate-spin" />
            </div>
            <p className="text-sm text-muted-foreground">Building connection graph...</p>
          </div>
        </div>
      </div>

      {/* Bottom: Report skeleton */}
      <div className="lg:col-span-3">
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-6 w-20 rounded-lg" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <div className="pt-2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </div>
    </div>
  );
}
