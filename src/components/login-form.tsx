"use client";

import { useState } from "react";

const inputClass =
  "mb-4 w-full box-border border border-[#c9c9c9] bg-input px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:font-light placeholder:text-muted focus:border-focus";

export function LoginForm() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
      }}
      className="mx-auto max-w-[400px] text-left"
    >
      <input
        className={inputClass}
        type="email"
        name="email"
        placeholder="Email"
        autoComplete="email"
        required
      />
      <input
        className={inputClass}
        type="password"
        name="password"
        placeholder="Password"
        autoComplete="current-password"
        required
      />

      <button
        type="submit"
        data-text="Login"
        className="afs-btn mt-1 block w-full"
      >
        Login
      </button>

      {submitted ? (
        <p className="mt-4 text-center text-[13px] text-accent" role="status">
          Authentication will be wired up in the backend phase.
        </p>
      ) : null}
    </form>
  );
}
