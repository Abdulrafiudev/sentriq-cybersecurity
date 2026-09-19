"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/primitives";
import { useAuthConfig, useLogin } from "@/hooks/useAuth";
import { toApiError } from "@/services/apiClient";

interface LoginForm {
  email: string;
  password: string;
}

/**
 * Deliberately minimal (PRD §13). One admin account, JWT, protected routes — auth
 * is not what Track D is about, so it gets exactly enough attention to be real.
 */
export default function LoginPage() {
  const config = useAuthConfig();
  const login = useLogin();

  /**
   * Outside production the API hands back the seeded demo credentials, so the
   * sign-in screen is never a dead end for someone running this locally.
   * `values` lets react-hook-form adopt them once the config query resolves,
   * without an effect writing into the form.
   */
  const { register, handleSubmit, formState } = useForm<LoginForm>({
    defaultValues: { email: "", password: "" },
    values: config.data?.demoEmail
      ? { email: config.data.demoEmail, password: config.data.demoPassword ?? "" }
      : undefined,
  });

  return (
    <div className="grid min-h-screen place-items-center bg-paper px-5">
      <div className="w-full max-w-[400px]">
        <div className="mb-7 flex items-center gap-[10px]">
          <span className="grid size-[26px] place-items-center rounded-lg bg-[linear-gradient(140deg,#13A272,#0A6B4C)]">
            <span className="size-2 rounded-[2px] bg-[#EAFBF3]" />
          </span>
          <span className="font-display text-base font-semibold tracking-[-0.02em] text-ink">
            Sentriq
          </span>
        </div>

        <h1 className="font-display text-[30px] font-semibold tracking-[-0.03em] text-ink">
          Sign in to triage
        </h1>
        <p className="mt-2 text-[13.5px] leading-[1.6] text-ink-muted">
          The incident queue contains redacted reports and routing decisions. Access is
          restricted to SOC staff.
        </p>

        <form
          onSubmit={handleSubmit((values) => login.mutate(values))}
          className="mt-7 flex flex-col gap-4 rounded-[var(--radius-flow)] border border-line bg-surface p-6"
        >
          <label className="flex flex-col gap-[6px]">
            <span className="eyebrow">Email</span>
            <input
              type="email"
              autoComplete="username"
              {...register("email", { required: "Email is required" })}
              className="rounded-[var(--radius-control)] border border-line-strong bg-[#FCFCFA] px-3 py-[10px] text-[13.5px] text-ink outline-none focus:border-jade-600 focus:bg-surface"
            />
            {formState.errors.email ? (
              <span className="text-[12px] text-critical">{formState.errors.email.message}</span>
            ) : null}
          </label>

          <label className="flex flex-col gap-[6px]">
            <span className="eyebrow">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              {...register("password", { required: "Password is required" })}
              className="rounded-[var(--radius-control)] border border-line-strong bg-[#FCFCFA] px-3 py-[10px] text-[13.5px] text-ink outline-none focus:border-jade-600 focus:bg-surface"
            />
            {formState.errors.password ? (
              <span className="text-[12px] text-critical">
                {formState.errors.password.message}
              </span>
            ) : null}
          </label>

          {login.isError ? (
            <div className="rounded-[var(--radius-inner)] border border-critical-border bg-critical-bg px-3 py-2 text-[12.5px] text-critical">
              {toApiError(login.error).message}
            </div>
          ) : null}

          <Button type="submit" disabled={login.isPending} className="mt-1 w-full">
            {login.isPending ? "Signing in…" : "Sign in"}
          </Button>

          {config.data?.demoEmail ? (
            <p className="machine text-center text-[11px] text-ink-disabled">
              DEMO — {config.data.demoEmail} / {config.data.demoPassword}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
