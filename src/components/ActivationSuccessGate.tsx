"use client";

import { useEffect } from "react";

type ActivationSuccessGateProps = {
  active: boolean;
};

export function ActivationSuccessGate({ active }: ActivationSuccessGateProps) {
  useEffect(() => {
    if (!active) return;

    const timer = window.setTimeout(() => {
      window.history.replaceState(null, "", window.location.pathname);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [active]);

  return null;
}
