import Link from "next/link";

export function EmptyConfig() {
  return (
    <main className="min-h-screen bg-[#f6f1e8] px-5 py-10 text-slate-950">
      <section className="mx-auto max-w-2xl rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-700">
          Cần câu bảo hành
        </p>
        <h1 className="mt-4 text-3xl font-black">Cần cấu hình Supabase trước</h1>
        <p className="mt-3 text-slate-600">
          Tạo file <code>.env.local</code> theo <code>.env.local.example</code>, chạy SQL trong{" "}
          <code>supabase/schema.sql</code>, rồi khởi động lại dev server.
        </p>
        <Link className="btn btn-primary mt-6 inline-flex" href="/">
          Về trang tổng quan
        </Link>
      </section>
    </main>
  );
}
