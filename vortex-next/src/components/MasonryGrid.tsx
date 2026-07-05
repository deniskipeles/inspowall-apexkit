import { PinCard } from './PinCard';

export function MasonryGrid({ pins }: { pins: any[] }) {
  return (
    <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3 md:gap-4 w-full [column-fill:_balance]">
      {pins.map((pin, i) => (
        <PinCard key={pin.id ?? i} {...pin} />
      ))}
    </div>
  );
}

export function MasonryGridSkeleton({ count = 15 }: { count?: number }) {
  const aspectRatios = [
    '300/250', '300/320', '300/400', '300/280',
    '300/350', '300/220', '300/380', '300/310',
    '300/290', '300/360',
  ];

  return (
    <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3 md:gap-4 w-full [column-fill:_balance]">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="relative w-full break-inside-avoid mb-3 md:mb-4">
          <div className="w-full rounded-2xl bg-surface animate-pulse" style={{ aspectRatio: aspectRatios[i % aspectRatios.length] }} />
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
  );
}
