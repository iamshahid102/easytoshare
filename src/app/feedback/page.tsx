import type { Metadata } from "next";
import { FeedbackForm } from "@/components/feedback-form";
import { PageCard, PageTitle } from "@/components/page-card";

export const metadata: Metadata = {
  title: "Feedback",
  description: "Tell us what you think about Easy To Share.",
};

export default function FeedbackPage() {
  return (
    <PageCard className="py-[51px] pb-[58px]">
      <PageTitle className="mb-[49px]">Feedback</PageTitle>
      <FeedbackForm />
    </PageCard>
  );
}
