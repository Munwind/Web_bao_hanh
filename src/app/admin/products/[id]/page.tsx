import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Download, ExternalLink, History, QrCode, Save, Wrench } from "lucide-react";
import {
  consumeWarrantyUseAction,
  getProductWithEvents,
  getQrDataUrl,
  updateProductAction,
} from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { EmptyConfig } from "@/components/EmptyConfig";
import { StatusBadge } from "@/components/StatusBadge";
import { hasSupabaseConfig } from "@/lib/supabase";
import { formatDate, formatDateTime, getDaysRemaining, getWarrantyUrl } from "@/lib/warranty";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!hasSupabaseConfig()) return <EmptyConfig />;

  const { id } = await params;
  const { product, events } = await getProductWithEvents(id);
  const qrDataUrl = await getQrDataUrl(product.qr_code);
  const warrantyUrl = getWarrantyUrl(product.qr_code);
  const updateAction = updateProductAction.bind(null, product.id);
  const consumeAction = consumeWarrantyUseAction.bind(null, product.id);
  const daysRemaining = getDaysRemaining(product);

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <Link className="back-link" href="/admin">
            <ArrowLeft size={16} /> Quay lại danh sách
          </Link>
          <h1>{product.name}</h1>
          <p className="page-subtitle">Serial: {product.sku}</p>
        </div>
        <StatusBadge product={product} />
      </header>

      <section className="detail-grid">
        <aside className="admin-panel qr-panel">
          <div className="section-title">
            <QrCode size={18} />
            <h2>QR sản phẩm</h2>
          </div>
          <p className="muted qr-help">Tải mã này ra PNG, in tem và dán trực tiếp lên cần câu.</p>
          <Image src={qrDataUrl} alt={`QR ${product.sku}`} width={320} height={320} unoptimized />
          <p className="code-pill">{product.qr_code}</p>
          <div className="qr-actions">
            <a className="btn btn-primary" href={qrDataUrl} download={`${product.sku}-qr.png`}>
              <Download size={16} /> Tải QR PNG
            </a>
            <a className="btn btn-ghost" href={warrantyUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={16} /> Xem trang quét
            </a>
          </div>
        </aside>

        <section className="admin-panel">
          <div className="section-title">
            <Save size={18} />
            <h2>Thông tin sản phẩm</h2>
          </div>
          <ActionForm action={updateAction} className="stack-form">
            <label>
              Tên sản phẩm
              <input name="name" defaultValue={product.name} required />
            </label>
            <label>
              Mã / serial
              <input name="sku" defaultValue={product.sku} required />
            </label>
            <label>
              Ảnh sản phẩm URL
              <input name="image_url" defaultValue={product.image_url || ""} />
            </label>
            <label>
              Mô tả ngắn
              <textarea name="description" rows={4} defaultValue={product.description || ""} />
            </label>
            <label>
              Tháng bảo hành
              <input name="warranty_months" type="number" min={1} defaultValue={product.warranty_months} />
            </label>
            <div className="two-cols">
              <label>
                Tổng lượt
                <input
                  name="total_warranty_uses"
                  type="number"
                  min={0}
                  defaultValue={product.total_warranty_uses}
                />
              </label>
              <label>
                Lượt còn lại
                <input
                  name="remaining_warranty_uses"
                  type="number"
                  min={0}
                  defaultValue={product.remaining_warranty_uses}
                />
              </label>
            </div>
            <label className="checkbox-line">
              <input name="locked" type="checkbox" defaultChecked={product.locked} />
              Khóa sản phẩm / QR
            </label>
            <SubmitButton>Lưu thay đổi</SubmitButton>
          </ActionForm>
        </section>

        <section className="admin-panel">
          <div className="section-title">
            <Wrench size={18} />
            <h2>Trừ lượt bảo hành</h2>
          </div>
          <div className="warranty-counter">
            <strong>{product.remaining_warranty_uses}</strong>
            <span>/{product.total_warranty_uses} lượt còn lại</span>
          </div>
          <dl className="info-list">
            <div>
              <dt>Kích hoạt</dt>
              <dd>{formatDate(product.activated_at)}</dd>
            </div>
            <div>
              <dt>Hết hạn</dt>
              <dd>{formatDate(product.expires_at)}</dd>
            </div>
            <div>
              <dt>Đếm ngược</dt>
              <dd>{daysRemaining === null ? "Chưa bắt đầu" : `${daysRemaining} ngày`}</dd>
            </div>
          </dl>
          <ActionForm action={consumeAction} className="stack-form">
            <label>
              Ghi chú bảo hành
              <textarea name="note" rows={3} placeholder="VD: Thay khoen lần 1" required />
            </label>
            <SubmitButton variant="danger">Trừ 1 lượt bảo hành</SubmitButton>
          </ActionForm>
        </section>

        <section className="admin-panel history-panel">
          <div className="section-title">
            <History size={18} />
            <h2>Lịch sử bảo hành</h2>
          </div>
          {events.length === 0 ? (
            <p className="muted">Chưa có lịch sử bảo hành.</p>
          ) : (
            <ol className="event-list">
              {events.map((event) => (
                <li key={event.id}>
                  <time>{formatDateTime(event.created_at)}</time>
                  <strong>{event.event_type === "activated" ? "Kích hoạt" : "Trừ lượt"}</strong>
                  <p>{event.note}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </section>
    </main>
  );
}
