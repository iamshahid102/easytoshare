"use client";

import { useCallback, useEffect, useState } from "react";
import { FilesIcon, TextIcon } from "@/components/icons";
import { FilesPanel } from "@/components/files-panel";
import { TextPanel } from "@/components/text-panel";
import { getClip, subscribe, type ClipState } from "@/lib/api";

type Tab = "text" | "files";

const TABS = [
  { key: "text" as const, label: "Text", Icon: TextIcon },
  { key: "files" as const, label: "Files", Icon: FilesIcon },
];

interface PanelProps {
  clip: ClipState | null;
  onRefresh: () => Promise<void>;
}

export function ShareApp() {
  const [tab, setTab] = useState<Tab>("text");
  const [clip, setClip] = useState<ClipState | null>(null);
  const [offline, setOffline] = useState(false);

  const loadClip = useCallback(async (): Promise<ClipState> => getClip(), []);

  const refresh = useCallback(async () => {
    try {
      setClip(await loadClip());
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, [loadClip]);

  // Initial load. State updates happen inside the promise callbacks (never
  // synchronously in the effect body) and are cancelled on unmount.
  useEffect(() => {
    let active = true;
    loadClip()
      .then((state) => {
        if (active) {
          setClip(state);
          setOffline(false);
        }
      })
      .catch(() => {
        if (active) setOffline(true);
      });
    return () => {
      active = false;
    };
  }, [loadClip]);

  // Live updates pushed from other devices on the same room.
  useEffect(() => {
    const stop = subscribe(() => {
      void refresh();
    });
    return stop;
  }, [refresh]);

  const panelProps: PanelProps = { clip, onRefresh: refresh };

  return (
    <div>
      {offline ? (
        <div
          role="alert"
          className="mb-4 border border-[#e1b9ae] bg-[#fbf0ea] px-5 py-3 text-left text-[13px] leading-[1.7] text-danger"
        >
          <strong>The service is unreachable.</strong> The API now runs inside
          this same app — make sure it is started with{" "}            <code className="rounded bg-surface px-1.5 py-0.5">npm run dev</code>, then
          hit{" "}
          <button
            type="button"
            onClick={() => void refresh()}
            className="cursor-pointer border-none bg-transparent p-0 font-bold underline text-danger"
          >
            retry
          </button>
          .
        </div>
      ) : null}

      <div className="relative border border-surface bg-surface shadow-[0_21px_33px_0_rgba(13,27,61,0.12)]">
        {/* Tab rail (desktop). `z-10` keeps it above the content panel, which is
            also positioned and would otherwise swallow the clicks. */}
        <div className="absolute left-0 top-0 z-10 hidden h-full w-[75px] bg-surface-alt md:block">
          {TABS.map(({ key, label, Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                aria-label={label}
                aria-selected={active}
                role="tab"
                onClick={() => setTab(key)}
                className={`relative block h-[93px] w-full cursor-pointer border-none bg-transparent transition-colors hover:bg-surface ${
                  active ? "bg-surface" : ""
                }`}
              >
                <Icon
                  aria-hidden="true"
                  className={`absolute left-1/2 top-1/2 h-[32px] w-[28px] -translate-x-1/2 -translate-y-1/2 transition-colors ${
                    active ? "text-accent" : "text-muted"
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Tab row (mobile, above the card) */}
        <div className="absolute -left-px -right-px -top-[70px] z-10 flex h-[69px] justify-end bg-page md:hidden">
          {TABS.map(({ key, label, Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                aria-label={label}
                aria-selected={active}
                role="tab"
                onClick={() => setTab(key)}
                className={`relative h-[69px] w-[75px] flex-none cursor-pointer rounded-t-md border-none transition-colors ${
                  active ? "bg-surface" : "bg-surface-raised"
                }`}
              >
                <Icon
                  aria-hidden="true"
                  className={`absolute left-1/2 top-1/2 h-[26px] w-[22px] -translate-x-1/2 -translate-y-1/2 transition-colors ${
                    active ? "text-accent" : "text-muted"
                  }`}
                />
              </button>
            );
          })}
        </div>

        <div className="relative min-h-[190px] px-[33px] py-[25px] md:min-h-[352px] md:pb-[50px] md:pl-[128px] md:pr-[38px] md:pt-[34px]">
          {tab === "text" ? <TextPanel {...panelProps} /> : <FilesPanel {...panelProps} />}
        </div>
      </div>
    </div>
  );
}
