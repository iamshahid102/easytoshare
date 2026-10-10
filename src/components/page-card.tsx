import type { ReactNode } from "react";

export function PageCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="relative border border-surface bg-surface shadow-[0_21px_33px_0_rgba(0,0,0,0.1)]">
      <div
        className={`mx-auto box-border max-w-[475px] px-[15px] py-[51px] text-center ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

export function PageTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={`mb-[30px] text-[23px] font-normal leading-[1.35] tracking-[1.3px] text-heading-alt [&_strong]:font-bold ${className}`}
    >
      {children}
    </h1>
  );
}
