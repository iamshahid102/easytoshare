"use client";

import { useState } from "react";

const inputClass =
  "mb-4 w-full box-border border border-[#d8cfb6] bg-input px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:font-light placeholder:text-muted focus:border-focus";

export function FeedbackForm() {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="py-10">
        <p className="mb-2 text-[18px] font-bold text-heading">Thank you!</p>
        <p className="text-[14px] font-light leading-[1.9] tracking-[-0.3px] text-muted">
          Your feedback has been received. We read every message.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-6 cursor-pointer border-none bg-transparent text-[14px] font-bold text-accent"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setSent(true);
      }}
      className="mx-auto max-w-[400px] text-left"
    >
      <input
        className={inputClass}
        type="text"
        name="name"
        placeholder="Your name"
        autoComplete="name"
      />
      <input
        className={inputClass}
        type="email"
        name="email"
        placeholder="Email"
        autoComplete="email"
        required
      />
      <textarea
        className={`${inputClass} min-h-[140px] resize-none`}
        name="message"
        placeholder="How can we help?"
        required
      />
      <button
        type="submit"
        data-text="Send"
        className="afs-btn mt-2 block w-full"
      >
        Send
      </button>
    </form>
  );
}
