"use client";

import { useActionState } from "react";

type State = {
  error?: string;
  ok?: boolean;
};

type ActionFormProps = {
  action: (state: State | void, formData: FormData) => Promise<State | void>;
  children: React.ReactNode;
  className?: string;
};

export function ActionForm({ action, children, className }: ActionFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      {state?.ok ? <p className="form-ok">Đã lưu thay đổi.</p> : null}
      <input name="_pending" readOnly hidden value={pending ? "1" : "0"} />
    </form>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "danger" | "ghost";
}) {
  return (
    <button className={`btn btn-${variant}`} type="submit">
      {children}
    </button>
  );
}
