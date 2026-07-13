import { PinCard } from './PinCard';

const COLUMN_COUNTS = [2, 3, 4, 5]; // sm, md, lg, xl

function splitIntoColumns(pins: any[], columns: number): any[][] {
  const cols: any[][] = Array.from({ length: columns }, () => []);
  pins.forEach((pin, i) => cols[i % columns].push(pin));
  return cols;
}

export function MasonryGrid({ pins }: { pins: any[] }) {
  return (
    <div className="relative w-full">
      {COLUMN_COUNTS.map((colCount) => {
        const cols = splitIntoColumns(pins, colCount);
        const visibilityClass =
          colCount === 2 ? 'flex md:hidden' :
          colCount === 3 ? 'hidden md:flex lg:hidden' :
          colCount === 4 ? 'hidden lg:flex xl:hidden' :
                           'hidden xl:flex';

        return (
          <div key={colCount} className={`${visibilityClass} gap-3 md:gap-4 w-full`}>
            {cols.map((col, colIdx) => (
              <div key={colIdx} className="flex-1 flex flex-col gap-3 md:gap-4 min-w-0">
                {col.map((pin, i) => (
                  <PinCard key={pin.id ?? `${colCount}-${colIdx}-${i}`} {...pin} />
                ))}
              </div>
            ))}
          </div>
        );
      })}
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
    <div className="relative w-full">
      {COLUMN_COUNTS.map((colCount) => {
        const cols: number[][] = Array.from({ length: colCount }, () => []);
        Array.from({ length: count }).forEach((_, i) => cols[i % colCount].push(i));

        const visibilityClass =
          colCount === 2 ? 'flex md:hidden' :
          colCount === 3 ? 'hidden md:flex lg:hidden' :
          colCount === 4 ? 'hidden lg:flex xl:hidden' :
                           'hidden xl:flex';

        return (
          <div key={colCount} className={`${visibilityClass} gap-3 md:gap-4 w-full`}>
            {cols.map((col, colIdx) => (
              <div key={colIdx} className="flex-1 flex flex-col gap-3 md:gap-4 min-w-0">
                {col.map((_, i) => (
                  <div key={i} className="relative w-full">
                    <div
                      className="w-full rounded-2xl bg-surface animate-pulse"
                      style={{ aspectRatio: aspectRatios[(colIdx * 3 + i) % aspectRatios.length] }}
                    />
                    <div className="mt-3 px-1 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="h-4 bg-black/10 dark:bg-white/10 rounded animate-pulse mb-2" />
                        <div className="h-3 bg-black/5 dark:bg-white/5 rounded animate-pulse w-1/2" />
                      </div>
                      <div className="w-6 h-6 bg-black/10 dark:bg-white/10 rounded-full animate-pulse flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}