import Image from "next/image";

/**
 * Easy To Share logo lockup.
 *
 * The supplied artwork (`public/easy-to-share-logo.png`) is a transparent PNG
 * with the padding trimmed to its exact bounds (429 × 122). It is rendered
 * through `next/image`, which keeps the intrinsic aspect ratio (no layout
 * shift), serves an optimised format, and scales crisply on retina screens.
 *
 * Size is controlled by the caller through `className` (Tailwind height
 * utilities + `w-auto`), so the same asset works from a 320px phone up to a
 * wide desktop.
 */
export function Logo({
  className = "h-[27px] md:h-[34px]",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/easy-to-share-logo.png"
      alt="Easy To Share"
      width={429}
      height={122}
      priority={priority}
      className={`w-auto ${className}`}
    />
  );
}
