"use client";

import { useEffect, useMemo, useState } from "react";

import {
  MAX_USERNAME_LENGTH,
  formatHandle,
  normalizeUsernameInput,
  validateUsername,
} from "@/lib/creator-identity";
import type { WalletSession } from "@/lib/types";

export type EditableProfile = Pick<
  WalletSession,
  "displayName" | "username" | "bio" | "avatarUrl" | "bannerUrl"
>;

type EditProfileModalProps = {
  open: boolean;
  address: string;
  initialValues: EditableProfile;
  onClose: () => void;
  onSaved: (account: WalletSession) => void;
};

type AvailabilityStatus = "idle" | "checking" | "available" | "unavailable" | "invalid";

export function EditProfileModal({
  open,
  address,
  initialValues,
  onClose,
  onSaved,
}: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(initialValues.displayName);
  const [username, setUsername] = useState(initialValues.username);
  const [bio, setBio] = useState(initialValues.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialValues.avatarUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(initialValues.bannerUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>("idle");
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
  const [lastCheckedUsername, setLastCheckedUsername] = useState("");

  const trimmedUsername = username.trim();
  const normalizedUsername = useMemo(
    () => normalizeUsernameInput(trimmedUsername),
    [trimmedUsername],
  );
  const usernameValidationError = useMemo(
    () => validateUsername(trimmedUsername),
    [trimmedUsername],
  );

  useEffect(() => {
    if (!open) return;
    setDisplayName(initialValues.displayName);
    setUsername(initialValues.username);
    setBio(initialValues.bio ?? "");
    setAvatarUrl(initialValues.avatarUrl ?? "");
    setBannerUrl(initialValues.bannerUrl ?? "");
    setError(null);
    setAvailabilityStatus("idle");
    setAvailabilityMessage(null);
    setLastCheckedUsername("");
  }, [initialValues, open]);

  const usernamePreview = useMemo(
    () => formatHandle(normalizedUsername),
    [normalizedUsername],
  );

  useEffect(() => {
    if (!open) return;
    if (!trimmedUsername) {
      setAvailabilityStatus("invalid");
      setAvailabilityMessage("Username is required.");
      return;
    }

    if (usernameValidationError) {
      setAvailabilityStatus("invalid");
      setAvailabilityMessage(usernameValidationError);
      return;
    }

    setAvailabilityStatus("checking");
    setAvailabilityMessage("Checking availability...");

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/accounts/username?username=${encodeURIComponent(trimmedUsername)}&excludeAddress=${encodeURIComponent(address)}`,
          { cache: "no-store" },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          available?: boolean;
          reason?: string | null;
          username?: string;
        };
        const checkedUsername = payload.username ? normalizeUsernameInput(payload.username) : normalizedUsername;
        setLastCheckedUsername(checkedUsername);

        if (payload.available) {
          setAvailabilityStatus("available");
          setAvailabilityMessage("Username is available");
          return;
        }

        setAvailabilityStatus("unavailable");
        setAvailabilityMessage(payload.reason || "Username is unavailable");
      } catch {
        setAvailabilityStatus("unavailable");
        setAvailabilityMessage("Could not verify username availability.");
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [address, normalizedUsername, open, trimmedUsername, usernameValidationError]);

  const canSave =
    Boolean(displayName.trim()) &&
    Boolean(trimmedUsername) &&
    !usernameValidationError &&
    availabilityStatus === "available" &&
    lastCheckedUsername === normalizedUsername &&
    !saving;

  if (!open) return null;

  async function handleSave() {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError("Display name is required.");
      return;
    }

    const usernameError = validateUsername(trimmedUsername);
    if (usernameError) {
      setError(usernameError);
      return;
    }

    if (!canSave) {
      setError(availabilityMessage || "Username is unavailable");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/accounts/profile", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          address,
          displayName: trimmedName,
          username: normalizedUsername,
          bio,
          avatarUrl,
          bannerUrl,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        account?: WalletSession;
        error?: string;
      };

      if (!response.ok || !data.account) {
        throw new Error(data.error || "Could not save profile.");
      }

      onSaved(data.account);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#030714]/85 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0b1120] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Profile</p>
            <h2 className="mt-1 text-lg font-semibold text-white">Edit profile</h2>
          </div>
          <button
            className="btn-ghost rounded-full px-3 py-2 text-xs uppercase tracking-[0.22em]"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <div className="grid gap-1.5">
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400" htmlFor="profile-display-name">
              Display name
            </label>
            <input
              className="input"
              id="profile-display-name"
              maxLength={80}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Anavrin Studio"
              value={displayName}
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400" htmlFor="profile-username">
              Username
            </label>
            <input
              className="input"
              id="profile-username"
              maxLength={MAX_USERNAME_LENGTH}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="anavrinstudio"
              value={username}
            />
            <p className="text-xs text-slate-500">
              Route preview: <span className="text-slate-300">/profile/{normalizeUsernameInput(username) || "username"}</span> ·{" "}
              {usernamePreview}
            </p>
            <p
              className={[
                "text-xs",
                availabilityStatus === "available"
                  ? "text-emerald-300"
                  : availabilityStatus === "checking"
                    ? "text-slate-400"
                    : "text-rose-300",
              ].join(" ")}
            >
              {availabilityMessage ||
                (availabilityStatus === "available" ? "Username is available" : "Username is unavailable")}
            </p>
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400" htmlFor="profile-bio">
              Bio
            </label>
            <textarea
              className="textarea min-h-[100px]"
              id="profile-bio"
              maxLength={400}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Tell viewers what you create."
              value={bio}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-1.5">
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400" htmlFor="profile-avatar-url">
                Avatar URL
              </label>
              <input
                className="input"
                id="profile-avatar-url"
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://..."
                value={avatarUrl}
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400" htmlFor="profile-banner-url">
                Banner URL
              </label>
              <input
                className="input"
                id="profile-banner-url"
                onChange={(event) => setBannerUrl(event.target.value)}
                placeholder="https://..."
                value={bannerUrl}
              />
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-3 rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary px-4 py-2.5 text-xs uppercase tracking-[0.2em]" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="btn-primary px-4 py-2.5 text-xs uppercase tracking-[0.2em]"
            disabled={!canSave}
            onClick={handleSave}
            type="button"
          >
            {saving ? "Saving..." : "Save profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
