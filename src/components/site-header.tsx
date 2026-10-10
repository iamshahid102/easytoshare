"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";

const NAV = [
  { href: "/about", label: "How it works" },
  { href: "/downloads", label: "Download" },
  { href: "/upgrade", label: "Upgrade" },
  { href: "/feedback", label: "Feedback" },
  { href: "/login", label: "Login / Register" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = open ? "hidden" : previous;
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <header className="relative mb-[18px] box-border h-[65px] md:absolute md:inset-x-[15px] md:top-0 md:mb-0 md:flex md:h-auto md:items-center md:justify-between md:pt-[11px] md:pr-[19px] lg:h-40">
      <Link
        href="/"
        aria-label="Easy To Share home"
        onClick={() => setOpen(false)}
        className={`absolute left-[28px] top-[19px] inline-block transition-opacity duration-150 md:relative md:left-0 md:top-0 lg:top-[3px] ${
          open ? "max-md:pointer-events-none max-md:opacity-0" : ""
        }`}
      >
        <Logo priority className="h-[25px] sm:h-[27px] md:h-[33px]" />
      </Link>

      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => setOpen((value) => !value)}
        className="absolute right-[16px] top-[10px] z-[60] h-11 w-11 cursor-pointer border-none bg-transparent p-0 focus:outline-none md:hidden"
      >
        <span className="relative left-1/2 top-1/2 block h-4 w-5 -translate-x-1/2 -translate-y-1/2">
          <span
            className={`absolute left-0 block h-0.5 w-5 rounded-sm bg-ink transition-all duration-300 ${
              open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"
            }`}
          />
          <span
            className={`absolute left-0 top-1/2 block h-0.5 w-5 -translate-y-1/2 rounded-sm bg-ink transition-all duration-300 ${
              open ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`absolute left-0 block h-0.5 w-5 rounded-sm bg-ink transition-all duration-300 ${
              open ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0"
            }`}
          />
        </span>
      </button>

      <nav
        id="site-menu"
        className={`fixed inset-0 z-50 flex flex-col bg-surface px-[35px] py-[62px] transition-[opacity,visibility] duration-150 md:static md:z-auto md:block md:bg-transparent md:p-0 ${
          open ? "visible opacity-100" : "invisible opacity-0"
        } md:visible md:opacity-100`}
      >
        {NAV.map((item, index) => {
          const active = pathname === item.href;
          const isLast = index === NAV.length - 1;
          const state = active
            ? "font-bold text-heading"
            : isLast
              ? "font-bold text-accent md:hover:text-accent-hover"
              : "text-ink md:hover:text-accent";

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={`block border-b border-line text-sm leading-[59px] transition-colors md:ml-[30px] md:inline-block md:border-b-0 md:leading-none md:tracking-[-0.4px] lg:ml-[58px] ${state}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
