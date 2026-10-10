import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { PageCard, PageTitle } from "@/components/page-card";

export const metadata: Metadata = {
  title: "Login / Register",
  description: "Sign in to AirForShare to upload more and attach larger files.",
};

export default function LoginPage() {
  return (
    <PageCard className="max-w-[430px] py-[67px] pb-[42px]">
      <PageTitle className="mb-[21px]">
        Login to <strong>AirForShare</strong>
      </PageTitle>

      <LoginForm />

      <div className="relative my-6 text-center text-[12px] tracking-[1px] text-tertiary before:absolute before:left-0 before:top-1/2 before:h-px before:w-full before:-translate-y-1/2 before:bg-line">
        <span className="relative inline-block bg-surface px-6">or</span>
      </div>

      <p className="text-[14px] font-light leading-[1.9] tracking-[-0.3px] text-muted">
        New here?{" "}
        <Link
          href="/upgrade"
          className="font-bold text-accent transition-colors hover:text-accent-hover"
        >
          Create Free Account
        </Link>
      </p>
    </PageCard>
  );
}
