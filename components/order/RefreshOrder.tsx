"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function RefreshOrder() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button className="btn-ghost" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
      {pending ? "Aggiornamento..." : "Aggiorna stato"}
    </button>
  );
}
