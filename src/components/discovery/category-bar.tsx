"use client";

import { Flame, Hash } from "lucide-react";

type CategoryBarProps = {
  categories: string[];
  activeCategory: string;
  onCategorySelect: (category: string) => void;
};

function getBadgeIcon(category: string) {
  const normalized = category.trim().toLowerCase();
  if (normalized === "trending") return Flame;
  if (normalized === "new") return Hash;
  return null;
}

export function CategoryBar({ categories, activeCategory, onCategorySelect }: CategoryBarProps) {
  return (
    <div className="rounded-2xl border border-white/12 bg-[#161616]/95 px-2 py-2 shadow-[0_10px_26px_rgba(0,0,0,0.34)] backdrop-blur-xl">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((category) => {
          const isActive = category === activeCategory;
          const Icon = getBadgeIcon(category);

          return (
            <button
              className={[
                "inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full border px-4 text-xs font-semibold uppercase tracking-[0.2em] transition",
                "active:scale-[0.98] active:opacity-85",
                isActive
                  ? "border-[#ff5f5f]/60 bg-[#ff5f5f]/20 text-[#ffd5d5]"
                  : "border-white/12 bg-[#222222] text-[#bdbdbd] hover:border-white/24 hover:bg-[#2c2c2c] hover:text-white",
              ].join(" ")}
              key={category}
              onClick={() => onCategorySelect(category)}
              type="button"
            >
              {Icon ? <Icon className="size-3.5" /> : null}
              <span>{category}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
