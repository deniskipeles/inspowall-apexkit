'use client';

import { useRef, useEffect } from 'react';

interface CategoryPillsProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategoryPills({ categories, selectedCategory, onSelectCategory }: CategoryPillsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const active = activeRef.current;
      const containerCenter = container.offsetWidth / 2;
      const activeCenter = active.offsetLeft + active.offsetWidth / 2;
      container.scrollTo({ left: activeCenter - containerCenter, behavior: 'smooth' });
    }
  }, [selectedCategory]);

  return (
    <div ref={scrollRef} className="w-full overflow-x-auto no-scrollbar py-4 mb-4">
      <div className="flex gap-3 px-1">
        {categories.map((cat) => {
          const isActive = cat === selectedCategory;
          return (
            <button
              key={cat}
              ref={isActive ? activeRef : null}
              onClick={() => onSelectCategory(cat)}
              className={`whitespace-nowrap px-6 py-2 rounded-full text-sm font-medium transition-all ${isActive
                  ? 'bg-ink-invert text-ink'
                  : 'bg-surface text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 border border-black/5 dark:border-white/5'
                }`}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}