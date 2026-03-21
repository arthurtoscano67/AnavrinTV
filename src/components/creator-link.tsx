import Link from "next/link";
import type { ReactNode } from "react";

import { normalizeUsernameInput } from "@/lib/creator-identity";

type CreatorLinkProps = {
  username?: string | null;
  className?: string;
  children: ReactNode;
  title?: string;
};

export function CreatorLink({ username, className, children, title }: CreatorLinkProps) {
  const normalized = normalizeUsernameInput(username);

  if (!normalized) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Link className={className} href={`/profile/${normalized}`} title={title}>
      {children}
    </Link>
  );
}
