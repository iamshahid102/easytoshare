"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { describeError, saveText, type ClipState } from "@/lib/api";

interface Props {
  clip: ClipState | null;
  onRefresh: () => Promise<void>;
}

const AUTOSAVE_MS = 1200;

export function TextPanel({ clip, onRefresh }: Props) {
  /**
   * Local edit buffer. `null` means "the server's text is authoritative",
   * so realtime pushes from other devices flow straight into the textarea.
   * As soon as the user types, their text wins until their own save lands.
   */
  const [override, setOverride] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const text = override ?? clip?.clipText ?? "";
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-grow the textarea to fit its content (replaces angular-elastic).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const doSave = useCallback(
    async (value: string) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setPending(true);
      setError(null);
      try {
        await saveText(value);
        await onRefresh();
        // Only drop the local buffer if nothing newer was typed meanwhile.
        setOverride((current) => (current === value ? null : current));
      } catch (err) {
        setError(describeError(err));
      } finally {
        setPending(false);
      }
    },
    [onRefresh],
  );

  const onChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setOverride(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void doSave(value);
    }, AUTOSAVE_MS);
  };

  const onClear = () => {
    setOverride("");
    void doSave("");
  };

  const saveLabel = pending ? "Saving..." : "Save";

  return (
    <div className="relative">
      <h1 className="mb-7 text-[34px] font-bold leading-[0.85] tracking-[0.6px] text-heading max-md:absolute max-md:-top-[55px] max-md:left-3 max-md:mb-0 md:text-[48px]">
        Text
      </h1>

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={onChange}
          placeholder="Type something..."
          spellCheck={false}
          aria-label="Shared text"
          className="block min-h-[239px] w-full resize-none border-none bg-surface py-[10px] text-[16px] leading-[1.4] tracking-[-0.7px] text-heading outline-none placeholder:font-light placeholder:tracking-normal placeholder:text-muted md:min-h-[221px] md:text-[22px]"
        />
      </div>

      {error ? (
        <p className="mb-2 text-left text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="text-right max-[500px]:flex max-[500px]:flex-col-reverse">
        {text ? (
          <button
            type="button"
            onClick={onClear}
            className="mr-10 min-h-[61px] cursor-pointer border-none bg-transparent px-[30px] align-top text-base leading-[57px] text-ink max-[500px]:mr-0 max-[500px]:mt-[7px]"
          >
            Clear
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => void doSave(text)}
          data-text={saveLabel}
          disabled={pending || !text}
          className="afs-btn min-w-[230px] max-[500px]:block max-[500px]:w-full"
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
