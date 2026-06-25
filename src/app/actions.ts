"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { randomBytes } from "node:crypto";
import { clearAdminSession, isAdminAuthenticated, isValidAdminPassword, setAdminSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Product, ProductModel, WarrantyEvent } from "@/lib/types";
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

function normalizeCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

function createSerial(prefix: string, index: number) {
  return `${prefix}-${String(index).padStart(4, "0")}`;
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

export async function createProductModelAction(_: unknown, formData: FormData) {
  await requireAdmin();

  const name = textValue(formData, "name");
  const code = normalizeCode(textValue(formData, "code") || name);
  const imageUrl = textValue(formData, "image_url") || null;
  const description = textValue(formData, "description") || null;
  const warrantyMonths = Math.max(1, numberValue(formData, "warranty_months", 12));
  const totalUses = Math.max(0, numberValue(formData, "total_warranty_uses", 1));

  if (!name || !code) {
    return { error: "Cần nhập tên loại sản phẩm và mã loại." };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("product_models")
    .insert({
      name,
      code,
      image_url: imageUrl,
      description,
      default_warranty_months: warrantyMonths,
      default_warranty_uses: totalUses,
    })
    .select("*");

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  redirect("/admin");
}

export async function generateModelQrCodesAction(modelId: string, _: unknown, formData: FormData) {
  await requireAdmin();

  const quantity = Math.min(500, Math.max(1, numberValue(formData, "quantity", 1)));
  const serialStart = Math.max(1, numberValue(formData, "serial_start", 1));
  const supabase = getSupabaseAdmin();

  const { data: model, error: modelError } = await supabase
    .from("product_models")
    .select("*")
    .eq("id", modelId)
    .single<ProductModel>();

  if (modelError || !model) {
    return { error: modelError?.message || "Không tìm thấy loại sản phẩm." };
  }

  const products = Array.from({ length: quantity }, (_, offset) => ({
    model_id: model.id,
    name: model.name,
    sku: createSerial(model.code, serialStart + offset),
    qr_code: createQrCode(),
    image_url: model.image_url,
    description: model.description,
    warranty_months: model.default_warranty_months,
    total_warranty_uses: model.default_warranty_uses,
    remaining_warranty_uses: model.default_warranty_uses,
  }));

  const { error } = await supabase.from("products").insert(products);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/models/${modelId}`);
  return { ok: true };
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
    return { error: "Cần nhập tên sản phẩm và serial." };
  }

  const supabase = getSupabaseAdmin();
  const { data: current } = await supabase
    .from("products")
    .select("activated_at, model_id")
    .eq("id", productId)
    .single<Pick<Product, "activated_at" | "model_id">>();

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

  if (current?.model_id) {
    await supabase
      .from("product_models")
      .update({
        name,
        image_url: imageUrl,
        description,
        default_warranty_months: warrantyMonths,
        default_warranty_uses: totalUses,
      })
      .eq("id", current.model_id);
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
    .select("*, product_models(*)")
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

export async function getProductModels(query = "") {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const trimmed = query.trim();

  const modelsRequest = supabase
    .from("product_models")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: models, error: modelsError } = trimmed
    ? await modelsRequest.or(`name.ilike.%${trimmed}%,code.ilike.%${trimmed}%`)
    : await modelsRequest;

  if (modelsError) throw new Error(modelsError.message);

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, model_id, activated_at, remaining_warranty_uses");

  if (productsError) throw new Error(productsError.message);

  return (models || []).map((model) => {
    const units = (products || []).filter((product) => product.model_id === model.id);
    return {
      ...model,
      unit_count: units.length,
      activated_count: units.filter((product) => product.activated_at).length,
      depleted_count: units.filter((product) => product.remaining_warranty_uses <= 0).length,
    };
  });
}

export async function getProductModelWithProducts(id: string) {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const [{ data: model, error: modelError }, { data: products, error: productsError }] =
    await Promise.all([
      supabase.from("product_models").select("*").eq("id", id).single<ProductModel>(),
      supabase
        .from("products")
        .select("*, product_models(*)")
        .eq("model_id", id)
        .order("sku", { ascending: true })
        .returns<Product[]>(),
    ]);

  if (modelError) throw new Error(modelError.message);
  if (productsError) throw new Error(productsError.message);
  return { model, products: products || [] };
}

export async function getProductWithEvents(id: string) {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const [{ data: product, error: productError }, { data: events, error: eventsError }] =
    await Promise.all([
      supabase.from("products").select("*, product_models(*)").eq("id", id).single<Product>(),
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
    .select("*, product_models(*)")
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
    .select("*, product_models(*)")
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
