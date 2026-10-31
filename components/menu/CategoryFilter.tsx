"use client";

import { CATEGORIES } from "@/lib/data";

interface CategoryFilterProps {
  active: string;
  onChange: (id: string) => void;
}

export default function CategoryFilter({
  active,
  onChange,
}: CategoryFilterProps) {
  return (
    <div
      className="flex w-full max-w-full flex-wrap overflow-x-hidden sm:flex-nowrap sm:overflow-x-auto"
      style={{
        scrollbarWidth: "none",
        gap: "10px",
        padding: "4px 0 12px",
      }}
    >
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          type="button"
          aria-pressed={active === cat.id}
          onClick={() => onChange(cat.id)}
          className="shrink-0 whitespace-nowrap text-[13px] font-semibold transition-all"
          style={{
            padding: "10px 18px",
            minHeight: "44px",
            borderRadius: "999px",
            lineHeight: 1.4,
            cursor: "pointer",
            border: `1px solid ${active === cat.id ? "#E8541A" : "#3D3028"}`,
            background: active === cat.id ? "#E8541A" : "transparent",
            color: active === cat.id ? "white" : "#8A7566",
          }}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
