"use client";

interface SuggestionPillsProps {
  onSelect: (text: string) => void;
}

const suggestions = [
  "A dress for a summer wedding",
  "Style a look for the office",
  "Show me winter coats under $1500",
  "I need a gift under $500",
];

export function SuggestionPills({ onSelect }: SuggestionPillsProps) {
  return (
    <div className="flex flex-wrap gap-2 animate-fade-in">
      {suggestions.map((text) => (
        <button
          key={text}
          onClick={() => onSelect(text)}
          className="bg-[#E8F4FD] hover:bg-[#D6EDFC] text-[#1A1A1A] text-sm font-medium px-4 py-2.5 rounded-full transition-colors duration-200 active:scale-95"
        >
          {text}
        </button>
      ))}
    </div>
  );
}
