import { PinCard } from './PinCard';

export function MasonryGrid({ pins }: { pins: any[] }) {
  return (
    <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 mx-auto">
      {pins.map((pin, index) => (
        <PinCard key={index} {...pin} />
      ))}
    </div>
  );
}

export function MasonryGridSkeleton({ count = 15 }: { count?: number }) {
  return (
    <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 mx-auto">
      {Array.from({ length: count }).map((_, i) => {
        // Use a pseudo-random height based on index to avoid re-render flickering
        const heights = [250, 320, 400, 280, 350, 220, 380, 310, 290, 360];
        const height = heights[i % heights.length];
        
        return (
          <div key={i} className="relative mb-6 break-inside-avoid">
            <div 
              className="w-full rounded-2xl bg-surface animate-pulse"
              style={{ height: `${height}px` }}
            />
            <div className="mt-3 px-1 flex items-center justify-between">
              <div className="w-2/3">
                <div className="h-4 bg-white/10 rounded animate-pulse mb-2"></div>
                <div className="h-3 bg-white/5 rounded animate-pulse w-1/2"></div>
              </div>
              <div className="w-6 h-6 bg-white/10 rounded-full animate-pulse"></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
