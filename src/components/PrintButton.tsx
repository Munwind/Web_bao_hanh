"use client";

import { Printer } from "lucide-react";

export function PrintButton({ disabled = false }: { disabled?: boolean }) {
  return (
    <button className="btn btn-primary no-print" disabled={disabled} onClick={() => window.print()} type="button">
      <Printer size={16} /> In danh sách QR
    </button>
  );
}
