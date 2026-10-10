import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/** "Text" tab glyph. */
export function TextIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 28 32" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4 5h20M14 5v22M9 27h10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** "Files" tab glyph. */
export function FilesIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 28 32" fill="none" aria-hidden="true" {...props}>
      <path
        d="M6 4h11l5 5v19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M17 4v5h5" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true" {...props}>
      <path
        d="M9 1v16M1 9h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SpinnerIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" {...props}>
      <circle cx="20" cy="20" r="16" stroke="#e4dbc4" strokeWidth="7" />
      <path
        d="M20 4a16 16 0 0 1 16 16"
        stroke="#2f5597"
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function FileGlyph(props: IconProps) {
  return (
    <svg viewBox="0 0 32 40" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4 4a2 2 0 0 1 2-2h13l9 9v25a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M19 2v9h9" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 20h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M3 3l10 10M13 3L3 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 20.5 3.9 12.4a5 5 0 0 1 7.1-7.1l1 1 1-1a5 5 0 0 1 7.1 7.1L12 20.5Z"
        fill="#c0563f"
      />
    </svg>
  );
}

/** Facebook glyph — standard brand path. */
export function FacebookIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 30 30" aria-hidden="true" {...props}>
      <path
        fill="#8C8873"
        fillRule="evenodd"
        d="M26.649 0H3.35C2.42 0 1.627.33.976.992.326 1.654 0 2.44 0 3.352v23.33c0 .91.325 1.691.976 2.342.65.65 1.443.976 2.375.976H15V18.351h-3.319V14.22H15v-3.416c0-1.8.515-3.276 1.546-4.426 1.03-1.15 2.608-1.724 4.734-1.724h2.993v4.36H22.29c-.825 0-1.41.255-1.758.765-.347.51-.52 1.046-.52 1.61v2.831h4.262l-.943 4.132h-3.32V30h6.639c.932 0 1.724-.325 2.375-.976.65-.65.976-1.432.976-2.343V3.351c0-.91-.325-1.697-.976-2.359A3.206 3.206 0 0 0 26.649 0z"
      />
    </svg>
  );
}

/** Twitter glyph — standard brand path. */
export function TwitterIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 30 24" aria-hidden="true" {...props}>
      <path
        fill="#8C8873"
        fillRule="evenodd"
        d="M26.943 5.984v.784c0 2.005-.382 4.03-1.147 6.078a17.37 17.37 0 0 1-3.36 5.546c-1.475 1.65-3.301 2.997-5.477 4.041C14.782 23.478 12.272 24 9.427 24c-1.741 0-3.408-.24-5-.72A18.02 18.02 0 0 1 0 21.273l.717.063c.244.02.493.031.748.031 1.444 0 2.813-.23 4.108-.69a12.792 12.792 0 0 0 3.535-1.91c-1.337-.021-2.532-.423-3.583-1.207-1.05-.783-1.767-1.78-2.15-2.992.17.042.356.068.558.079.202.01.398.015.59.015.275 0 .551-.015.827-.047.276-.031.542-.078.796-.14-1.4-.293-2.574-.993-3.519-2.1-.944-1.107-1.417-2.392-1.417-3.854v-.062a7.07 7.07 0 0 0 1.322.517c.478.135.96.214 1.449.234a6.093 6.093 0 0 1-1.99-2.146 5.816 5.816 0 0 1-.749-2.898c0-.564.074-1.102.223-1.613.149-.512.36-.987.637-1.426.743.919 1.587 1.75 2.532 2.49a19.024 19.024 0 0 0 3.025 1.943 17.14 17.14 0 0 0 3.408 1.316c1.2.324 2.436.517 3.71.58a3.93 3.93 0 0 1-.127-.69 7.488 7.488 0 0 1-.032-.689c0-.835.16-1.624.478-2.365a5.862 5.862 0 0 1 1.321-1.927 6.573 6.573 0 0 1 1.959-1.3A5.914 5.914 0 0 1 20.764 0c.892 0 1.725.172 2.5.517.775.345 1.439.81 1.99 1.394.701-.125 1.38-.313 2.039-.564.658-.25 1.284-.543 1.879-.877a6.072 6.072 0 0 1-1.051 1.896 6.142 6.142 0 0 1-1.656 1.425c.616-.063 1.22-.172 1.815-.329a10.82 10.82 0 0 0 1.72-.61 11.811 11.811 0 0 1-1.385 1.707 11.89 11.89 0 0 1-1.672 1.425z"
      />
    </svg>
  );
}
