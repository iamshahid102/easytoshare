import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { PageCard, PageTitle } from "@/components/page-card";

export const metadata: Metadata = {
  title: "Download",
  description: "Get the Easy To Share app for your devices.",
};

const CHANNELS = [
  {
    name: "Web app",
    detail: "Works in any modern browser — nothing to install.",
    href: "/",
    cta: "Open",
  },
  {
    name: "iOS",
    detail: "Share text, links and files from your iPhone or iPad.",
    href: "https://apps.apple.com/app/airforshare/id475158919",
    cta: "App Store",
  },
  {
    name: "Add to Home Screen",
    detail: "Install Easy To Share as a PWA from your browser menu.",
    href: "/",
    cta: "Install",
  },
];

export default function DownloadsPage() {
  return (
    <PageCard className="py-[62px]">
      <Logo className="mx-auto mb-6 block h-[52px] px-4 md:h-[60px]" />
      <PageTitle>Download App</PageTitle>

      <ul className="space-y-3 text-left">
        {CHANNELS.map((channel) => (
          <li
            key={channel.name}
            className="flex items-center justify-between gap-4 border border-line bg-surface-alt px-5 py-4"
          >
            <div>
              <p className="text-[15px] font-bold text-heading">
                {channel.name}
              </p>
              <p className="text-[13px] font-light leading-[1.6] tracking-[-0.3px] text-muted">
                {channel.detail}
              </p>
            </div>
            <Link
              href={channel.href}
              className="flex-none text-[13px] font-bold text-accent transition-colors hover:text-accent-hover"
            >
              {channel.cta}
            </Link>
          </li>
        ))}
      </ul>
    </PageCard>
  );
}
