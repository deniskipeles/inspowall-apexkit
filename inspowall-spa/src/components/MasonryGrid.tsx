import { useEffect, useState } from 'react';
import { PinCard } from './PinCard';

function useWindowColumns() {
  const [columns, setColumns] = useState(2);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1280) setColumns(5);
      else if (width >= 1024) setColumns(4);
      else if (width >= 768) setColumns(3);
      else setColumns(2);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return columns;
}

export function MasonryGrid({ pins }: { pins: any[] }) {
  const columnsCount = useWindowColumns();
  const cols: any[][] = Array.from({ length: columnsCount }, () => []);

  pins.forEach((pin, index) => {
    cols[index % columnsCount].push(pin);
  });

  return (
    <div className="flex gap-3 md:gap-4 mx-auto w-full">
      {cols.map((col, colIndex) => (
        <div key={colIndex} className="flex-1 flex flex-col gap-3 md:gap-4 min-w-0">
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

  // Aspect ratios that mirror realistic pin proportions
  const aspectRatios = [
    '300/250', '300/320', '300/400', '300/280',
    '300/350', '300/220', '300/380', '300/310',
    '300/290', '300/360'
  ];

  return (
    <div className="flex gap-3 md:gap-4 mx-auto w-full">
      {cols.map((col, colIndex) => (
        <div key={colIndex} className="flex-1 flex flex-col gap-3 md:gap-4 min-w-0">
          {col.map((_, i) => (
            <div key={i} className="relative w-full">
              <div
                className="w-full rounded-2xl bg-surface animate-pulse"
                style={{ aspectRatio: aspectRatios[(colIndex * 3 + i) % aspectRatios.length] }}
              />
              <div className="mt-3 px-1 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-black/10 dark:bg-white/10 rounded animate-pulse mb-2"></div>
                  <div className="h-3 bg-black/5 dark:bg-white/5 rounded animate-pulse w-1/2"></div>
                </div>
                <div className="w-6 h-6 bg-black/10 dark:bg-white/10 rounded-full animate-pulse flex-shrink-0"></div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}