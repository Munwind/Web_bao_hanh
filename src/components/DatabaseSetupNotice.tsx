import Link from "next/link";
import { Database, FileCode2 } from "lucide-react";

export function DatabaseSetupNotice({ message }: { message?: string }) {
  return (
    <main className="admin-shell">
      <section className="admin-panel setup-panel">
        <div className="setup-icon">
          <Database size={28} />
        </div>
        <p className="eyebrow">Cần tạo bảng dữ liệu</p>
        <h1>Supabase chưa có bảng sản phẩm</h1>
        <p className="page-subtitle">
          App đã kết nối được Supabase, nhưng project hiện tại chưa có bảng <code>products</code>.
          Anh cần chạy file SQL schema trước khi dùng trang admin.
        </p>
        <div className="setup-steps">
          <div>
            <FileCode2 size={18} />
            <span>Mở Supabase Dashboard → SQL Editor</span>
          </div>
          <div>
            <FileCode2 size={18} />
            <span>Copy toàn bộ nội dung file <code>supabase/schema.sql</code> và bấm Run</span>
          </div>
          <div>
            <FileCode2 size={18} />
            <span>Refresh lại trang <code>/admin</code></span>
          </div>
        </div>
        {message ? <p className="form-error">Supabase báo: {message}</p> : null}
        <Link className="btn btn-primary" href="/">
          Về trang chính
        </Link>
      </section>
    </main>
  );
}
