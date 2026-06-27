export const CATEGORIES = ['For You', 'Architecture', 'Cyberpunk', 'Nature', 'Minimal', 'Abstract', 'Portrait', 'Fashion', 'Tech', 'Space'];

interface CategoryPillsProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategoryPills({ selectedCategory, onSelectCategory }: CategoryPillsProps) {
  return (
    <div className="w-full overflow-x-auto no-scrollbar py-4 mb-4">
      <div className="flex gap-3 px-1">
        {CATEGORIES.map((cat) => (
          <button 
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`whitespace-nowrap px-6 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCategory === cat 
                ? 'bg-white text-ink' 
                : 'bg-surface text-gray-300 hover:bg-white/10 border border-white/5'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
