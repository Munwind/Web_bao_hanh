import Link from "next/link";
import { ArrowLeft, Boxes, ChevronLeft, ChevronRight, ExternalLink, Plus, Printer, QrCode, ShieldCheck } from "lucide-react";
import {
  generateModelQrCodesAction,
  getProductModelWithProductsPage,
} from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { EmptyConfig } from "@/components/EmptyConfig";
import { StatusBadge } from "@/components/StatusBadge";
import { hasDatabaseConfig } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProductModelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  if (!hasDatabaseConfig()) return <EmptyConfig />;

  const { id } = await params;
  const { page: pageParam = "1" } = await searchParams;
  const currentPage = Number(pageParam) || 1;
  const { model, products, pagination } = await getProductModelWithProductsPage(id, currentPage, 20);
  const generateAction = generateModelQrCodesAction.bind(null, model.id);
  const nextSerialNumber = pagination.total + 1;
  const previousPage = Math.max(1, pagination.page - 1);
  const nextPage = Math.min(pagination.totalPages, pagination.page + 1);

  return (
    <main className="admin-shell">
      <header className="admin-header no-print">
        <div>
          <Link className="back-link" href="/admin">
            <ArrowLeft size={16} /> Quay lại loại sản phẩm
          </Link>
          <h1>{model.name}</h1>
          <p className="page-subtitle">
            Mã loại: {model.code} · {pagination.total} QR đã sinh
          </p>
        </div>
        <Link
          aria-disabled={pagination.total === 0}
          className={`btn btn-primary ${pagination.total === 0 ? "is-disabled" : ""}`}
          href={`/admin/models/${model.id}/print`}
        >
          <Printer size={16} /> Mở trang in QR
        </Link>
      </header>

      <section className="model-detail-grid no-print">
        <aside className="admin-panel">
          <div className="section-title">
            <Plus size={18} />
            <h2>Sinh thêm QR/serial</h2>
          </div>
          <ActionForm action={generateAction} className="stack-form">
            <div className="two-cols">
              <label>
                Số lượng QR
                <input name="quantity" type="number" min={1} max={500} defaultValue={10} required />
              </label>
              <label>
                Serial bắt đầu
                <input name="serial_start" type="number" min={1} defaultValue={nextSerialNumber} required />
              </label>
            </div>
            <p className="muted">
              Serial sẽ có dạng <strong>{model.code}-0001</strong>, <strong>{model.code}-0002</strong>...
            </p>
            <SubmitButton>Sinh QR</SubmitButton>
          </ActionForm>
        </aside>

        <section className="admin-panel">
          <div className="section-title">
            <Boxes size={18} />
            <h2>Thông tin loại sản phẩm</h2>
          </div>
          <dl className="info-list">
            <div>
              <dt>Tháng BH</dt>
              <dd>{model.default_warranty_months}</dd>
            </div>
            <div>
              <dt>Lượt BH</dt>
              <dd>{model.default_warranty_uses}</dd>
            </div>
            <div>
              <dt>Đã sinh</dt>
              <dd>{pagination.total} QR</dd>
            </div>
          </dl>
          {model.description ? <p className="muted">{model.description}</p> : null}
        </section>
      </section>

      <section className="admin-panel no-print serial-panel">
        <div className="section-title">
          <ShieldCheck size={18} />
          <h2>Danh sách serial</h2>
        </div>
        {pagination.total === 0 ? (
          <p className="muted">Chưa có QR nào. Sinh QR ở form bên trên trước khi in.</p>
        ) : (
          <>
            <div className="serial-summary">
              <span>
                Hiển thị {products.length} / {pagination.total} serial
              </span>
              <strong>
                Trang {pagination.page} / {pagination.totalPages}
              </strong>
            </div>
            <div className="product-list">
              {products.map((product) => (
                <Link className="product-row" href={`/admin/products/${product.id}`} key={product.id}>
                  <div>
                    <strong>{product.sku}</strong>
                    <span>
                      <QrCode size={14} /> {product.qr_code}
                    </span>
                  </div>
                  <StatusBadge product={product} />
                  <span>{product.remaining_warranty_uses}/{product.total_warranty_uses} lượt</span>
                  <ExternalLink size={17} />
                </Link>
              ))}
            </div>
            {pagination.totalPages > 1 ? (
              <nav className="pagination-bar" aria-label="Phân trang serial">
                <Link
                  aria-disabled={pagination.page <= 1}
                  className={`btn btn-ghost ${pagination.page <= 1 ? "is-disabled" : ""}`}
                  href={`/admin/models/${model.id}?page=${previousPage}`}
                >
                  <ChevronLeft size={16} /> Trang trước
                </Link>
                <span>{pagination.page} / {pagination.totalPages}</span>
                <Link
                  aria-disabled={pagination.page >= pagination.totalPages}
                  className={`btn btn-ghost ${pagination.page >= pagination.totalPages ? "is-disabled" : ""}`}
                  href={`/admin/models/${model.id}?page=${nextPage}`}
                >
                  Trang sau <ChevronRight size={16} />
                </Link>
              </nav>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
