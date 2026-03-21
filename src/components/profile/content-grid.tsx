import { ContentCard, type ProfileContentItem } from "@/components/profile/content-card";

type ContentGridProps = {
  items: ProfileContentItem[];
  emptyLabel: string;
};

export function ContentGrid({ items, emptyLabel }: ContentGridProps) {
  if (!items.length) {
    return (
      <section className="rounded-xl border border-dashed border-white/10 bg-[#0b1120] px-4 py-10 text-center">
        <p className="text-sm text-slate-300">{emptyLabel}</p>
      </section>
    );
  }

  return (
    <section id="content" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <ContentCard key={item.id} item={item} />
      ))}
    </section>
  );
}
