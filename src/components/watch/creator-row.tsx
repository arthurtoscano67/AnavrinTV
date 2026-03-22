"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { useCurrentAccount } from "@mysten/dapp-kit-react";

import { CreatorLink } from "@/components/creator-link";
import { ModalShell } from "@/components/ui/modal-shell";
import { formatCompact } from "@/lib/format";
import { buildApiUrl } from "@/lib/site-url";
import type { VideoRecord } from "@/lib/types";

type CreatorRowProps = {
  video: VideoRecord;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AT";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function CreatorRow({ video }: CreatorRowProps) {
  const account = useCurrentAccount();
  const creatorName = video.creatorDisplayName || video.ownerName;
  const creatorHandle = video.creatorUsername ? `@${video.creatorUsername}` : null;
  const [subscribed, setSubscribed] = useState(false);
  const [subscribers, setSubscribers] = useState(video.subscribers);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [notificationLevel, setNotificationLevel] = useState<"all" | "personalized" | "none">("personalized");
  const [subscriptionPending, setSubscriptionPending] = useState(false);
  const actorAddress = account?.address?.trim().toLowerCase() ?? "";

  useEffect(() => {
    setSubscribers(video.subscribers);
  }, [video.id, video.subscribers]);

  useEffect(() => {
    if (!actorAddress) {
      setSubscribed(false);
      setNotificationLevel("personalized");
      return;
    }

    const storageKey = `anavrin:subscription:${actorAddress}:${video.ownerAddress.toLowerCase()}`;
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) {
      setSubscribed(false);
      setNotificationLevel("personalized");
      return;
    }

    try {
      const parsed = JSON.parse(saved) as { subscribed?: boolean; notificationLevel?: "all" | "personalized" | "none" };
      setSubscribed(Boolean(parsed.subscribed));
      setNotificationLevel(parsed.notificationLevel ?? "personalized");
    } catch {
      setSubscribed(false);
      setNotificationLevel("personalized");
    }
  }, [actorAddress, video.ownerAddress]);

  function saveSubscriptionPreference(nextSubscribed: boolean, nextLevel: "all" | "personalized" | "none") {
    if (!actorAddress) return;
    const storageKey = `anavrin:subscription:${actorAddress}:${video.ownerAddress.toLowerCase()}`;
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        subscribed: nextSubscribed,
        notificationLevel: nextLevel,
      }),
    );
  }

  async function handleSubscribe() {
    if (!actorAddress) {
      setSubscriptionOpen(true);
      return;
    }

    if (subscribed) {
      setSubscriptionOpen(true);
      return;
    }

    setSubscriptionPending(true);
    try {
      const response = await fetch(buildApiUrl(`/api/videos/${video.id}/subscribe`), {
        method: "POST",
        headers: {
          "x-anavrin-actor-address": actorAddress,
        },
      });
      const payload = (await response.json().catch(() => ({}))) as { subscribers?: number; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not subscribe.");
      }

      setSubscribed(true);
      setSubscribers(Number(payload.subscribers) || subscribers + 1);
      saveSubscriptionPreference(true, notificationLevel);
      setSubscriptionOpen(true);
    } catch {
      setSubscriptionOpen(true);
    } finally {
      setSubscriptionPending(false);
    }
  }

  function updateNotificationLevel(nextLevel: "all" | "personalized" | "none") {
    setNotificationLevel(nextLevel);
    saveSubscriptionPreference(subscribed, nextLevel);
  }

  return (
    <>
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#1a1a1a] p-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <CreatorLink
            username={video.creatorUsername}
            className="block size-11 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5"
            title={creatorName}
          >
            {video.creatorAvatarUrl ? (
              <img
                alt={creatorName}
                className="size-full object-cover"
                draggable={false}
                src={video.creatorAvatarUrl}
              />
            ) : (
              <span className="grid size-full place-items-center text-sm font-semibold tracking-wide text-white">
                {initials(creatorName)}
              </span>
            )}
          </CreatorLink>
          <div className="min-w-0">
            <CreatorLink
              className="block truncate text-sm font-semibold text-white hover:text-cyan-100"
              title={creatorName}
              username={video.creatorUsername}
            >
              {creatorName}
            </CreatorLink>
            <div className="flex flex-wrap items-center gap-1 text-xs text-slate-400">
              {creatorHandle ? (
                <CreatorLink
                  className="truncate text-xs text-slate-400 hover:text-cyan-100"
                  title={creatorHandle}
                  username={video.creatorUsername}
                >
                  {creatorHandle}
                </CreatorLink>
              ) : null}
              <span>{formatCompact(subscribers)} subscribers</span>
            </div>
          </div>
        </div>

        <button
          className={subscribed ? "btn-secondary px-4 py-2 text-xs uppercase tracking-[0.2em]" : "btn-primary px-4 py-2 text-xs uppercase tracking-[0.2em]"}
          disabled={subscriptionPending}
          onClick={() => void handleSubscribe()}
          type="button"
        >
          {subscriptionPending ? "Working..." : subscribed ? "Subscribed" : "Subscribe"}
        </button>
      </section>

      <ModalShell
        bodyClassName="space-y-4 px-4 py-4 md:px-5"
        description={
          subscribed
            ? "Keep notification preferences out of the main row and adjust them here like a channel popup."
            : "Subscriptions require a connected wallet so creator actions stay tied to a real profile."
        }
        eyebrow="Channel"
        maxWidthClassName="max-w-lg"
        onClose={() => setSubscriptionOpen(false)}
        open={subscriptionOpen}
        title={creatorName}
      >
        {subscribed ? (
          <>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-semibold text-white">You are subscribed to {creatorName}.</p>
              <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">
                Choose how loudly this channel should reach you.
              </p>
            </div>

            <div className="grid gap-2">
              {[
                { value: "all" as const, label: "All", detail: "Every upload and live push", icon: BellRing },
                { value: "personalized" as const, label: "Personalized", detail: "Recommended channel updates", icon: Bell },
                { value: "none" as const, label: "None", detail: "Stay subscribed without alerts", icon: BellOff },
              ].map((option) => {
                const Icon = option.icon;
                const active = notificationLevel === option.value;
                return (
                  <button
                    key={option.value}
                    className={[
                      "flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                      active ? "border-cyan-300/30 bg-cyan-300/12 text-cyan-50" : "border-white/10 bg-white/5 text-white hover:bg-white/10",
                    ].join(" ")}
                    onClick={() => updateNotificationLevel(option.value)}
                    type="button"
                  >
                    <span className="inline-flex items-center gap-3">
                      <Icon className="size-4" />
                      <span>
                        <span className="block text-sm font-semibold">{option.label}</span>
                        <span className="block text-xs text-slate-400">{option.detail}</span>
                      </span>
                    </span>
                    {active ? <span className="text-xs uppercase tracking-[0.24em] text-cyan-100">Active</span> : null}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-300">
            Connect a wallet first, then subscribe to keep creator engagement tied to one account.
          </div>
        )}
      </ModalShell>
    </>
  );
}
