import { useEffect, useState } from 'react';
import { PinCard } from './PinCard';

// Responsive hook to detect active layout column counts
function useWindowColumns() {
  const [columns, setColumns] = useState(2); // Default to mobile 2-col

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1280) setColumns(5);      // xl
      else if (width >= 1024) setColumns(4); // lg
      else if (width >= 768) setColumns(3);  // md
      else setColumns(2);                    // mobile
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return columns;
}

export function MasonryGrid({ pins }: { pins: any[] }) {
  const columnsCount = useWindowColumns();
  
  // Initialize column buckets
  const cols: any[][] = Array.from({ length: columnsCount }, () => []);

  // Distribute items left-to-right sequentially across active columns
  pins.forEach((pin, index) => {
    cols[index % columnsCount].push(pin);
  });

  return (
    <div className="flex gap-4 mx-auto w-full">
      {cols.map((col, colIndex) => (
        <div key={colIndex} className="flex-1 flex flex-col gap-4">
          {col.map((pin, i) => (
            <PinCard key={pin.id || i} {...pin} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function MasonryGridSkeleton({ count = 15 }: { count?: number }) {
  const columnsCount = useWindowColumns();
  const cols: any[][] = Array.from({ length: columnsCount }, () => []);

  Array.from({ length: count }).forEach((_, i) => {
    cols[i % columnsCount].push(i);
  });

  return (
    <div className="flex gap-4 mx-auto w-full">
      {cols.map((col, colIndex) => (
        <div key={colIndex} className="flex-1 flex flex-col gap-4">
          {col.map((_, i) => {
            const heights = [250, 320, 400, 280, 350, 220, 380, 310, 290, 360];
            const height = heights[(colIndex * 3 + i) % heights.length];
            
            return (
              <div key={i} className="relative w-full">
                <div 
                  className="w-full rounded-2xl bg-surface animate-pulse"
                  style={{ height: `${height}px` }}
                />
                <div className="mt-3 px-1 flex items-center justify-between">
                  <div className="w-2/3">
                    <div className="h-4 bg-black/10 dark:bg-white/10 rounded animate-pulse mb-2"></div>
                    <div className="h-3 bg-black/5 dark:bg-white/5 rounded animate-pulse w-1/2"></div>
                  </div>
                  <div className="w-6 h-6 bg-black/10 dark:bg-white/10 rounded-full animate-pulse"></div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}