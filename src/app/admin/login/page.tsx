import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { loginAction } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { isAdminAuthenticated } from "@/lib/auth";

function safeNextPath(value?: string) {
  return value?.startsWith("/admin") ? value : "/admin";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);

  if (await isAdminAuthenticated()) {
    redirect(nextPath);
  }

  return (
    <main className="admin-login">
      <section className="login-panel">
        <div className="login-mark">
          <KeyRound size={26} />
        </div>
        <p className="eyebrow">Khu vực admin</p>
        <h1>Đăng nhập quản trị</h1>
        <ActionForm action={loginAction} className="stack-form">
          <input name="next" type="hidden" value={nextPath} />
          <label>
            Mật khẩu
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <SubmitButton>Đăng nhập</SubmitButton>
        </ActionForm>
      </section>
    </main>
  );
}
