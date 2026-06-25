import Link from "next/link";
import { Plus, Search, ShieldCheck } from "lucide-react";
import { createProductAction, getProducts, logoutAction } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { DatabaseSetupNotice } from "@/components/DatabaseSetupNotice";
import { EmptyConfig } from "@/components/EmptyConfig";
import { StatusBadge } from "@/components/StatusBadge";
import { hasSupabaseConfig } from "@/lib/supabase";
import { formatDate } from "@/lib/warranty";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (!hasSupabaseConfig()) return <EmptyConfig />;

  const { q = "" } = await searchParams;
  let products = [];

  try {
    products = await getProducts(q);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không đọc được dữ liệu sản phẩm.";
    if (
      message.includes("products") ||
      message.includes("schema cache") ||
      message.includes("relation")
    ) {
      return <DatabaseSetupNotice message={message} />;
    }
    throw error;
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Trang quản trị</p>
          <h1>Sản phẩm bảo hành</h1>
          <p className="page-subtitle">
            Tạo sản phẩm, mở chi tiết để xuất QR và trừ lượt bảo hành.
          </p>
        </div>
        <form action={logoutAction}>
          <button className="btn btn-ghost" type="submit">
            Đăng xuất
          </button>
        </form>
      </header>

      <section className="admin-grid">
        <aside className="admin-panel create-panel">
          <div className="section-title">
            <Plus size={18} />
            <h2>Tạo sản phẩm mới</h2>
          </div>
          <ActionForm action={createProductAction} className="stack-form">
            <label>
              Tên sản phẩm
              <input name="name" placeholder="VD: Cần câu Shimano Surf Leader" required />
            </label>
            <label>
              Mã / serial
              <input name="sku" placeholder="VD: CC-2026-0001" required />
            </label>
            <label>
              Ảnh sản phẩm URL
              <input name="image_url" placeholder="https://..." />
            </label>
            <label>
              Mô tả ngắn
              <textarea name="description" rows={3} placeholder="Thông tin nổi bật, phụ kiện đi kèm..." />
            </label>
            <div className="two-cols">
              <label>
                Tháng BH
                <input name="warranty_months" type="number" min={1} defaultValue={12} required />
              </label>
              <label>
                Số lượt
                <input name="total_warranty_uses" type="number" min={0} defaultValue={2} required />
              </label>
            </div>
            <SubmitButton>Tạo và sinh QR</SubmitButton>
          </ActionForm>
        </aside>

        <section className="admin-panel product-list-panel">
          <div className="list-toolbar">
            <div className="section-title">
              <ShieldCheck size={18} />
              <h2>Danh sách sản phẩm</h2>
            </div>
            <form className="search-box">
              <Search size={16} />
              <input name="q" defaultValue={q} placeholder="Tìm tên, serial, mã QR..." />
            </form>
          </div>

          <div className="product-list">
            {products.length === 0 ? (
              <p className="muted">Chưa có sản phẩm nào hoặc không tìm thấy kết quả.</p>
            ) : (
              products.map((product) => (
                <Link className="product-row" href={`/admin/products/${product.id}`} key={product.id}>
                  <div>
                    <strong>{product.name}</strong>
                    <span>{product.sku}</span>
                  </div>
                  <StatusBadge product={product} />
                  <span>{product.remaining_warranty_uses}/{product.total_warranty_uses} lượt</span>
                  <span>{formatDate(product.expires_at)}</span>
                </Link>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
