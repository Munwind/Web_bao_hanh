import { ShieldCheck, ShieldAlert, ShieldQuestion, LockKeyhole } from "lucide-react";
import type { Product } from "@/lib/types";
import { getProductStatus } from "@/lib/warranty";

export function StatusBadge({ product }: { product: Product }) {
  const status = getProductStatus(product);
  const Icon =
    status.key === "active"
      ? ShieldCheck
      : status.key === "locked"
        ? LockKeyhole
        : status.key === "inactive"
          ? ShieldQuestion
          : ShieldAlert;

  return (
    <span className={`status-badge status-${status.tone}`}>
      <Icon size={16} aria-hidden />
      {status.label}
    </span>
  );
}
