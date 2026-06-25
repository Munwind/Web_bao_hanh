import type { Product, ProductStatus } from "@/lib/types";

export function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function formatDate(value: string | null) {
  if (!value) return "Chưa kích hoạt";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function getProductStatus(product: Product): ProductStatus {
  if (product.locked) {
    return { key: "locked", label: "Đã khóa", tone: "danger" };
  }

  if (!product.activated_at) {
    return { key: "inactive", label: "Sản phẩm chính hãng", tone: "neutral" };
  }

  if (product.remaining_warranty_uses <= 0) {
    return { key: "depleted", label: "Hết lượt bảo hành", tone: "danger" };
  }

  if (product.expires_at && new Date(product.expires_at).getTime() < Date.now()) {
    return { key: "expired", label: "Hết hạn bảo hành", tone: "warning" };
  }

  return { key: "active", label: "Đang bảo hành", tone: "good" };
}

export function getWarrantyProgress(product: Product) {
  if (!product.activated_at || !product.expires_at) return 0;
  const start = new Date(product.activated_at).getTime();
  const end = new Date(product.expires_at).getTime();
  const now = Date.now();
  if (end <= start) return 100;
  return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
}

export function getDaysRemaining(product: Product) {
  if (!product.expires_at) return null;
  const diff = new Date(product.expires_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function getWarrantyUrl(qrCode: string) {
  return `${getSiteUrl()}/warranty/${qrCode}`;
}
