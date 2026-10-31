"use client";

import { X, Minus, Plus, Trash2, ShoppingBag, MessageCircle } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { formatPrice, buildWhatsAppOrderMessage, getWhatsAppUrl } from "@/lib/utils";
import { useEffect } from "react";
import Link from "next/link";

export default function Cart() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, subtotal, itemCount } = useCartStore();
  const sub = subtotal();
  const total = sub;
  const count = itemCount();

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleWhatsAppOrder = () => {
    const msg = buildWhatsAppOrderMessage(items, total, "pickup");
    window.open(getWhatsAppUrl(msg), "_blank");
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={closeCart}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)", zIndex: 1100,
        }}
      />

      {/* Drawer */}
      <div
        className="slide-in"
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: "100%", maxWidth: "420px",
          background: "#1A1612", borderLeft: "1px solid #3D3028",
          zIndex: 1200, display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid #3D3028",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ShoppingBag size={20} color="#E8541A" />
            <span className="font-display" style={{ fontSize: "20px", fontWeight: 700, color: "#F5EDD8" }}>
              Il tuo ordine
            </span>
            {count > 0 && (
              <span style={{
                background: "#E8541A", color: "white", borderRadius: "20px",
                padding: "2px 8px", fontSize: "12px", fontWeight: 700,
              }}>{count}</span>
            )}
          </div>
          <button onClick={closeCart} style={{ background: "transparent", border: "none", color: "#8A7566", cursor: "pointer" }}>
            <X size={22} />
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#8A7566" }}>
              <ShoppingBag size={48} style={{ margin: "0 auto 16px", opacity: 0.3, display: "block" }} />
              <p style={{ fontFamily: "var(--font-display)", fontSize: "18px", marginBottom: "8px" }}>Il carrello è vuoto</p>
              <p style={{ fontSize: "14px" }}>Aggiungi qualche piatto</p>
              <button
                onClick={closeCart}
                className="btn-ember"
                style={{ marginTop: "24px", padding: "10px 24px", borderRadius: "8px", fontSize: "14px" }}
              >
                Sfoglia il menu
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {items.map((item) => (
                <div key={item.cartId ?? item.id} style={{
                  background: "#221C16", border: "1px solid #3D3028", borderRadius: "10px", padding: "14px",
                  display: "flex", gap: "12px",
                }}>
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{ width: "56px", height: "56px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: "14px", color: "#F5EDD8", marginBottom: "4px" }}>
                      {item.name}
                    </p>
                    <p style={{ fontSize: "13px", color: "#E8541A", fontWeight: 600 }}>
                      {formatPrice(item.price)}
                    </p>
                    {!!item.accessories?.length && (
                      <p style={{ fontSize: "13px", color: "#FFFFFF", fontWeight: 600, lineHeight: 1.5, marginTop: "6px", overflowWrap: "anywhere" }}>
                        {item.accessories.map(({ name }) => name).join(" · ")}
                      </p>
                    )}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <button
                          onClick={() => updateQuantity(item.cartId ?? item.id, item.quantity - 1)}
                          style={{
                            width: "26px", height: "26px", borderRadius: "6px", background: "#3D3028",
                            border: "none", color: "#F5EDD8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{ fontSize: "14px", fontWeight: 600, color: "#F5EDD8", minWidth: "16px", textAlign: "center" }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.cartId ?? item.id, item.quantity + 1)}
                          style={{
                            width: "26px", height: "26px", borderRadius: "6px", background: "#E8541A",
                            border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#F5EDD8" }}>
                          {formatPrice(item.price * item.quantity)}
                        </span>
                        <button
                          onClick={() => removeItem(item.cartId ?? item.id)}
                          style={{ background: "transparent", border: "none", color: "#8A7566", cursor: "pointer" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{ padding: "20px 24px", borderTop: "1px solid #3D3028" }}>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "13px", color: "#8A7566" }}>Subtotale</span>
                <span style={{ fontSize: "13px", color: "#F5EDD8" }}>{formatPrice(sub)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid #3D3028" }}>
                <span style={{ fontWeight: 700, fontSize: "16px", color: "#F5EDD8" }}>Totale</span>
                <span style={{ fontWeight: 700, fontSize: "18px", color: "#E8541A" }}>{formatPrice(total)}</span>
              </div>
            </div>

            <Link href="/order" onClick={closeCart} style={{ textDecoration: "none", display: "block" }}>
              <button className="btn-ember" style={{
                width: "100%", padding: "14px", borderRadius: "10px",
                fontSize: "15px", fontWeight: 600, marginBottom: "10px",
              }}>
                Vai all&apos;ordine — {formatPrice(total)}
              </button>
            </Link>

            <button
              onClick={handleWhatsAppOrder}
              style={{
                width: "100%", padding: "12px", borderRadius: "10px",
                fontSize: "14px", fontWeight: 600, cursor: "pointer",
                background: "#25D366", color: "white", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                transition: "opacity 0.2s",
              }}
            >
              <MessageCircle size={18} />
              Ordina su WhatsApp
            </button>
          </div>
        )}
      </div>
    </>
  );
}
