"use client";

type EmptyFeedStateProps = {
  category: string;
  suggestions: string[];
  onSelectSuggestion: (category: string) => void;
};

export function EmptyFeedState({ category, suggestions, onSelectSuggestion }: EmptyFeedStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/4 px-5 py-8 text-center sm:px-8">
      <p className="section-label">No Videos Yet</p>
      <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
        {category === "All" ? "Nothing to show yet" : `No videos in ${category}`}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-300">
        This category is currently empty. Try one of the suggested categories below to keep exploring.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {suggestions.slice(0, 6).map((suggestion) => (
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-black/20 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-white/20 hover:text-white"
            key={suggestion}
            onClick={() => onSelectSuggestion(suggestion)}
            type="button"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
