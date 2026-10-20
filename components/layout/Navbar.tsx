"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingBag,
  Menu,
  X,
  Flame,
  ChevronRight,
  LogOut,
  User,
} from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useRef, useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/order", label: "Ordini" },
  { href: "/reservations", label: "Prenotazioni" },
  { href: "/tracking", label: "Traccia ordine" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { itemCount, toggleCart, hasHydrated: cartHydrated } = useCartStore();
  const {
    user,
    isAuthenticated,
    signOut,
    hasHydrated: authHydrated,
  } = useAuthStore();
  const count = itemCount();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setAccountOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      setAccountOpen(false);
    }
  }, [mobileOpen]);

  useEffect(() => {
    if (!cartHydrated) {
      useCartStore.persist.rehydrate();
    }
    if (!authHydrated) {
      useAuthStore.persist.rehydrate();
    }
  }, [cartHydrated, authHydrated]);

  return (
    <>
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          borderBottom: mobileOpen
            ? "1px solid rgba(61,48,40,0.8)"
            : "1px solid #3D3028",
          backdropFilter: "blur(20px)",
          backgroundColor: mobileOpen
            ? "rgba(5,4,3,0.98)"
            : "rgba(26,22,18,0.92)",
        }}
      >
        <div
          style={{
            maxWidth: "1240px",
            margin: "0 auto",
            padding: "0 20px",
            height: "64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "14px",
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Flame size={22} color="#E8541A" />
            <span
              className="font-display logo-text"
              style={{
                fontWeight: 700,
                color: "#F5EDD8",
                letterSpacing: "0.01em",
              }}
            >
              I ragazzi del sole
            </span>
          </Link>

          {/* Desktop Links */}
          <div style={{ display: "flex", gap: "28px" }} className="desktop-nav">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                  color: pathname === link.href ? "#E8541A" : "#8A7566",
                  transition: "color 0.2s",
                  borderBottom:
                    pathname === link.href ? "1px solid #E8541A" : "none",
                  paddingBottom: "2px",
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              className="account-link"
              ref={accountMenuRef}
              style={{ position: "relative" }}
            >
              <button
                onClick={() => setAccountOpen((prev) => !prev)}
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  color: isAuthenticated ? "#34D399" : "#F5EDD8",
                  padding: "8px 12px",
                  border: "1px solid #3D3028",
                  borderRadius: "999px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: isAuthenticated
                    ? "rgba(52,211,153,0.08)"
                    : "transparent",
                  maxWidth: "170px",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  cursor: "pointer",
                }}
              >
                <User size={14} />
                <span suppressHydrationWarning>
                  {isAuthenticated && user?.name
                    ? user.name.split(" ")[0]
                    : "Profilo"}
                </span>
              </button>

              {accountOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 10px)",
                    right: 0,
                    width: "240px",
                    background: "#120E0C",
                    border: "1px solid rgba(61,48,40,0.9)",
                    borderRadius: "14px",
                    boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
                    padding: "14px",
                    zIndex: 1200,
                  }}
                >
                  {isAuthenticated ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#8A7566",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                          }}
                        >
                          Hai effettuato l’accesso
                        </span>
                        <span
                          suppressHydrationWarning
                          style={{
                            fontSize: "14px",
                            color: "#34D399",
                            fontWeight: 700,
                          }}
                        >
                          {user?.name || "Profilo"}
                        </span>
                      </div>

                      <div
                        style={{
                          borderTop: "1px solid rgba(61,48,40,0.9)",
                          paddingTop: "10px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        <Link
                          href="/auth"
                          onClick={() => {
                            signOut();
                            setAccountOpen(false);
                          }}
                          style={{
                            textDecoration: "none",
                            fontSize: "13px",
                            fontWeight: 700,
                            color: "#D4A843",
                            padding: "10px 12px",
                            borderRadius: "10px",
                            border: "1px solid rgba(212,168,67,0.35)",
                            background: "rgba(212,168,67,0.08)",
                          }}
                        >
                          Crea un nuovo account
                        </Link>

                        <button
                          onClick={() => {
                            signOut();
                            setAccountOpen(false);
                          }}
                          style={{
                            fontSize: "13px",
                            fontWeight: 700,
                            color: "#FCA5A5",
                            padding: "10px 12px",
                            borderRadius: "10px",
                            border: "1px solid rgba(248,113,113,0.32)",
                            background: "#2A1212",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          Esci
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <Link
                        href="/auth"
                        onClick={() => setAccountOpen(false)}
                        style={{
                          textDecoration: "none",
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "#F5EDD8",
                          padding: "10px 12px",
                          borderRadius: "10px",
                          border: "1px solid rgba(61,48,40,0.9)",
                          background: "rgba(26,22,18,0.96)",
                        }}
                      >
                        Accedi
                      </Link>
                      <Link
                        href="/auth"
                        onClick={() => setAccountOpen(false)}
                        style={{
                          textDecoration: "none",
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "#D4A843",
                          padding: "10px 12px",
                          borderRadius: "10px",
                          border: "1px solid rgba(212,168,67,0.35)",
                          background: "rgba(212,168,67,0.08)",
                        }}
                      >
                        Crea account
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cart */}
            <button
              onClick={toggleCart}
              style={{
                position: "relative",
                background: "transparent",
                border: "1px solid #3D3028",
                borderRadius: "8px",
                padding: "8px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#F5EDD8",
                transition: "border-color 0.2s",
              }}
            >
              <ShoppingBag size={18} />
              <span
                suppressHydrationWarning
                style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-6px",
                  background: "#E8541A",
                  color: "white",
                  borderRadius: "50%",
                  width: "18px",
                  height: "18px",
                  fontSize: "11px",
                  fontWeight: 700,
                  display: count > 0 ? "flex" : "none",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {count}
              </span>
            </button>

            {/* Admin link */}
            <Link
              href="/admin"
              className="admin-link"
              style={{
                textDecoration: "none",
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#D4A843",
                padding: "8px 12px",
                border: "1px solid rgba(212,168,67,0.3)",
                borderRadius: "999px",
                whiteSpace: "nowrap",
              }}
            >
              Amministrazione
            </Link>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{
                background: "transparent",
                border: "none",
                color: "#F5EDD8",
                cursor: "pointer",
                display: "none",
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(61,48,40,0.35)",
              }}
              className="mobile-menu-btn"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            className="slide-in"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(5,4,3,0.98)",
              backdropFilter: "blur(10px)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1101,
            }}
          >
            <button
              aria-label="Chiudi il menu"
              onClick={() => setMobileOpen(false)}
              style={{
                position: "absolute",
                inset: 0,
                border: "none",
                background: "transparent",
                cursor: "default",
              }}
            />
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "#050403",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                position: "relative",
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  paddingBottom: "12px",
                  borderBottom: "1px solid rgba(61,48,40,0.8)",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <Flame size={20} color="#E8541A" />
                  <span
                    className="font-display"
                    style={{
                      color: "#F5EDD8",
                      fontSize: "18px",
                      fontWeight: 700,
                    }}
                  >
                    I ragazzi del sole
                  </span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "12px",
                    border: "1px solid rgba(61,48,40,0.95)",
                    background: "rgba(18,14,12,0.98)",
                    color: "#F5EDD8",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: "min(720px, 92%)",
                    background: "#0F0B09",
                    padding: "18px",
                    borderRadius: "16px",
                    boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    alignItems: "stretch",
                  }}
                >
                  {NAV_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      style={{
                        textDecoration: "none",
                        fontSize: "16px",
                        fontWeight: 700,
                        color: pathname === link.href ? "#F5EDD8" : "#CDBFB0",
                        padding: "16px 18px",
                        borderRadius: "12px",
                        border: "1px solid rgba(61,48,40,0.9)",
                        background:
                          pathname === link.href
                            ? "rgba(232,84,26,0.20)"
                            : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                      }}
                    >
                      <span>{link.label}</span>
                      <ChevronRight size={16} color="#8A7566" />
                    </Link>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "10px",
                  marginTop: "auto",
                  paddingTop: "8px",
                  borderTop: "1px solid rgba(61,48,40,0.8)",
                }}
              >
                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: "14px",
                    border: "1px solid rgba(212,168,67,0.25)",
                    background: "rgba(18,14,12,0.98)",
                    color: "#F5EDD8",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    {isAuthenticated && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#8A7566",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        Hai effettuato l’accesso
                      </span>
                    )}
                    <span
                      style={{ color: isAuthenticated ? "#34D399" : "#F5EDD8" }}
                    >
                      {isAuthenticated && user?.name ? user.name : "Profilo"}
                    </span>
                  </div>
                </div>

                {!isAuthenticated && (
                  <>
                    <Link
                      href="/auth"
                      onClick={() => setMobileOpen(false)}
                      style={{
                        textDecoration: "none",
                        padding: "14px 16px",
                        borderRadius: "14px",
                        border: "1px solid rgba(61,48,40,0.9)",
                        background: "rgba(26,22,18,0.98)",
                        color: "#F5EDD8",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Accedi</span>
                      <ChevronRight size={16} color="#8A7566" />
                    </Link>

                    <Link
                      href="/auth"
                      onClick={() => setMobileOpen(false)}
                      style={{
                        textDecoration: "none",
                        padding: "14px 16px",
                        borderRadius: "14px",
                        border: "1px solid rgba(212,168,67,0.28)",
                        background: "rgba(212,168,67,0.08)",
                        color: "#D4A843",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Crea un nuovo account</span>
                      <ChevronRight size={16} color="#D4A843" />
                    </Link>
                  </>
                )}

                {isAuthenticated && (
                  <button
                    onClick={() => {
                      signOut();
                      setMobileOpen(false);
                    }}
                    style={{
                      padding: "14px 16px",
                      borderRadius: "14px",
                      border: "1px solid rgba(248,113,113,0.32)",
                      background: "#2A1212",
                      color: "#FCA5A5",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                    }}
                  >
                    <span>Esci</span>
                    <LogOut size={16} />
                  </button>
                )}

                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    textDecoration: "none",
                    padding: "14px 16px",
                    borderRadius: "14px",
                    border: "1px solid rgba(212,168,67,0.28)",
                    background: "rgba(18,14,12,0.98)",
                    color: "#D4A843",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  <span>Amministrazione</span>
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      <style>{`
        .logo-text { font-size: 20px; }

        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          .account-link, .admin-link { display: none !important; }
        }

        @media (max-width: 420px) {
          .logo-text { font-size: 16px; }
        }
      `}</style>
    </>
  );
}
