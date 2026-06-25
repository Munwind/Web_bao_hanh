export type Product = {
  id: string;
  name: string;
  sku: string;
  qr_code: string;
  image_url: string | null;
  description: string | null;
  warranty_months: number;
  total_warranty_uses: number;
  remaining_warranty_uses: number;
  activated_at: string | null;
  expires_at: string | null;
  locked: boolean;
  created_at: string;
  updated_at: string;
};

export type WarrantyEvent = {
  id: string;
  product_id: string;
  event_type: "activated" | "manual_use" | "note";
  note: string | null;
  created_at: string;
};

export type ProductStatus = {
  key: "inactive" | "active" | "expired" | "depleted" | "locked";
  label: string;
  tone: "neutral" | "good" | "warning" | "danger";
};
