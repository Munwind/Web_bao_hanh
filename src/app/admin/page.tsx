import Link from "next/link";
import { Boxes, ChevronRight, Plus, Search } from "lucide-react";
import { createProductModelAction, getProductModels, logoutAction } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { DatabaseSetupNotice } from "@/components/DatabaseSetupNotice";
import { EmptyConfig } from "@/components/EmptyConfig";
import { hasSupabaseConfig } from "@/lib/supabase";

type ProductModelRow = Awaited<ReturnType<typeof getProductModels>>[number];

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (!hasSupabaseConfig()) return <EmptyConfig />;

  const { q = "" } = await searchParams;
  let models: ProductModelRow[] = [];

  try {
    models = await getProductModels(q);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không đọc được dữ liệu sản phẩm.";
    if (
      message.includes("products") ||
      message.includes("product_models") ||
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
          <h1>Loại sản phẩm</h1>
          <p className="page-subtitle">
            Tạo loại sản phẩm trước. Sau đó mở từng loại để sinh serial/QR và in tem hàng loạt.
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
            <h2>Tạo loại sản phẩm</h2>
          </div>
          <ActionForm action={createProductModelAction} className="stack-form">
            <label>
              Tên loại sản phẩm
              <input name="name" placeholder="VD: Cần câu Shimano Surf Leader" required />
            </label>
            <label>
              Mã loại
              <input name="code" placeholder="VD: SHIMANO-SURF" required />
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
                Tháng BH mặc định
                <input name="warranty_months" type="number" min={1} defaultValue={12} required />
              </label>
              <label>
                Lượt BH mặc định
                <input name="total_warranty_uses" type="number" min={0} defaultValue={2} required />
              </label>
            </div>
            <SubmitButton>Tạo loại sản phẩm</SubmitButton>
          </ActionForm>
        </aside>

        <section className="admin-panel product-list-panel">
          <div className="list-toolbar">
            <div className="section-title">
              <Boxes size={18} />
              <h2>Danh sách loại sản phẩm</h2>
            </div>
            <form className="search-box">
              <Search size={16} />
              <input name="q" defaultValue={q} placeholder="Tìm tên hoặc mã loại..." />
            </form>
          </div>

          <div className="product-list">
            {models.length === 0 ? (
              <p className="muted">Chưa có loại sản phẩm nào hoặc không tìm thấy kết quả.</p>
            ) : (
              models.map((model) => (
                <Link className="product-row model-row" href={`/admin/models/${model.id}`} key={model.id}>
                  <div>
                    <strong>{model.name}</strong>
                    <span>
                      <Boxes size={14} /> {model.code}
                    </span>
                  </div>
                  <span>{model.unit_count} QR</span>
                  <span>{model.activated_count} đã kích hoạt</span>
                  <ChevronRight size={18} />
                </Link>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
