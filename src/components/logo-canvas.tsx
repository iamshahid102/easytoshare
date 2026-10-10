"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Canvas brand-asset panel.
 *
 * The page logo is the supplied PNG lockup; `public/easy-to-share-icon.png` is
 * the square app icon derived from the same mark (also the favicon). This
 * component paints that icon with the Canvas 2D API at device-pixel resolution
 * as a live preview and exports a 1024 × 1024 PNG for app stores, social cards
 * and press kits.
 */

const ICON_SRC = "/easy-to-share-icon.png";
const EXPORT_SIZE = 1024;

export function LogoCanvas({
  size = 160,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [exported, setExported] = useState(false);

  const paint = useCallback((target: HTMLCanvasElement, px: number) => {
    const image = imageRef.current;
    if (!image) return false;
    target.width = px;
    target.height = px;
    const ctx = target.getContext("2d");
    if (!ctx) return false;
    ctx.clearRect(0, 0, px, px);
    ctx.drawImage(image, 0, 0, px, px);
    return true;
  }, []);

  useEffect(() => {
    let active = true;
    const image = new Image();
    image.onload = () => {
      if (!active) return;
      imageRef.current = image;
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        paint(canvas, Math.round(size * dpr));
      }
    };
    image.src = ICON_SRC;
    return () => {
      active = false;
    };
  }, [paint, size]);

  const download = useCallback(() => {
    const out = document.createElement("canvas");
    if (!paint(out, EXPORT_SIZE)) return;
    out.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "easy-to-share-icon.png";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExported(true);
    }, "image/png");
  }, [paint]);

  return (
    <div className={`flex flex-col items-center gap-5 ${className}`}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Easy To Share app icon"
        style={{ width: size, height: size }}
        className="drop-shadow-[0_14px_28px_rgba(13,27,61,0.28)]"
      />
      <button
        type="button"
        onClick={download}
        data-text="Download PNG"
        className="afs-btn text-[16px]"
      >
        Download PNG
      </button>
      <p className="text-[12px] font-light leading-[1.7] text-muted" role="status">
        {exported
          ? "Saved easy-to-share-icon.png (1024 × 1024) to your downloads."
          : "Canvas export · 1024 × 1024 PNG"}
      </p>
    </div>
  );
}
