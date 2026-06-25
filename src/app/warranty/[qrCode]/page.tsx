import { notFound } from "next/navigation";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  History,
  Phone,
  ShieldAlert,
  ShieldCheck,
  TicketCheck,
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
        ? `Còn ${daysRemaining} ngày bảo hành`
        : "Thời hạn bảo hành đã kết thúc";

  return (
    <main className="verify-shell simple-verify">
      <header className="verify-topbar">
        <div>
          <p>{shopName}</p>
          <strong>Tra cứu bảo hành</strong>
        </div>
        <BadgeCheck size={24} />
      </header>

      <section className={`verify-summary verify-${status.tone}`}>
        <div className="verify-status-line">
          <StatusIcon size={20} />
          <span>{justActivated ? "Đã kích hoạt" : "Trạng thái"}</span>
        </div>
        <h1>{status.label}</h1>
        <p>{remainingText}</p>
      </section>

      <section className="verify-card product-ticket">
        <div className="product-mini">
          <div className="mini-icon">
            <TicketCheck size={20} />
          </div>
          <div>
            <p>Sản phẩm</p>
            <h2>{product.name}</h2>
            <span>Serial: {product.sku}</span>
          </div>
        </div>
        {product.description ? <p className="product-desc">{product.description}</p> : null}
      </section>

      <section className="verify-card">
        <div className="section-title">
          <CalendarClock size={18} />
          <h2>Thông tin bảo hành</h2>
        </div>

        <div className="warranty-main-stat">
          <div>
            <span>Thời gian còn lại</span>
            <strong>{daysRemaining === null ? "Chưa bắt đầu" : `${daysRemaining} ngày`}</strong>
          </div>
          <div>
            <span>Lượt còn lại</span>
            <strong>
              {product.remaining_warranty_uses}/{product.total_warranty_uses}
            </strong>
          </div>
        </div>

        <div className="progress-track verify-progress" aria-label="Tiến độ bảo hành">
          <span style={{ width: `${progress}%` }} />
        </div>

        <div className="timeline-list">
          <div>
            <Clock3 size={17} />
            <span>Ngày kích hoạt</span>
            <strong>{formatDate(product.activated_at)}</strong>
          </div>
          <div>
            <CheckCircle2 size={17} />
            <span>Ngày hết hạn</span>
            <strong>{formatDate(product.expires_at)}</strong>
          </div>
        </div>
      </section>

      <section className="verify-card">
        <div className="section-title">
          <History size={18} />
          <h2>Lịch sử bảo hành</h2>
        </div>
        {events.length === 0 ? (
          <p className="muted">Chưa có lịch sử bảo hành.</p>
        ) : (
          <ol className="event-list compact">
            {events.map((event) => (
              <li key={event.id}>
                <time>{formatDateTime(event.created_at)}</time>
                <strong>
                  {event.event_type === "activated" ? "Kích hoạt bảo hành" : "Bảo hành đã xử lý"}
                </strong>
                <p>{event.note}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="contact-card">
        <div>
          <strong>Cần hỗ trợ?</strong>
          <p>Liên hệ shop và đọc serial để được kiểm tra nhanh.</p>
        </div>
        <a href={shopZalo} target="_blank" rel="noreferrer">
          <Phone size={16} /> Liên hệ
        </a>
      </section>
    </main>
  );
}
