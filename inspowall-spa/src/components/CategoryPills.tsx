interface CategoryPillsProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategoryPills({ categories, selectedCategory, onSelectCategory }: CategoryPillsProps) {
  return (
    <div className="w-full overflow-x-auto no-scrollbar py-4 mb-4">
      <div className="flex gap-3 px-1">
        {categories.map((cat) => (
          <button 
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`whitespace-nowrap px-6 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCategory === cat 
                ? 'bg-ink-invert text-ink' 
                : 'bg-surface text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 border border-black/5 dark:border-white/5'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}