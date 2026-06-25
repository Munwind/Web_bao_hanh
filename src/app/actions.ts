"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { randomBytes } from "node:crypto";
import { clearAdminSession, isAdminAuthenticated, isValidAdminPassword, setAdminSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Product, WarrantyEvent } from "@/lib/types";
import { addMonths, getWarrantyUrl } from "@/lib/warranty";

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function numberValue(formData: FormData, key: string, fallback: number) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function createQrCode() {
  return randomBytes(9).toString("base64url").toLowerCase();
}

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
}

export async function loginAction(_: unknown, formData: FormData) {
  const password = textValue(formData, "password");
  if (!isValidAdminPassword(password)) {
    return { error: "Mật khẩu admin không đúng." };
  }

  await setAdminSession();
  redirect("/admin");
}

export async function logoutAction() {
  await clearAdminSession();
  redirect("/admin/login");
}

export async function createProductAction(_: unknown, formData: FormData) {
  await requireAdmin();

  const name = textValue(formData, "name");
  const sku = textValue(formData, "sku");
  const imageUrl = textValue(formData, "image_url") || null;
  const description = textValue(formData, "description") || null;
  const warrantyMonths = Math.max(1, numberValue(formData, "warranty_months", 12));
  const totalUses = Math.max(0, numberValue(formData, "total_warranty_uses", 1));

  if (!name || !sku) {
    return { error: "Cần nhập tên sản phẩm và mã/serial." };
  }

  const supabase = getSupabaseAdmin();
  const qrCode = createQrCode();
  const { error } = await supabase.from("products").insert({
    name,
    sku,
    qr_code: qrCode,
    image_url: imageUrl,
    description,
    warranty_months: warrantyMonths,
    total_warranty_uses: totalUses,
    remaining_warranty_uses: totalUses,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  redirect("/admin");
}

export async function updateProductAction(productId: string, _: unknown, formData: FormData) {
  await requireAdmin();

  const name = textValue(formData, "name");
  const sku = textValue(formData, "sku");
  const imageUrl = textValue(formData, "image_url") || null;
  const description = textValue(formData, "description") || null;
  const warrantyMonths = Math.max(1, numberValue(formData, "warranty_months", 12));
  const totalUses = Math.max(0, numberValue(formData, "total_warranty_uses", 1));
  const remainingUses = Math.max(0, numberValue(formData, "remaining_warranty_uses", totalUses));
  const locked = formData.get("locked") === "on";

  if (!name || !sku) {
    return { error: "Cần nhập tên sản phẩm và mã/serial." };
  }

  const supabase = getSupabaseAdmin();
  const { data: current } = await supabase
    .from("products")
    .select("activated_at")
    .eq("id", productId)
    .single<Pick<Product, "activated_at">>();
  const expiresAt = current?.activated_at
    ? addMonths(new Date(current.activated_at), warrantyMonths).toISOString()
    : null;
  const { error } = await supabase
    .from("products")
    .update({
      name,
      sku,
      image_url: imageUrl,
      description,
      warranty_months: warrantyMonths,
      total_warranty_uses: totalUses,
      remaining_warranty_uses: Math.min(remainingUses, totalUses),
      expires_at: expiresAt,
      locked,
    })
    .eq("id", productId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/products/${productId}`);
  return { ok: true };
}

export async function consumeWarrantyUseAction(productId: string, _: unknown, formData: FormData) {
  await requireAdmin();

  const note = textValue(formData, "note");
  const supabase = getSupabaseAdmin();
  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single<Product>();

  if (error || !product) {
    return { error: error?.message || "Không tìm thấy sản phẩm." };
  }

  if (product.remaining_warranty_uses <= 0) {
    return { error: "Sản phẩm đã hết lượt bảo hành." };
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({ remaining_warranty_uses: product.remaining_warranty_uses - 1 })
    .eq("id", productId);

  if (updateError) {
    return { error: updateError.message };
  }

  await supabase.from("warranty_events").insert({
    product_id: productId,
    event_type: "manual_use",
    note: note || "Admin trừ 1 lượt bảo hành",
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath(`/warranty/${product.qr_code}`);
  return { ok: true };
}

export async function getProducts(query = "") {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const request = supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  const trimmed = query.trim();
  const { data, error } = trimmed
    ? await request.or(
        `name.ilike.%${trimmed}%,sku.ilike.%${trimmed}%,qr_code.ilike.%${trimmed}%`,
      )
    : await request;

  if (error) throw new Error(error.message);
  return data as Product[];
}

export async function getProductWithEvents(id: string) {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const [{ data: product, error: productError }, { data: events, error: eventsError }] =
    await Promise.all([
      supabase.from("products").select("*").eq("id", id).single<Product>(),
      supabase
        .from("warranty_events")
        .select("*")
        .eq("product_id", id)
        .order("created_at", { ascending: false })
        .returns<WarrantyEvent[]>(),
    ]);

  if (productError) throw new Error(productError.message);
  if (eventsError) throw new Error(eventsError.message);
  return { product, events: events || [] };
}

export async function getQrDataUrl(qrCode: string) {
  return QRCode.toDataURL(getWarrantyUrl(qrCode), {
    width: 720,
    margin: 1,
    color: {
      dark: "#020617",
      light: "#ffffff",
    },
  });
}

export async function getOrActivateProduct(qrCode: string) {
  const supabase = getSupabaseAdmin();
  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("qr_code", qrCode)
    .single<Product>();

  if (error || !product) {
    return null;
  }

  if (product.activated_at || product.locked) {
    const { data: events } = await supabase
      .from("warranty_events")
      .select("*")
      .eq("product_id", product.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<WarrantyEvent[]>();
    return { product, events: events || [], justActivated: false };
  }

  const now = new Date();
  const expiresAt = addMonths(now, product.warranty_months);
  const { data: updated, error: updateError } = await supabase
    .from("products")
    .update({
      activated_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .eq("id", product.id)
    .select("*")
    .single<Product>();

  if (updateError || !updated) {
    return { product, events: [], justActivated: false };
  }

  await supabase.from("warranty_events").insert({
    product_id: product.id,
    event_type: "activated",
    note: "Khách quét QR lần đầu và kích hoạt bảo hành",
  });

  revalidatePath(`/warranty/${qrCode}`);
  return {
    product: updated,
    events: [
      {
        id: "just-activated",
        product_id: product.id,
        event_type: "activated",
        note: "Khách quét QR lần đầu và kích hoạt bảo hành",
        created_at: now.toISOString(),
      } satisfies WarrantyEvent,
    ],
    justActivated: true,
  };
}
