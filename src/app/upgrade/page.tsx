import type { Metadata } from "next";
import Link from "next/link";
import { PageCard, PageTitle } from "@/components/page-card";

export const metadata: Metadata = {
  title: "Upgrade",
  description: "Upload more files, attach larger files and store them longer.",
};

interface Plan {
  name: string;
  tagline: string;
  price?: string;
  features: { label: string; value: string }[];
  cta: string;
  href: string;
  highlight?: boolean;
  note?: string;
}

const PLANS: Plan[] = [
  {
    name: "Registered user",
    tagline: "Welcome to Easy To Share!",
    features: [
      { label: "Upload up to", value: "5 files at once" },
      { label: "Attach up to", value: "10Mb per file" },
      { label: "Store your files", value: "up to 30 mins." },
    ],
    cta: "Create Free Account",
    href: "/login",
  },
  {
    name: "Pro",
    tagline: "Get even more",
    price: "Starting from $0.99/mo",
    features: [
      { label: "Upload", value: "unlimited number of files" },
      { label: "Attach", value: "unlimited sizes" },
      { label: "Store your files", value: "up to 2 hours" },
      { label: "Private Mode", value: "Protect files from being deleted *" },
    ],
    cta: "Subscribe Now",
    href: "/login",
    highlight: true,
    note: "Cancel anytime",
  },
];

export default function UpgradePage() {
  return (
    <PageCard className="max-w-[720px] py-[62px]">
      <PageTitle>
        Welcome to <strong>Easy To Share!</strong>
      </PageTitle>

      <div className="grid gap-6 text-left sm:grid-cols-2">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`flex flex-col border p-6 ${
              plan.highlight
                ? "border-accent bg-surface shadow-[0_12px_30px_rgba(13,27,61,0.18)]"
                : "border-line bg-surface-alt"
            }`}
          >
            <p className="text-[13px] uppercase tracking-[1.3px] text-tertiary">
              {plan.tagline}
            </p>
            <p className="mb-1 text-[22px] font-bold text-heading">
              {plan.name}
            </p>
            {plan.price ? (
              <p className="mb-4 text-[14px] font-bold text-accent">
                {plan.price}
              </p>
            ) : (
              <p className="mb-4 text-[14px] font-bold text-tertiary">Free</p>
            )}

            <ul className="mb-6 flex-1 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature.label}>
                  <span className="block text-[12px] uppercase tracking-[0.8px] text-tertiary">
                    {feature.label}
                  </span>
                  <span className="block text-[15px] text-ink">
                    {feature.value}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              href={plan.href}
              className={`afs-btn w-full text-center ${
                plan.highlight ? "" : "border-[#c7bc9e] text-ink"
              }`}
              data-text={plan.cta}
            >
              {plan.cta}
            </Link>

            {plan.note ? (
              <p className="mt-3 text-center text-[13px] font-light text-muted">
                {plan.note}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <p className="mt-8 text-[13px] font-light leading-[1.9] tracking-[-0.3px] text-muted">
        * coming soon!
      </p>
    </PageCard>
  );
}
