"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { randomBytes } from "node:crypto";
import { clearAdminSession, isAdminAuthenticated, isValidAdminPassword, setAdminSession } from "@/lib/auth";
import { getDatabasePool, query } from "@/lib/db";
import type { Product, ProductModel, WarrantyEvent } from "@/lib/types";
import { addMonths, getWarrantyUrl } from "@/lib/warranty";

type ProductRow = Product & {
  product_model_id?: string | null;
  product_model_name?: string | null;
  product_model_code?: string | null;
  product_model_image_url?: string | null;
  product_model_description?: string | null;
  product_model_default_warranty_months?: number | null;
  product_model_default_warranty_uses?: number | null;
  product_model_created_at?: string | null;
  product_model_updated_at?: string | null;
};

type ProductModelWithStats = ProductModel & {
  unit_count: number;
  activated_count: number;
  depleted_count: number;
};

const PRODUCT_WITH_MODEL_SELECT = `
  p.*,
  pm.id as product_model_id,
  pm.name as product_model_name,
  pm.code as product_model_code,
  pm.image_url as product_model_image_url,
  pm.description as product_model_description,
  pm.default_warranty_months as product_model_default_warranty_months,
  pm.default_warranty_uses as product_model_default_warranty_uses,
  pm.created_at as product_model_created_at,
  pm.updated_at as product_model_updated_at
`;

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

function mapProduct(row: ProductRow): Product {
  return {
    ...row,
    product_models: row.product_model_id
      ? {
          id: row.product_model_id,
          name: row.product_model_name || "",
          code: row.product_model_code || "",
          image_url: row.product_model_image_url || null,
          description: row.product_model_description || null,
          default_warranty_months: row.product_model_default_warranty_months || 0,
          default_warranty_uses: row.product_model_default_warranty_uses || 0,
          created_at: row.product_model_created_at || "",
          updated_at: row.product_model_updated_at || "",
        }
      : null,
  };
}

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
}

export async function loginAction(_: unknown, formData: FormData) {
  const password = textValue(formData, "password");
  const nextPath = textValue(formData, "next");
  if (!isValidAdminPassword(password)) {
    return { error: "Mật khẩu admin không đúng." };
  }

  await setAdminSession();
  redirect(nextPath.startsWith("/admin") ? nextPath : "/admin");
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

  try {
    await query(
      `
        insert into product_models
          (name, code, image_url, description, default_warranty_months, default_warranty_uses)
        values ($1, $2, $3, $4, $5, $6)
      `,
      [name, code, imageUrl, description, warrantyMonths, totalUses],
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Không tạo được loại sản phẩm." };
  }

  revalidatePath("/admin");
  redirect("/admin");
}

export async function generateModelQrCodesAction(modelId: string, _: unknown, formData: FormData) {
  await requireAdmin();

  const quantity = Math.min(500, Math.max(1, numberValue(formData, "quantity", 1)));
  const serialStart = Math.max(1, numberValue(formData, "serial_start", 1));
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    await client.query("begin");
    const modelResult = await client.query<ProductModel>("select * from product_models where id = $1", [modelId]);
    const model = modelResult.rows[0];

    if (!model) {
      await client.query("rollback");
      return { error: "Không tìm thấy loại sản phẩm." };
    }

    const values: unknown[] = [];
    const rows = Array.from({ length: quantity }, (_, offset) => {
      const base = offset * 9;
      values.push(
        model.id,
        model.name,
        createSerial(model.code, serialStart + offset),
        createQrCode(),
        model.image_url,
        model.description,
        model.default_warranty_months,
        model.default_warranty_uses,
        model.default_warranty_uses,
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9})`;
    });

    await client.query(
      `
        insert into products
          (
            model_id, name, sku, qr_code, image_url, description,
            warranty_months, total_warranty_uses, remaining_warranty_uses
          )
        values ${rows.join(", ")}
      `,
      values,
    );

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    return { error: error instanceof Error ? error.message : "Không sinh được QR." };
  } finally {
    client.release();
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

  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    await client.query("begin");
    const currentResult = await client.query<Pick<Product, "activated_at" | "model_id">>(
      "select activated_at, model_id from products where id = $1",
      [productId],
    );
    const current = currentResult.rows[0];
    const expiresAt = current?.activated_at
      ? addMonths(new Date(current.activated_at), warrantyMonths).toISOString()
      : null;

    await client.query(
      `
        update products
        set
          name = $1,
          sku = $2,
          image_url = $3,
          description = $4,
          warranty_months = $5,
          total_warranty_uses = $6,
          remaining_warranty_uses = $7,
          expires_at = $8,
          locked = $9
        where id = $10
      `,
      [
        name,
        sku,
        imageUrl,
        description,
        warrantyMonths,
        totalUses,
        Math.min(remainingUses, totalUses),
        expiresAt,
        locked,
        productId,
      ],
    );

    if (current?.model_id) {
      await client.query(
        `
          update product_models
          set
            name = $1,
            image_url = $2,
            description = $3,
            default_warranty_months = $4,
            default_warranty_uses = $5
          where id = $6
        `,
        [name, imageUrl, description, warrantyMonths, totalUses, current.model_id],
      );
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    return { error: error instanceof Error ? error.message : "Không lưu được sản phẩm." };
  } finally {
    client.release();
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/products/${productId}`);
  return { ok: true };
}

export async function consumeWarrantyUseAction(productId: string, _: unknown, formData: FormData) {
  await requireAdmin();

  const note = textValue(formData, "note");
  const pool = getDatabasePool();
  const client = await pool.connect();
  let qrCode: string | null = null;

  try {
    await client.query("begin");
    const productResult = await client.query<Product>("select * from products where id = $1 for update", [productId]);
    const product = productResult.rows[0];

    if (!product) {
      await client.query("rollback");
      return { error: "Không tìm thấy sản phẩm." };
    }

    if (product.remaining_warranty_uses <= 0) {
      await client.query("rollback");
      return { error: "Sản phẩm đã hết lượt bảo hành." };
    }

    qrCode = product.qr_code;
    await client.query("update products set remaining_warranty_uses = remaining_warranty_uses - 1 where id = $1", [
      productId,
    ]);
    await client.query(
      `
        insert into warranty_events (product_id, event_type, note)
        values ($1, 'manual_use', $2)
      `,
      [productId, note || "Admin trừ 1 lượt bảo hành"],
    );

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    return { error: error instanceof Error ? error.message : "Không trừ được lượt bảo hành." };
  } finally {
    client.release();
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/products/${productId}`);
  if (qrCode) revalidatePath(`/warranty/${qrCode}`);
  return { ok: true };
}

export async function getProducts(queryText = "") {
  await requireAdmin();
  const trimmed = queryText.trim();
  const values: unknown[] = [];
  let where = "";

  if (trimmed) {
    values.push(`%${trimmed}%`);
    where = "where p.name ilike $1 or p.sku ilike $1 or p.qr_code ilike $1";
  }

  const result = await query<ProductRow>(
    `
      select ${PRODUCT_WITH_MODEL_SELECT}
      from products p
      left join product_models pm on pm.id = p.model_id
      ${where}
      order by p.created_at desc
    `,
    values,
  );

  return result.rows.map(mapProduct);
}

export async function getProductModels(queryText = "") {
  await requireAdmin();
  const trimmed = queryText.trim();
  const values: unknown[] = [];
  let where = "";

  if (trimmed) {
    values.push(`%${trimmed}%`);
    where = "where pm.name ilike $1 or pm.code ilike $1";
  }

  const result = await query<ProductModelWithStats>(
    `
      select
        pm.*,
        count(p.id)::int as unit_count,
        count(p.id) filter (where p.activated_at is not null)::int as activated_count,
        count(p.id) filter (where p.remaining_warranty_uses <= 0)::int as depleted_count
      from product_models pm
      left join products p on p.model_id = pm.id
      ${where}
      group by pm.id
      order by pm.created_at desc
    `,
    values,
  );

  return result.rows;
}

export async function getProductModelWithProducts(id: string) {
  await requireAdmin();
  const [modelResult, productsResult] = await Promise.all([
    query<ProductModel>("select * from product_models where id = $1", [id]),
    query<ProductRow>(
      `
        select ${PRODUCT_WITH_MODEL_SELECT}
        from products p
        left join product_models pm on pm.id = p.model_id
        where p.model_id = $1
        order by p.sku asc
      `,
      [id],
    ),
  ]);

  const model = modelResult.rows[0];
  if (!model) throw new Error("Không tìm thấy loại sản phẩm.");

  return { model, products: productsResult.rows.map(mapProduct) };
}

export async function getProductModelWithProductsPage(id: string, page = 1, pageSize = 50) {
  await requireAdmin();
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(10, pageSize));
  const offset = (safePage - 1) * safePageSize;

  const [modelResult, countResult, productsResult] = await Promise.all([
    query<ProductModel>("select * from product_models where id = $1", [id]),
    query<{ total: string }>("select count(*)::text as total from products where model_id = $1", [id]),
    query<ProductRow>(
      `
        select ${PRODUCT_WITH_MODEL_SELECT}
        from products p
        left join product_models pm on pm.id = p.model_id
        where p.model_id = $1
        order by p.sku asc
        limit $2 offset $3
      `,
      [id, safePageSize, offset],
    ),
  ]);

  const model = modelResult.rows[0];
  if (!model) throw new Error("KhÃ´ng tÃ¬m tháº¥y loáº¡i sáº£n pháº©m.");

  const total = Number(countResult.rows[0]?.total || 0);

  return {
    model,
    products: productsResult.rows.map(mapProduct),
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    },
  };
}

export async function getProductWithEvents(id: string) {
  await requireAdmin();
  const [productResult, eventsResult] = await Promise.all([
    query<ProductRow>(
      `
        select ${PRODUCT_WITH_MODEL_SELECT}
        from products p
        left join product_models pm on pm.id = p.model_id
        where p.id = $1
      `,
      [id],
    ),
    query<WarrantyEvent>("select * from warranty_events where product_id = $1 order by created_at desc", [id]),
  ]);

  const product = productResult.rows[0];
  if (!product) throw new Error("Không tìm thấy sản phẩm.");

  return { product: mapProduct(product), events: eventsResult.rows };
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

export async function getProductByQrCode(qrCode: string) {
  const [productResult, eventsResult] = await Promise.all([
    query<ProductRow>(
      `
        select ${PRODUCT_WITH_MODEL_SELECT}
        from products p
        left join product_models pm on pm.id = p.model_id
        where p.qr_code = $1
      `,
      [qrCode],
    ),
    query<WarrantyEvent>(
      `
        select we.*
        from warranty_events we
        join products p on p.id = we.product_id
        where p.qr_code = $1
        order by we.created_at desc
        limit 5
      `,
      [qrCode],
    ),
  ]);

  const product = productResult.rows[0];
  if (!product) return null;

  return { product: mapProduct(product), events: eventsResult.rows };
}

export async function activateWarrantyAction(qrCode: string, _: unknown, formData: FormData) {
  const customerName = textValue(formData, "customer_name");
  const customerPhone = textValue(formData, "customer_phone").replace(/\s+/g, "");

  if (customerName.length < 2) {
    return { error: "Vui lòng nhập tên người nhận bảo hành." };
  }

  if (!/^(0|\+84)[0-9]{8,10}$/.test(customerPhone)) {
    return { error: "Số điện thoại chưa đúng định dạng." };
  }

  const pool = getDatabasePool();
  const client = await pool.connect();
  let productId: string | null = null;
  let alreadyActivated = false;

  try {
    await client.query("begin");
    const productResult = await client.query<Product>("select * from products where qr_code = $1 for update", [
      qrCode,
    ]);
    const product = productResult.rows[0];

    if (!product) {
      await client.query("rollback");
      return { error: "Không tìm thấy sản phẩm." };
    }

    if (product.locked) {
      await client.query("rollback");
      return { error: "Mã QR này đang bị khóa, vui lòng liên hệ shop." };
    }

    if (product.activated_at) {
      await client.query("rollback");
      alreadyActivated = true;
    } else {
      const now = new Date();
      const expiresAt = addMonths(now, product.warranty_months);
      productId = product.id;

      await client.query(
        `
          update products
          set customer_name = $1, customer_phone = $2, activated_at = $3, expires_at = $4
          where id = $5
        `,
        [customerName, customerPhone, now.toISOString(), expiresAt.toISOString(), product.id],
      );

      await client.query(
        `
          insert into warranty_events (product_id, event_type, note)
          values ($1, 'activated', $2)
        `,
        [product.id, "Khách kích hoạt bảo hành qua QR"],
      );

      await client.query("commit");
    }
  } catch (error) {
    await client.query("rollback");
    return { error: error instanceof Error ? error.message : "Không kích hoạt được bảo hành." };
  } finally {
    client.release();
  }

  if (alreadyActivated) redirect(`/warranty/${qrCode}`);
  if (productId) revalidatePath(`/admin/products/${productId}`);
  redirect(`/warranty/${qrCode}?activated=1`);
}
