"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

type ActivationSuccessGateProps = {
  active: boolean;
  children: React.ReactNode;
};

export function ActivationSuccessGate({ active, children }: ActivationSuccessGateProps) {
  const [showSuccess, setShowSuccess] = useState(active);

  useEffect(() => {
    if (!active) return;

    const timer = window.setTimeout(() => {
      setShowSuccess(false);
      window.history.replaceState(null, "", window.location.pathname);
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [active]);

  if (showSuccess) {
    return (
      <main className="market-verify">
        <section className="activation-success-screen">
          <div className="activation-success-icon">
            <CheckCircle2 size={52} />
          </div>
          <h1>Kích hoạt thành công</h1>
          <p>Phiếu bảo hành điện tử đã được lưu. Hệ thống sẽ mở thông tin bảo hành ngay sau đây.</p>
          <div className="activation-success-loader" aria-hidden="true">
            <span />
          </div>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
