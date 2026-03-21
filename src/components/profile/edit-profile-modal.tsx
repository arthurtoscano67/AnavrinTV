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
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes: number) {
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

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
  const [avatarUploadLabel, setAvatarUploadLabel] = useState<string | null>(null);
  const [bannerUploadLabel, setBannerUploadLabel] = useState<string | null>(null);
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
    setAvatarUploadLabel(null);
    setBannerUploadLabel(null);
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

  async function handleImageUpload(type: "avatar" | "banner", file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (PNG, JPG, WEBP, GIF, etc).");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`Image must be ${formatFileSize(MAX_IMAGE_BYTES)} or smaller.`);
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (!dataUrl) {
        throw new Error("Could not read image file.");
      }

      if (type === "avatar") {
        setAvatarUrl(dataUrl);
        setAvatarUploadLabel(`${file.name} · ${formatFileSize(file.size)}`);
      } else {
        setBannerUrl(dataUrl);
        setBannerUploadLabel(`${file.name} · ${formatFileSize(file.size)}`);
      }

      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read image file.");
    }
  }

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
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-[#030714]/85 px-3 py-3 backdrop-blur-sm md:py-4">
      <div className="w-full max-w-[680px] max-h-[88vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1120] p-3.5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Profile</p>
            <h2 className="mt-1 text-base font-semibold text-white md:text-lg">Edit profile</h2>
          </div>
          <button
            className="btn-ghost rounded-full px-3 py-2 text-xs uppercase tracking-[0.22em]"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="mt-3.5 grid gap-2">
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
              className="textarea min-h-[88px]"
              id="profile-bio"
              maxLength={400}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Tell viewers what you create."
              value={bio}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0e152a] p-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Profile media</p>
              <p className="text-[11px] text-slate-500">Banner is rectangle. Avatar is circle.</p>
            </div>

            <div className="relative mt-2.5 overflow-hidden rounded-xl border border-white/10">
              <div className="aspect-[5/1] max-h-[118px] w-full bg-[linear-gradient(135deg,#172554_0%,#1d4ed8_58%,#0f172a_100%)]">
                {bannerUrl ? (
                  <img
                    alt="Banner preview"
                    className="size-full object-cover"
                    draggable={false}
                    src={bannerUrl}
                  />
                ) : (
                  <div className="grid size-full place-items-center text-xs uppercase tracking-[0.24em] text-slate-400">
                    Banner (Rectangle)
                  </div>
                )}
              </div>

              <div className="absolute bottom-2 left-2 size-12 overflow-hidden rounded-full border-[3px] border-[#0e152a] bg-[#101a31] md:size-14">
                {avatarUrl ? (
                  <img
                    alt="Avatar preview"
                    className="size-full object-cover"
                    draggable={false}
                    src={avatarUrl}
                  />
                ) : (
                  <div className="grid size-full place-items-center text-sm font-semibold text-white md:text-base">
                    {displayName.trim().slice(0, 2).toUpperCase() || "AT"}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-2.5 grid gap-2.5 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400" htmlFor="profile-avatar-upload">
                  Avatar image (circle)
                </label>
                <input
                  accept="image/*"
                  className="input file:mr-2.5 file:rounded-full file:border-0 file:bg-cyan-300/15 file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:uppercase file:tracking-[0.18em] file:text-cyan-100"
                  id="profile-avatar-upload"
                  onChange={async (event) => {
                    await handleImageUpload("avatar", event.target.files?.[0] ?? null);
                    event.currentTarget.value = "";
                  }}
                  type="file"
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-slate-400">{avatarUploadLabel ?? "No new avatar selected."}</p>
                  {avatarUrl ? (
                    <button
                      className="btn-ghost px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]"
                      onClick={() => {
                        setAvatarUrl("");
                        setAvatarUploadLabel(null);
                      }}
                      type="button"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400" htmlFor="profile-banner-upload">
                  Banner image (rectangle)
                </label>
                <input
                  accept="image/*"
                  className="input file:mr-2.5 file:rounded-full file:border-0 file:bg-cyan-300/15 file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:uppercase file:tracking-[0.18em] file:text-cyan-100"
                  id="profile-banner-upload"
                  onChange={async (event) => {
                    await handleImageUpload("banner", event.target.files?.[0] ?? null);
                    event.currentTarget.value = "";
                  }}
                  type="file"
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-slate-400">{bannerUploadLabel ?? "No new banner selected."}</p>
                  {bannerUrl ? (
                    <button
                      className="btn-ghost px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]"
                      onClick={() => {
                        setBannerUrl("");
                        setBannerUploadLabel(null);
                      }}
                      type="button"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-3 rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary px-3.5 py-2 text-xs uppercase tracking-[0.2em]" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="btn-primary px-3.5 py-2 text-xs uppercase tracking-[0.2em]"
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
