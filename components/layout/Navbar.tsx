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
import toast from "react-hot-toast";
import { reservationsEnabled } from "@/lib/features";
import { normalizeItalianPhone } from "@/lib/phone";

export default function Navbar() {
  const pathname = usePathname();
  const { itemCount, toggleCart, hasHydrated: cartHydrated } = useCartStore();
  const {
    user,
    isAuthenticated,
    signOut,
  } = useAuthStore();
  const profileComplete = isAuthenticated && Boolean(
    user?.phone && normalizeItalianPhone(user.phone),
  );
  const count = itemCount();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDialogElement>(null);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/menu", label: "Menu" },
    ...(profileComplete ? [{ href: "/order", label: "Ordini" }] : []),
    ...(reservationsEnabled()
      ? [{ href: "/reservations", label: "Prenotazioni" }]
      : []),
    ...(profileComplete
      ? [{ href: "/tracking", label: "I miei ordini" }]
      : []),
  ];

  useEffect(() => {
    if (!mobileOpen) return;

    const dialog = mobileMenuRef.current;
    if (!dialog) return;

    // The native top layer escapes the navbar's backdrop-filter containing block.
    dialog.showModal();
    mobileCloseRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const desktop = window.matchMedia("(min-width: 769px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMobileOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);

    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [mobileOpen]);

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
    if (!cartHydrated) {
      useCartStore.persist.rehydrate();
    }
  }, [cartHydrated]);

  const handleSignOut = async () => {
    try {
      await signOut();
      setAccountOpen(false);
      setMobileOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossibile uscire.");
    }
  };

  return (
    <>
      <nav
        className="site-navbar"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          paddingTop: "env(safe-area-inset-top, 0px)",
          borderBottom: mobileOpen
            ? "1px solid rgba(61,48,40,0.8)"
            : "1px solid #3D3028",
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
            className="site-brand"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minWidth: 0,
            }}
          >
            <Flame size={22} color="#E8541A" />
            <span className="site-brand-copy">
              <span className="font-display logo-text">Sagra del Maiale</span>
              <span className="site-brand-organizer">I Ragazzi del Sole</span>
            </span>
          </Link>

          {/* Desktop Links */}
          <div style={{ display: "flex", gap: "28px" }} className="desktop-nav">
            {navLinks.map((link) => (
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
                type="button"
                aria-label={isAuthenticated ? "Apri il menu del profilo" : "Accedi"}
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                className="account-toggle"
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
                <span className="account-icon" style={{ position: "relative", display: "flex" }}>
                  <User size={16} />
                  {isAuthenticated && (
                    <span aria-label="Sessione attiva" style={{
                      position: "absolute",
                      width: "7px",
                      height: "7px",
                      right: "-4px",
                      bottom: "-2px",
                      borderRadius: "50%",
                      background: "#34D399",
                      border: "1px solid #1A1612",
                    }} />
                  )}
                </span>
                <span className="account-label" suppressHydrationWarning>
                  {isAuthenticated && user?.name
                    ? user.name.split(" ")[0]
                    : "Accedi"}
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
                        {user?.email && (
                          <span style={{ fontSize: "12px", color: "#8A7566", overflowWrap: "anywhere" }}>
                            {user.email}
                          </span>
                        )}
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
                        <button
                          onClick={() => {
                            void handleSignOut();
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
                        href="/auth?mode=signup"
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

            {/* Mobile menu toggle */}
            <button
              type="button"
              aria-label="Apri il menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              aria-haspopup="dialog"
              onClick={() => {
                setAccountOpen(false);
                setMobileOpen(!mobileOpen);
              }}
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
      </nav>

      <dialog
        ref={mobileMenuRef}
        id="mobile-navigation"
        className="mobile-navigation"
        aria-label="Menu principale"
        onCancel={() => setMobileOpen(false)}
      >
        <div className="mobile-navigation-header">
          <Link href="/" className="mobile-navigation-brand" onClick={() => setMobileOpen(false)}>
            <Flame size={22} color="#E8541A" aria-hidden="true" />
            <span className="site-brand-copy">
              <span className="font-display logo-text">Sagra del Maiale</span>
              <span className="site-brand-organizer">I Ragazzi del Sole</span>
            </span>
          </Link>
          <button
            ref={mobileCloseRef}
            type="button"
            className="mobile-navigation-close"
            aria-label="Chiudi il menu"
            onClick={() => setMobileOpen(false)}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <div className="mobile-navigation-body">
          <nav aria-label="Navigazione mobile" className="mobile-navigation-links">
            <p className="section-label">Esplora la sagra</p>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="mobile-navigation-link"
                aria-current={pathname === link.href ? "page" : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <span className="font-display">
                  {link.label}
                </span>
                <ChevronRight size={20} aria-hidden="true" />
              </Link>
            ))}
          </nav>

          <div className="mobile-navigation-account">
            <div className="mobile-navigation-profile">
              <User size={20} aria-hidden="true" />
              <div>
                <p className="mobile-navigation-caption">
                  {isAuthenticated ? "Hai effettuato l’accesso" : "Il tuo spazio"}
                </p>
                <p className="mobile-navigation-name">
                  {isAuthenticated && user?.name ? user.name : "Profilo"}
                </p>
              </div>
            </div>
            {isAuthenticated ? (
              <button
                type="button"
                className="mobile-navigation-action mobile-navigation-signout"
                onClick={() => { void handleSignOut(); }}
              >
                <span>Esci</span>
                <LogOut size={18} aria-hidden="true" />
              </button>
            ) : (
              <div className="mobile-navigation-actions">
                <Link href="/auth" className="mobile-navigation-action mobile-navigation-login" onClick={() => setMobileOpen(false)}>
                  Accedi <ChevronRight size={18} aria-hidden="true" />
                </Link>
                <Link href="/auth?mode=signup" className="mobile-navigation-register" onClick={() => setMobileOpen(false)}>
                  Crea un nuovo account <ChevronRight size={16} aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </dialog>

      <style>{`
        .logo-text { font-size: 19px; line-height: 1; }
        .site-brand-copy {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 3px;
          overflow: hidden;
        }
        .site-brand-organizer {
          color: #D4A843;
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.06em;
          line-height: 1.15;
          white-space: nowrap;
        }
        .site-navbar {
          background: rgba(26,22,18,0.92);
          backdrop-filter: blur(20px);
        }

        .mobile-navigation {
          position: fixed;
          inset: 0;
          margin: 0;
          width: 100%;
          max-width: none;
          height: 100dvh;
          max-height: none;
          padding: 0;
          border: 0;
          color: var(--cream);
          background: radial-gradient(ellipse at 100% 0%, #352218 0%, var(--ash) 55%);
          overflow: hidden;
        }
        .mobile-navigation[open] {
          display: flex;
          flex-direction: column;
          animation: mobileMenuReveal 0.22s ease-out;
        }
        .mobile-navigation::backdrop { background: var(--ash); }
        .mobile-navigation-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: calc(12px + env(safe-area-inset-top)) 20px 12px;
          border-bottom: 1px solid var(--ash-light);
          flex-shrink: 0;
        }
        .mobile-navigation-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          color: var(--cream);
          text-decoration: none;
          font-weight: 700;
          letter-spacing: 0.01em;
        }
        .mobile-navigation-brand svg { flex-shrink: 0; }
        .mobile-navigation-close {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          border: 1px solid var(--ash-light);
          border-radius: 50%;
          background: var(--surface);
          color: var(--cream);
          cursor: pointer;
        }
        .mobile-navigation-body {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
          padding: clamp(24px, 5vh, 48px) 24px calc(24px + env(safe-area-inset-bottom));
          gap: 32px;
        }
        .mobile-navigation-links, .mobile-navigation-account {
          width: 100%;
          max-width: 520px;
          margin-inline: auto;
        }
        .mobile-navigation-links .section-label { margin-bottom: 16px; }
        .mobile-navigation-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          min-height: 62px;
          padding: 14px 4px;
          border-bottom: 1px solid var(--ash-light);
          color: var(--cream);
          text-decoration: none;
          font-size: clamp(24px, 5vw, 30px);
          font-weight: 700;
          transition: color 0.2s, padding 0.2s;
        }
        .mobile-navigation-link svg { color: var(--muted); flex-shrink: 0; }
        .mobile-navigation-link[aria-current="page"],
        .mobile-navigation-link[aria-current="page"] svg { color: var(--ember-light); }
        .mobile-navigation-link[aria-current="page"] { border-bottom-color: var(--ember); }
        .mobile-navigation-link:hover { color: var(--ember-light); padding-inline: 10px; }
        .mobile-navigation-account {
          margin-top: auto;
          padding: 20px;
          border: 1px solid var(--ash-light);
          border-radius: 20px;
          background: var(--surface);
        }
        .mobile-navigation-profile { display: flex; align-items: center; gap: 12px; }
        .mobile-navigation-profile > svg { color: var(--gold); flex-shrink: 0; }
        .mobile-navigation-caption { color: var(--cream-dark); font-size: 12px; margin-bottom: 4px; }
        .mobile-navigation-name { font-size: 16px; font-weight: 600; overflow-wrap: anywhere; }
        .mobile-navigation-actions { display: grid; gap: 16px; margin-top: 18px; }
        .mobile-navigation-action {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          min-height: 48px;
          padding: 12px 16px;
          border: 1px solid transparent;
          border-radius: 12px;
          font: inherit;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
        }
        .mobile-navigation-login { background: var(--ember); color: var(--white); }
        .mobile-navigation-login:hover { background: var(--ember-dark); }
        .mobile-navigation-register {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 44px;
          color: var(--gold-light);
          text-decoration: none;
          font-size: 13px;
        }
        .mobile-navigation-signout {
          margin-top: 18px;
          background: #2A1212;
          border-color: rgba(248,113,113,0.32);
          color: #FCA5A5;
        }
        .mobile-navigation :is(a, button):focus-visible {
          outline: 2px solid var(--gold-light);
          outline-offset: 4px;
        }
        @keyframes mobileMenuReveal {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .mobile-navigation[open] { animation: none; }
          .mobile-navigation-link { transition: none; }
        }

        @media (max-width: 768px) {
          .site-brand-organizer { font-size: 12px; letter-spacing: 0.04em; }
          .logo-text { font-size: 17px; }
          .site-navbar > div > div:last-child { gap: 8px !important; }
          .site-brand-copy > .logo-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .site-navbar { background: var(--ash); backdrop-filter: none; }
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          .account-toggle {
            width: 40px;
            height: 40px;
            padding: 8px !important;
            justify-content: center;
          }
          .account-label { display: none; }
        }

        @media (max-width: 420px) {
          .logo-text { font-size: 15px; }
        }
      `}</style>
    </>
  );
}
