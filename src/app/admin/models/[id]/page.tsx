import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Boxes, ExternalLink, Plus, QrCode, ShieldCheck } from "lucide-react";
import {
  generateModelQrCodesAction,
  getProductModelWithProducts,
  getQrDataUrl,
} from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { EmptyConfig } from "@/components/EmptyConfig";
import { PrintButton } from "@/components/PrintButton";
import { StatusBadge } from "@/components/StatusBadge";
import { hasDatabaseConfig } from "@/lib/db";
import { getWarrantyUrl } from "@/lib/warranty";

export const dynamic = "force-dynamic";

export default async function ProductModelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!hasDatabaseConfig()) return <EmptyConfig />;

  const { id } = await params;
  const { model, products } = await getProductModelWithProducts(id);
  const generateAction = generateModelQrCodesAction.bind(null, model.id);
  const nextSerialNumber = products.length + 1;
  const qrLabels = await Promise.all(
    products.map(async (product) => ({
      product,
      qrDataUrl: await getQrDataUrl(product.qr_code),
      warrantyUrl: getWarrantyUrl(product.qr_code),
    })),
  );

  return (
    <main className="admin-shell">
      <header className="admin-header no-print">
        <div>
          <Link className="back-link" href="/admin">
            <ArrowLeft size={16} /> Quay lại loại sản phẩm
          </Link>
          <h1>{model.name}</h1>
          <p className="page-subtitle">
            Mã loại: {model.code} · {products.length} QR đã sinh
          </p>
        </div>
        <PrintButton disabled={products.length === 0} />
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
              <dd>{products.length} QR</dd>
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
        {products.length === 0 ? (
          <p className="muted">Chưa có QR nào. Sinh QR ở form bên trên trước khi in.</p>
        ) : (
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
        )}
      </section>

      <section className="qr-print-sheet">
        {qrLabels.map(({ product, qrDataUrl, warrantyUrl }) => (
          <article className="qr-print-label" key={product.id}>
            <div>
              <strong>{model.name}</strong>
              <span>{product.sku}</span>
            </div>
            <Image src={qrDataUrl} alt={`QR ${product.sku}`} width={180} height={180} unoptimized />
            <small>{warrantyUrl}</small>
          </article>
        ))}
      </section>
    </main>
  );
}
