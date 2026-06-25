import { notFound } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  History,
  Phone,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { getOrActivateProduct } from "@/app/actions";
import { EmptyConfig } from "@/components/EmptyConfig";
import { hasSupabaseConfig } from "@/lib/supabase";
import {
  formatDate,
  formatDateTime,
  getDaysRemaining,
  getProductStatus,
  getWarrantyProgress,
} from "@/lib/warranty";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ qrCode: string }>;
}) {
  const { qrCode } = await params;
  return {
    title: `Bảo hành ${qrCode}`,
  };
}

export default async function WarrantyPage({
  params,
}: {
  params: Promise<{ qrCode: string }>;
}) {
  if (!hasSupabaseConfig()) return <EmptyConfig />;

  const { qrCode } = await params;
  const result = await getOrActivateProduct(qrCode);
  if (!result) notFound();

  const { product, events, justActivated } = result;
  const status = getProductStatus(product);
  const progress = getWarrantyProgress(product);
  const daysRemaining = getDaysRemaining(product);
  const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "Cần Câu Bảo Hành";
  const shopPhone = process.env.NEXT_PUBLIC_SHOP_PHONE || "0900000000";
  const shopZalo = process.env.NEXT_PUBLIC_SHOP_ZALO || `https://zalo.me/${shopPhone}`;
  const StatusIcon = status.tone === "good" || status.tone === "neutral" ? ShieldCheck : ShieldAlert;

  const remainingText =
    daysRemaining === null
      ? "Bảo hành sẽ bắt đầu từ lần quét đầu tiên"
      : daysRemaining > 0
        ? `Còn ${daysRemaining} ngày`
        : "Đã hết thời hạn";

  return (
    <main className="market-verify">
      <header className="market-header">
        <div>
          <span>{shopName}</span>
          <strong>Bảo hành điện tử</strong>
        </div>
        <BadgeCheck size={22} />
      </header>

      <section className="market-status">
        <div className="market-status-main">
          <StatusIcon size={22} />
          <div>
            <p>{justActivated ? "Đã kích hoạt bảo hành" : "Trạng thái bảo hành"}</p>
            <h1>{status.label}</h1>
          </div>
        </div>
        <span>{remainingText}</span>
      </section>

      <section className="market-section">
        <div className="market-section-title">
          <ClipboardList size={18} />
          <h2>Thông tin sản phẩm</h2>
        </div>
        <div className="market-product">
          <div>
            <strong>{product.name}</strong>
            <span>Loại: {product.product_models?.code || "Chưa phân loại"}</span>
            <span>Serial: {product.sku}</span>
          </div>
          <ChevronRight size={18} />
        </div>
        {product.description ? <p className="market-desc">{product.description}</p> : null}
      </section>

      <section className="market-section">
        <div className="market-section-title">
          <CalendarDays size={18} />
          <h2>Chi tiết bảo hành</h2>
        </div>
        <div className="market-stats">
          <div>
            <span>Thời gian còn lại</span>
            <strong>{daysRemaining === null ? "Chưa bắt đầu" : `${daysRemaining} ngày`}</strong>
          </div>
          <div>
            <span>Lượt bảo hành</span>
            <strong>
              {product.remaining_warranty_uses}/{product.total_warranty_uses}
            </strong>
          </div>
        </div>
        <div className="market-progress" aria-label="Tiến độ bảo hành">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="market-info-row">
          <span>Ngày kích hoạt</span>
          <strong>{formatDate(product.activated_at)}</strong>
        </div>
        <div className="market-info-row">
          <span>Ngày hết hạn</span>
          <strong>{formatDate(product.expires_at)}</strong>
        </div>
      </section>

      <section className="market-section">
        <div className="market-section-title">
          <History size={18} />
          <h2>Lịch sử bảo hành</h2>
        </div>
        {events.length === 0 ? (
          <p className="market-empty">Chưa có lịch sử bảo hành.</p>
        ) : (
          <ol className="market-history">
            {events.map((event) => (
              <li key={event.id}>
                <CheckCircle2 size={16} />
                <div>
                  <strong>
                    {event.event_type === "activated" ? "Kích hoạt bảo hành" : "Bảo hành đã xử lý"}
                  </strong>
                  <span>{formatDateTime(event.created_at)}</span>
                  {event.note ? <p>{event.note}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <footer className="market-footer">
        <div>
          <strong>Cần hỗ trợ?</strong>
          <span>Đọc serial cho shop để kiểm tra nhanh.</span>
        </div>
        <a href={shopZalo} target="_blank" rel="noreferrer">
          <Phone size={16} /> Liên hệ
        </a>
      </footer>
    </main>
  );
}
