import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { getProductModelWithProductsPage, getQrDataUrl } from "@/app/actions";
import { EmptyConfig } from "@/components/EmptyConfig";
import { PrintButton } from "@/components/PrintButton";
import { hasDatabaseConfig } from "@/lib/db";
import { getWarrantyUrl } from "@/lib/warranty";

export const dynamic = "force-dynamic";

export default async function ProductModelPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  if (!hasDatabaseConfig()) return <EmptyConfig />;

  const { id } = await params;
  const { page: pageParam = "1" } = await searchParams;
  const currentPage = Number(pageParam) || 1;
  const { model, products, pagination } = await getProductModelWithProductsPage(id, currentPage, 100);
  const previousPage = Math.max(1, pagination.page - 1);
  const nextPage = Math.min(pagination.totalPages, pagination.page + 1);
  const qrLabels = await Promise.all(
    products.map(async (product) => ({
      product,
      qrDataUrl: await getQrDataUrl(product.qr_code),
      warrantyUrl: getWarrantyUrl(product.qr_code),
    })),
  );

  return (
    <main className="admin-shell print-page">
      <header className="admin-header no-print">
        <div>
          <Link className="back-link" href={`/admin/models/${model.id}`}>
            <ArrowLeft size={16} /> Quay lại danh sách serial
          </Link>
          <h1>In QR: {model.name}</h1>
          <p className="page-subtitle">
            Lô {pagination.page}/{pagination.totalPages} · {products.length}/{pagination.total} QR
          </p>
        </div>
        <PrintButton disabled={products.length === 0} />
      </header>

      {pagination.totalPages > 1 ? (
        <nav className="pagination-bar no-print" aria-label="Chọn lô in QR">
          <Link
            aria-disabled={pagination.page <= 1}
            className={`btn btn-ghost ${pagination.page <= 1 ? "is-disabled" : ""}`}
            href={`/admin/models/${model.id}/print?page=${previousPage}`}
          >
            <ChevronLeft size={16} /> Lô trước
          </Link>
          <span>
            Mỗi lô tối đa 100 QR · lô {pagination.page}/{pagination.totalPages}
          </span>
          <Link
            aria-disabled={pagination.page >= pagination.totalPages}
            className={`btn btn-ghost ${pagination.page >= pagination.totalPages ? "is-disabled" : ""}`}
            href={`/admin/models/${model.id}/print?page=${nextPage}`}
          >
            Lô sau <ChevronRight size={16} />
          </Link>
        </nav>
      ) : null}

      <section className="qr-print-sheet print-preview">
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
