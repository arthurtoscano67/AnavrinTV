import Link from "next/link";

type AboutPanelProps = {
  bio: string;
  joinedDate: string;
  walletAddress: string;
  links: Array<{ label: string; href: string }>;
  socials: Array<{ label: string; href: string }>;
};

export function AboutPanel({
  bio,
  joinedDate,
  walletAddress,
  links,
  socials,
}: AboutPanelProps) {
  return (
    <section className="space-y-3 rounded-xl border border-white/10 bg-[#0b1120] p-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Bio</p>
        <p className="mt-2 text-sm leading-6 text-slate-200">{bio}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Joined</p>
          <p className="mt-1 text-sm font-medium text-white">{joinedDate}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Wallet</p>
          <p className="mt-1 truncate text-sm font-medium text-white">{walletAddress}</p>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Links</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:border-white/20 hover:text-white"
                href={link.href}
                rel="noreferrer"
                target="_blank"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Social</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {socials.map((social) => (
              <Link
                key={social.href}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:border-white/20 hover:text-white"
                href={social.href}
                rel="noreferrer"
                target="_blank"
              >
                {social.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
