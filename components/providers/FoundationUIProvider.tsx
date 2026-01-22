"use client";

import { useEffect } from "react";
import Link from "next/link";
import { setUIConfig } from "@filecoin-foundation/ui-filecoin/config/ui-config";

export function FoundationUIProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    setUIConfig({
      baseDomain: "filecoin.cloud",
      Link: Link as any,
    });
  }, []);

  return <>{children}</>;
}
