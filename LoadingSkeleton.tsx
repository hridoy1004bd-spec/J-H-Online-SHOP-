import React from "react";

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 px-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden border border-border animate-pulse">
          <div className="aspect-square bg-gray-100" />
          <div className="p-2.5 space-y-2">
            <div className="h-3 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LineSkeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded ${className}`} />;
}
