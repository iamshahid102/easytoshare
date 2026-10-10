import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { LogoCanvas } from "@/components/logo-canvas";
import { PageCard, PageTitle } from "@/components/page-card";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Share files, text and links within the same Wi-Fi network in three steps.",
};

const STEPS = [
  "Connect all your devices to the same Wi-Fi network",
  "Upload to Easy To Share anything you want",
  "View and manage from any devices *",
];

export default function AboutPage() {
  return (
    <>
      <PageCard className="max-w-[560px] py-[62px]">
        <PageTitle>How it works</PageTitle>

        <p className="mb-9 text-[15px] font-light leading-[1.9] tracking-[-0.3px] text-ink">
          Easy To Share is an easy solution to share files, text and links
          within the same Wi-Fi network.
        </p>

        <ol className="mx-auto max-w-[420px] list-none space-y-5 text-left">
          {STEPS.map((step, index) => (
            <li key={step} className="flex items-start gap-4">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-line text-sm font-bold text-accent">
                {index + 1}
              </span>
              <span className="pt-1 text-[15px] leading-[1.6] tracking-[-0.3px] text-ink">
                {step}
              </span>
            </li>
          ))}
        </ol>

        <p className="mt-10 text-[13px] font-light leading-[1.9] tracking-[-0.3px] text-muted">
          * your content is automatically deleted after 30 minutes since last
          access
        </p>
      </PageCard>

      <div className="mt-6">
        <PageCard className="max-w-[560px] py-[51px] pb-[58px]">
          <PageTitle className="mb-[28px]">Our logo</PageTitle>

          <div className="mb-8 flex justify-center">
            <Logo className="h-[46px] sm:h-[54px]" />
          </div>

          <p className="text-[15px] font-light leading-[1.9] tracking-[-0.3px] text-ink">
            The Easy To Share lockup on the brand palette. The square app icon
            below — also the favicon — is derived from the same mark and rendered
            through the Canvas API for crisp high-resolution PNG exports.
          </p>

          <div className="mt-8 border-t border-line pt-8">
            <p className="mb-6 text-[12px] uppercase tracking-[1.3px] text-tertiary">
              App icon
            </p>
            <LogoCanvas />
          </div>
        </PageCard>
      </div>
    </>
  );
}
