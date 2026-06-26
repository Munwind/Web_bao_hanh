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
        <h1>PostgreSQL chưa có bảng sản phẩm</h1>
        <p className="page-subtitle">
          App đã kết nối được PostgreSQL, nhưng database hiện tại chưa có đủ bảng. Anh chạy schema
          trong <code>postgres/schema.sql</code> trước khi dùng trang admin.
        </p>
        <div className="setup-steps">
          <div>
            <FileCode2 size={18} />
            <span>Chạy <code>docker compose up -d postgres</code> để tạo DB local</span>
          </div>
          <div>
            <FileCode2 size={18} />
            <span>Với DB có sẵn, import file <code>postgres/schema.sql</code></span>
          </div>
          <div>
            <FileCode2 size={18} />
            <span>Refresh lại trang <code>/admin</code></span>
          </div>
        </div>
        {message ? <p className="form-error">PostgreSQL báo: {message}</p> : null}
        <Link className="btn btn-primary" href="/">
          Về trang chính
        </Link>
      </section>
    </main>
  );
}
