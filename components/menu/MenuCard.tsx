"use client";

import { Plus, Check, Clock, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { MenuItem } from "@/types";
import { useCartStore } from "@/store/cartStore";
import { useAccessoryStore, type Accessory } from "@/store/accessoryStore";
import { formatPrice, getSpiceLevelLabel } from "@/lib/utils";
import toast from "react-hot-toast";
import { useState } from "react";

interface MenuCardProps {
  item: MenuItem;
}

const NO_ACCESSORIES: Accessory[] = [];

export default function MenuCard({ item }: MenuCardProps) {
  const { addItem, items } = useCartStore();
  const accessoriesEnabled = useAccessoryStore((state) => state.enabled);
  const accessoryOptions = useAccessoryStore(
    (state) => state.byProduct[item.id],
  ) ?? NO_ACCESSORIES;
  const [added, setAdded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]);
  const inCart = items.filter((i) => i.id === item.id).reduce((sum, current) => sum + current.quantity, 0);

  const handleAdd = async () => {
    let accessoryState = useAccessoryStore.getState();
    if (!accessoryState.loaded) {
      try {
        await accessoryState.load();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Impossibile caricare le personalizzazioni.");
        return;
      }
      accessoryState = useAccessoryStore.getState();
    }
    const options = accessoryState.byProduct[item.id] ?? [];
    if (accessoryState.enabled && options.length > 0 && !pickerOpen) {
      setPickerOpen(true);
      return;
    }
    addItem(
      item,
      options.filter(({ id }) => selectedAccessories.includes(id)),
    );
    setPickerOpen(false);
    setSelectedAccessories([]);
    setAdded(true);
    toast.success(`${item.name} aggiunto all’ordine`);
    setTimeout(() => setAdded(false), 1500);
  };

  const spiceColors = ["#8A7566", "#D4A843", "#E8541A", "#CC2200"];

  return (
    <motion.div
      className="card"
      style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}
      initial={{ opacity: 0, y: 18, scale: 0.996 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Image */}
      <div style={{ position: "relative", height: "180px", overflow: "hidden" }}>
        <img
          src={item.image}
          alt={item.name}
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            transition: "transform 0.4s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        />
        {/* Overlay gradient */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "60px",
          background: "linear-gradient(transparent, rgba(26,22,18,0.8))",
        }} />

        {/* Badges */}
        <div style={{ position: "absolute", top: "10px", left: "10px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {item.featured && (
            <span className="badge" style={{ background: "#E8541A", color: "white" }}>
              In evidenza
            </span>
          )}
          {item.tags.includes("bestseller") && (
            <span className="badge" style={{ background: "#D4A843", color: "#1A1612" }}>
              Più venduto
            </span>
          )}
        </div>

        {!item.available && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "#8A7566", fontWeight: 600, fontSize: "14px" }}>Non disponibile</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1 }}>
          <h3 className="font-display" style={{ fontSize: "18px", fontWeight: 700, color: "#F5EDD8", marginBottom: "6px" }}>
            {item.name}
          </h3>
          <p style={{ fontSize: "13px", color: "#8A7566", lineHeight: "1.5", marginBottom: "12px" }}>
            {item.description}
          </p>

          {/* Meta */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "14px" }}>
            {item.prepTime && (
              <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#8A7566" }}>
                <Clock size={12} />
                {item.prepTime} min
              </span>
            )}
            {(item.spiceLevel ?? 0) > 0 && (
              <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: spiceColors[item.spiceLevel ?? 0] }}>
                <Flame size={12} />
                {getSpiceLevelLabel(item.spiceLevel ?? 0)}
              </span>
            )}
            {inCart > 0 && (
              <span style={{ fontSize: "12px", color: "#D4A843", fontWeight: 600 }}>
                ×{inCart} nel carrello
              </span>
            )}
          </div>

          {accessoriesEnabled && accessoryOptions.length > 0 && pickerOpen && (
            <fieldset style={{
              border: "1px solid #3D3028",
              borderRadius: "10px",
              padding: "10px 12px",
              margin: "0 0 14px",
              minWidth: 0,
            }}>
              <legend style={{ padding: "0 6px", color: "#F5EDD8", fontSize: "13px", fontWeight: 700 }}>
                Personalizza il tuo ordine
              </legend>
              <div style={{ display: "grid", gap: "8px" }}>
                {accessoryOptions.map((accessory) => (
                  <label key={accessory.id} style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "9px",
                    color: "#F5EDD8",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedAccessories.includes(accessory.id)}
                      onChange={(event) => setSelectedAccessories((current) =>
                        event.target.checked
                          ? [...current, accessory.id]
                          : current.filter((id) => id !== accessory.id),
                      )}
                      style={{ accentColor: "#E8541A", marginTop: "2px" }}
                    />
                    <span style={{ flex: 1 }}>
                      {accessory.name}
                      {accessory.description && (
                        <span style={{ display: "block", color: "#8A7566", fontSize: "12px", marginTop: "2px" }}>
                          {accessory.description}
                        </span>
                      )}
                    </span>
                    <span style={{ color: "#34D399", fontSize: "11px", fontWeight: 700 }}>GRATIS</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>

        {/* Price & Add */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="font-display" style={{ fontSize: "20px", fontWeight: 700, color: "#E8541A" }}>
            {formatPrice(item.price)}
          </span>
          <button
            onClick={handleAdd}
            disabled={!item.available}
            aria-label={pickerOpen ? `Aggiungi ${item.name} al carrello` : `Personalizza o aggiungi ${item.name}`}
            style={{
              width: pickerOpen ? "auto" : "36px", minHeight: "36px", borderRadius: "8px",
              background: added ? "#25D366" : "#E8541A",
              border: "none", cursor: item.available ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
              padding: pickerOpen ? "0 12px" : "0",
              fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap",
              color: "white", transition: "background 0.2s, transform 0.1s",
              transform: added ? "scale(0.95)" : "scale(1)",
              opacity: item.available ? 1 : 0.4,
            }}
          >
            {added ? <Check size={16} /> : pickerOpen ? <><Check size={15} /> Aggiungi</> : <Plus size={16} />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
