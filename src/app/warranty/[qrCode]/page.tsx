import Image from "next/image";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  CalendarClock,
  History,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
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
    title: `Xác thực bảo hành ${qrCode}`,
  };
}

const defaultProductImage =
  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80";

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
  const heroIcon = status.tone === "good" || status.tone === "neutral" ? ShieldCheck : ShieldAlert;
  const HeroIcon = heroIcon;

  return (
    <main className="verify-shell">
      <header className="verify-header">
        <div>
          <p>{shopName}</p>
          <strong>Hệ thống xác thực QR</strong>
        </div>
        <BadgeCheck size={28} />
      </header>

      <section className={`verify-status verify-${status.tone}`}>
        <HeroIcon size={34} />
        <div>
          <p>{justActivated ? "Vừa kích hoạt bảo hành" : "Kết quả xác thực"}</p>
          <h1>{status.label}</h1>
        </div>
      </section>

      <section className="product-identity">
        <div className="product-photo">
          <Image
            src={product.image_url || defaultProductImage}
            alt={product.name}
            width={900}
            height={600}
            priority
          />
        </div>
        <div className="product-copy">
          <p className="eyebrow">Serial {product.sku}</p>
          <h2>{product.name}</h2>
          <p>{product.description || "Sản phẩm đã được gắn QR riêng để theo dõi bảo hành."}</p>
        </div>
      </section>

      <section className="warranty-card">
        <div className="section-title">
          <CalendarClock size={18} />
          <h2>Thông tin bảo hành</h2>
        </div>
        <div className="countdown-box">
          <span>Thời gian còn lại</span>
          <strong>{daysRemaining === null ? "Chưa bắt đầu" : `${daysRemaining} ngày`}</strong>
        </div>
        <div className="scan-grid">
          <div>
            <span>Ngày kích hoạt</span>
            <strong>{formatDate(product.activated_at)}</strong>
          </div>
          <div>
            <span>Ngày hết hạn</span>
            <strong>{formatDate(product.expires_at)}</strong>
          </div>
          <div>
            <span>Lượt còn lại</span>
            <strong>
              {product.remaining_warranty_uses}/{product.total_warranty_uses}
            </strong>
          </div>
        </div>
        <div className="progress-track" aria-label="Warranty progress">
          <span style={{ width: `${progress}%` }} />
        </div>
        <p className="scan-note">
          QR này chỉ kích hoạt bảo hành ở lần quét đầu tiên. Các lần quét sau chỉ dùng để tra cứu
          trạng thái hiện tại.
        </p>
      </section>

      <section className="warranty-card">
        <div className="section-title">
          <History size={18} />
          <h2>Lịch sử gần đây</h2>
        </div>
        {events.length === 0 ? (
          <p className="muted">Chưa có lịch sử bảo hành.</p>
        ) : (
          <ol className="event-list compact">
            {events.map((event) => (
              <li key={event.id}>
                <time>{formatDateTime(event.created_at)}</time>
                <strong>{event.event_type === "activated" ? "Kích hoạt bảo hành" : "Bảo hành đã xử lý"}</strong>
                <p>{event.note}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="support-strip">
        <Sparkles size={20} />
        <div>
          <strong>Cần hỗ trợ bảo hành?</strong>
          <p>Liên hệ shop và đọc serial để nhân viên kiểm tra nhanh.</p>
        </div>
        <a href={shopZalo} target="_blank" rel="noreferrer">
          <Phone size={16} /> Zalo
        </a>
      </section>
    </main>
  );
}
