"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function AdminLoginPage() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Impossibile accedere all'area amministrativa.");
      }
      setKey("");
      router.replace("/admin");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Accesso non riuscito.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px" }}>
      <form onSubmit={signIn} className="card" style={{ width: "100%", maxWidth: "440px", padding: "32px" }}>
        <p className="section-label">Area riservata allo staff</p>
        <h1 className="font-display" style={{ fontSize: "28px", margin: "16px 0" }}>
          Accesso amministrazione
        </h1>
        <p style={{ color: "#8A7566", marginBottom: "24px" }}>
          Usa la chiave ADMIN_API_KEY configurata sul server.
          L&apos;accesso staff non usa l&apos;account cliente.
        </p>
        <label htmlFor="admin-key">Chiave admin</label>
        <input
          id="admin-key"
          className="input-field"
          type="password"
          autoComplete="current-password"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          required
          disabled={loading}
          style={{ margin: "8px 0 20px" }}
        />
        <button type="submit" disabled={loading} className="btn-ember" style={{ width: "100%" }}>
          {loading ? "Accesso in corso..." : "Accedi all'amministrazione"}
        </button>
        <Link href="/" style={{ display: "block", marginTop: "24px", color: "#D4A843" }}>
          Torna al sito
        </Link>
      </form>
    </div>
  );
}
