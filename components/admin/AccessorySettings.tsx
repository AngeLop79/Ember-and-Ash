"use client";

import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

type Accessory = {
  id: string;
  name: string;
  description: string;
  available: boolean;
  menuItemIds: string[];
};
type Product = {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  accessoryIds: string[];
};
type Settings = { enabled: boolean; accessories: Accessory[]; products: Product[] };

async function fetchSettings(): Promise<Settings> {
  const response = await fetch("/api/admin/accessories", { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Impossibile caricare le configurazioni.");
  return result as Settings;
}

const cardStyle = {
  background: "#221C16",
  border: "1px solid #3D3028",
  borderRadius: "12px",
  padding: "16px",
};
const inputStyle = {
  width: "100%",
  background: "#1A1612",
  border: "1px solid #3D3028",
  borderRadius: "8px",
  color: "#F5EDD8",
  padding: "10px 12px",
};

export default function AccessorySettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setSettings(await fetchSettings());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossibile caricare le configurazioni.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchSettings().then((result) => {
      if (active) setSettings(result);
    }).catch((error: unknown) => {
      if (active) toast.error(error instanceof Error ? error.message : "Impossibile caricare le configurazioni.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const persistConfiguration = async (next = settings) => {
    if (!next) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/accessories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: next.enabled,
          products: next.products.map(({ id, enabled, accessoryIds }) => ({ id, enabled, accessoryIds })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossibile salvare le configurazioni.");
      toast.success("Configurazioni salvate.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossibile salvare le configurazioni.");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const createAccessory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/admin/accessories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDescription }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossibile creare l’accessorio.");
      setNewName("");
      setNewDescription("");
      await load();
      toast.success("Accessorio creato.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossibile creare l’accessorio.");
    } finally {
      setSaving(false);
    }
  };

  const saveAccessory = async (accessory: Accessory) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/accessories/${encodeURIComponent(accessory.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: accessory.name,
          description: accessory.description,
          available: accessory.available,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossibile aggiornare l’accessorio.");
      toast.success("Accessorio aggiornato.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossibile aggiornare l’accessorio.");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const deleteAccessory = async (id: string) => {
    if (!window.confirm("Eliminare questo accessorio? Gli ordini già effettuati conserveranno la loro copia.")) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/accessories/${encodeURIComponent(id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossibile eliminare l’accessorio.");
      await load();
      toast.success("Accessorio eliminato.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossibile eliminare l’accessorio.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p role="status" style={{ color: "#8A7566" }}>Caricamento configurazioni…</p>;
  if (!settings) {
    return <div className="card" style={cardStyle}>
      <p role="alert" style={{ color: "#FCA5A5", marginBottom: "12px" }}>Le configurazioni non sono disponibili.</p>
      <button type="button" className="btn-ghost" onClick={() => void load()}>Riprova</button>
    </div>;
  }

  return (
    <section style={{ display: "grid", gap: "18px" }}>
      <div style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
        <div>
          <h2 className="font-display" style={{ color: "#F5EDD8", fontSize: "24px" }}>Accessori e personalizzazioni</h2>
          <p style={{ color: "#8A7566", fontSize: "13px", marginTop: "4px" }}>
            Le configurazioni restano salvate anche quando la funzione è disattivata.
          </p>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "10px", color: "#F5EDD8", fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) => {
              const next = { ...settings, enabled: event.target.checked };
              setSettings(next);
              void persistConfiguration(next);
            }}
            style={{ accentColor: "#E8541A", width: "18px", height: "18px" }}
          />
          Personalizzazione attiva
        </label>
      </div>

      <form onSubmit={createAccessory} className="card" style={{ ...cardStyle, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", alignItems: "end" }}>
        <label style={{ color: "#8A7566", fontSize: "12px" }}>
          Nome
          <input required maxLength={80} value={newName} onChange={(event) => setNewName(event.target.value)} style={{ ...inputStyle, display: "block", marginTop: "6px" }} />
        </label>
        <label style={{ color: "#8A7566", fontSize: "12px" }}>
          Descrizione breve (facoltativa)
          <input maxLength={240} value={newDescription} onChange={(event) => setNewDescription(event.target.value)} style={{ ...inputStyle, display: "block", marginTop: "6px" }} />
        </label>
        <button className="btn-ember" disabled={saving} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", minHeight: "42px" }}>
          <Plus size={16} /> Crea accessorio
        </button>
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "12px" }}>
        {settings.accessories.map((accessory) => (
          <article key={accessory.id} className="card" style={{ ...cardStyle, display: "grid", gap: "10px" }}>
            <label style={{ color: "#8A7566", fontSize: "12px" }}>
              Nome
              <input value={accessory.name} maxLength={80} onChange={(event) => setSettings({
                ...settings,
                accessories: settings.accessories.map((item) => item.id === accessory.id ? { ...item, name: event.target.value } : item),
              })} style={{ ...inputStyle, display: "block", marginTop: "5px" }} />
            </label>
            <label style={{ color: "#8A7566", fontSize: "12px" }}>
              Descrizione
              <input value={accessory.description} maxLength={240} onChange={(event) => setSettings({
                ...settings,
                accessories: settings.accessories.map((item) => item.id === accessory.id ? { ...item, description: event.target.value } : item),
              })} style={{ ...inputStyle, display: "block", marginTop: "5px" }} />
            </label>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "7px", color: accessory.available ? "#34D399" : "#8A7566", fontSize: "13px" }}>
                <input type="checkbox" checked={accessory.available} onChange={(event) => setSettings({
                  ...settings,
                  accessories: settings.accessories.map((item) => item.id === accessory.id ? { ...item, available: event.target.checked } : item),
                })} style={{ accentColor: "#E8541A" }} />
                Disponibile
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="button" className="btn-ghost" disabled={saving} onClick={() => void saveAccessory(accessory)} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <Save size={14} /> Salva
                </button>
                <button type="button" aria-label={`Elimina ${accessory.name}`} onClick={() => void deleteAccessory(accessory.id)} style={{ color: "#FCA5A5", background: "transparent", border: "1px solid #513131", borderRadius: "8px", padding: "8px", cursor: "pointer" }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </article>
        ))}
        {settings.accessories.length === 0 && <p style={{ color: "#8A7566" }}>Nessun accessorio configurato.</p>}
      </div>

      <div>
        <h3 className="font-display" style={{ fontSize: "22px", color: "#F5EDD8", marginBottom: "12px" }}>Prodotti e accessori associati</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: "12px" }}>
          {settings.products.map((product) => (
            <article key={product.id} className="card" style={cardStyle}>
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", color: "#F5EDD8", fontWeight: 700 }}>
                <span>{product.name}</span>
                <span style={{ display: "flex", alignItems: "center", gap: "7px", color: "#D4A843", fontSize: "12px", whiteSpace: "nowrap" }}>
                  <input type="checkbox" checked={product.enabled} onChange={(event) => setSettings({
                    ...settings,
                    products: settings.products.map((item) => item.id === product.id ? { ...item, enabled: event.target.checked } : item),
                  })} style={{ accentColor: "#E8541A" }} />
                  Personalizzazione attiva
                </span>
              </label>
              <div style={{ display: "grid", gap: "8px", marginTop: "14px" }}>
                {settings.accessories.map((accessory) => (
                  <label key={accessory.id} style={{ display: "flex", alignItems: "center", gap: "9px", color: accessory.available ? "#F5EDD8" : "#8A7566", fontSize: "13px" }}>
                    <input
                      type="checkbox"
                      checked={product.accessoryIds.includes(accessory.id)}
                      onChange={(event) => setSettings({
                        ...settings,
                        products: settings.products.map((item) => item.id === product.id ? {
                          ...item,
                          accessoryIds: event.target.checked
                            ? [...item.accessoryIds, accessory.id]
                            : item.accessoryIds.filter((id) => id !== accessory.id),
                        } : item),
                      })}
                      style={{ accentColor: "#E8541A" }}
                    />
                    {accessory.name}
                    {!accessory.available && <span>(non disponibile)</span>}
                  </label>
                ))}
                {!settings.accessories.length && <span style={{ color: "#8A7566", fontSize: "13px" }}>Crea un accessorio per configurare questo prodotto.</span>}
              </div>
            </article>
          ))}
        </div>
        <button type="button" className="btn-ember" disabled={saving} onClick={() => void persistConfiguration()} style={{ marginTop: "16px" }}>
          {saving ? "Salvataggio…" : "Salva impostazioni e associazioni"}
        </button>
      </div>
    </section>
  );
}
