import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { loginAction } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { isAdminAuthenticated } from "@/lib/auth";

export default async function LoginPage() {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
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
