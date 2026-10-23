"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Calendar,
  TrendingUp,
  Users,
  Clock,
  ChefHat,
  CheckCircle,
  XCircle,
  Bell,
  Flame,
} from "lucide-react";
import { CATEGORIES, MENU_ITEMS } from "@/lib/data";
import { formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";
import { notificationMessage, type NotificationStatus } from "@/lib/orderNotifications";
import { useFeatureStore } from "@/store/featureStore";

type AdminTab = "overview" | "orders" | "reservations" | "menu";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out-for-delivery"
  | "delivered"
  | "cancelled";

type AdminOrder = {
  id: string;
  publicCode: string;
  paymentStatus: string;
  customer: string;
  items: string;
  total: number;
  type: string;
  status: OrderStatus;
  time: string;
  phone: string;
  whatsappStatus: NotificationStatus | null;
};

const RESERVATIONS = [
  {
    id: "RES-AA1B",
    name: "Chinedu Okeke",
    date: "2024-12-28",
    time: "19:00",
    guests: 4,
    status: "confirmed",
    requests: "Cena per anniversario, con petali di rosa",
  },
  {
    id: "RES-BB2C",
    name: "Fatima Abubakar",
    date: "2024-12-28",
    time: "20:00",
    guests: 6,
    status: "pending",
    requests: "Preferenza per piatti vegetariani",
  },
  {
    id: "RES-CC3D",
    name: "Oluwafemi Balogun",
    date: "2024-12-29",
    time: "13:00",
    guests: 2,
    status: "confirmed",
    requests: "",
  },
  {
    id: "RES-DD4E",
    name: "Amara Okafor",
    date: "2024-12-29",
    time: "18:30",
    guests: 10,
    status: "pending",
    requests: "Festa di compleanno, gradito servizio torta",
  },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  pending: { label: "In attesa", color: "#D4A843", bg: "rgba(212,168,67,0.12)" },
  confirmed: {
    label: "Confermato",
    color: "#60A5FA",
    bg: "rgba(96,165,250,0.12)",
  },
  preparing: {
    label: "In preparazione",
    color: "#E8541A",
    bg: "rgba(232,84,26,0.12)",
  },
  ready: { label: "Pronto", color: "#A78BFA", bg: "rgba(167,139,250,0.12)" },
  "out-for-delivery": {
    label: "In consegna",
    color: "#34D399",
    bg: "rgba(52,211,153,0.12)",
  },
  delivered: {
    label: "Consegnato",
    color: "#6EE7B7",
    bg: "rgba(110,231,183,0.12)",
  },
  cancelled: {
    label: "Annullato",
    color: "#F87171",
    bg: "rgba(248,113,113,0.12)",
  },
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  delivery: "Consegna a domicilio",
  pickup: "Ritiro",
  "dine-in": "Consumo al ristorante",
};

export default function AdminDashboard() {
  const whatsappEnabled = useFeatureStore((state) => state.whatsappOrderNotifications);
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [reservations, setReservations] = useState(RESERVATIONS);
  const [signingOut, setSigningOut] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [retryingNotification, setRetryingNotification] = useState<string | null>(null);

  const totalRevenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + o.total, 0);
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const todayReservations = reservations.length;
  const activeOrders = orders.filter(
    (o) => !["delivered", "cancelled"].includes(o.status),
  ).length;

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const response = await fetch("/api/admin/orders");
      if (response.status === 401) {
        router.replace("/admin/login");
        throw new Error("Sessione admin scaduta. Accedi nuovamente.");
      }
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Impossibile caricare gli ordini.");
      }
      setOrders(result.orders);
      toast.success("Ordini caricati da PostgreSQL.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impossibile caricare gli ordini.",
      );
    } finally {
      setLoadingOrders(false);
    }
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    try {
      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        },
      );
      if (response.status === 401) {
        router.replace("/admin/login");
        throw new Error("Sessione admin scaduta. Accedi nuovamente.");
      }
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Impossibile aggiornare lo stato dell’ordine.");
      }
      setOrders((current) =>
        current.map((order) =>
          order.id === id ? { ...order, status: result.status } : order,
        ),
      );
      toast.success("Stato dell’ordine aggiornato.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossibile aggiornare lo stato dell’ordine.",
      );
    }
  };

  const updateReservationStatus = (id: string, status: string) => {
    setReservations(
      reservations.map((r) => (r.id === id ? { ...r, status } : r)),
    );
  };

  const signOut = async () => {
    setSigningOut(true);
    try {
      const response = await fetch("/api/admin/session", { method: "DELETE" });
      if (!response.ok) throw new Error("Impossibile uscire dall'area amministrativa.");
      router.replace("/admin/login");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Uscita non riuscita.");
    } finally {
      setSigningOut(false);
    }
  };

  const retryNotification = async (id: string) => {
    setRetryingNotification(id);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(id)}/notification`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Invio non riuscito.");
      setOrders((current) => current.map((order) =>
        order.id === id ? { ...order, whatsappStatus: result.status } : order,
      ));
      if (result.status === "accepted") toast.success(result.message);
      else toast.error(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invio non riuscito.");
    } finally {
      setRetryingNotification(null);
    }
  };

  const TABS = [
    { id: "overview", label: "Riepilogo", icon: <LayoutDashboard size={16} /> },
    {
      id: "orders",
      label: "Ordini",
      icon: <ShoppingBag size={16} />,
      badge: activeOrders,
    },
    {
      id: "reservations",
      label: "Prenotazioni",
      icon: <Calendar size={16} />,
      badge: reservations.filter((r) => r.status === "pending").length,
    },
    { id: "menu", label: "Piatti del menu", icon: <ChefHat size={16} /> },
  ] as const;

  return (
    <div
      className="admin-page-shell w-full max-w-full overflow-x-hidden"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Admin header */}
      <div
        style={{
          background: "#221C16",
          borderBottom: "1px solid #3D3028",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: "1300px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "rgba(212,168,67,0.15)",
                border: "1px solid rgba(212,168,67,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Flame size={20} color="#D4A843" />
            </div>
            <div>
              <h1
                className="font-display"
                style={{ fontSize: "22px", fontWeight: 700, color: "#F5EDD8" }}
              >
                Console amministrativa
              </h1>
              <p style={{ fontSize: "12px", color: "#8A7566" }}>
                I Ragazzi del Sole
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <Link href="/" style={{ color: "#D4A843" }}>Torna al sito</Link>
            <button
              type="button"
              className="btn-ember"
              onClick={signOut}
              disabled={signingOut}
            >
              {signingOut ? "Uscita..." : "Esci dall'amministrazione"}
            </button>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                color: "#25D366",
              }}
            >
              <span
                className="pulse-ember"
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#25D366",
                  display: "inline-block",
                }}
              />
              Ristorante aperto
            </div>
            <button
              style={{
                background: "transparent",
                border: "1px solid #3D3028",
                borderRadius: "8px",
                padding: "8px",
                cursor: "pointer",
                color: "#8A7566",
                display: "flex",
                position: "relative",
              }}
            >
              <Bell size={18} />
              {pendingOrders > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    background: "#E8541A",
                    color: "white",
                    borderRadius: "50%",
                    width: "16px",
                    height: "16px",
                    fontSize: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                  }}
                >
                  {pendingOrders}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: "1300px",
          margin: "0 auto",
          width: "100%",
          padding: "0 24px",
          flex: 1,
        }}
      >
        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            borderBottom: "1px solid #3D3028",
            marginBottom: "32px",
            overflowX: "auto",
            paddingTop: "8px",
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "12px 20px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                borderBottom:
                  tab === t.id ? "2px solid #E8541A" : "2px solid transparent",
                color: tab === t.id ? "#F5EDD8" : "#8A7566",
                fontSize: "14px",
                fontWeight: tab === t.id ? 600 : 400,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {t.icon} {t.label}
              {"badge" in t && t.badge > 0 && (
                <span
                  style={{
                    background: "#E8541A",
                    color: "white",
                    borderRadius: "10px",
                    padding: "1px 6px",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div
          className="card"
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "24px",
            padding: "16px",
          }}
        >
          <p style={{ flex: "1 1 280px", color: "#8A7566" }}>
            Sessione staff attiva. Carica gli ordini per consultare i dati aggiornati.
          </p>
          <Link href="/admin/cash" className="btn-ember">Apri cassa e ritiro</Link>
          <button
            onClick={loadOrders}
            disabled={loadingOrders}
            className="btn-ember"
            style={{
              padding: "12px 20px",
              borderRadius: "8px",
              opacity: loadingOrders ? 0.7 : 1,
            }}
          >
            {loadingOrders ? "Caricamento..." : "Carica ordini dal database"}
          </button>
        </div>

        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <div className="page-enter">
            {/* Stats grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
                marginBottom: "32px",
              }}
            >
              {[
                {
                  label: "Incasso di oggi",
                  value: formatPrice(totalRevenue),
                  icon: <TrendingUp size={20} />,
                  color: "#D4A843",
                  sub: "Dagli ordini consegnati",
                },
                {
                  label: "Ordini attivi",
                  value: activeOrders,
                  icon: <ShoppingBag size={20} />,
                  color: "#E8541A",
                  sub: `${pendingOrders} in attesa di un’azione`,
                },
                {
                  label: "Prenotazioni di oggi",
                  value: todayReservations,
                  icon: <Calendar size={20} />,
                  color: "#60A5FA",
                  sub: `${reservations.filter((r) => r.status === "pending").length} in attesa di conferma`,
                },
                {
                  label: "Clienti totali",
                  value: orders.length,
                  icon: <Users size={20} />,
                  color: "#34D399",
                  sub: "Ordini distinti di oggi",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    background: "#221C16",
                    border: "1px solid #3D3028",
                    borderRadius: "12px",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "12px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#8A7566",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      {stat.label}
                    </p>
                    <div style={{ color: stat.color }}>{stat.icon}</div>
                  </div>
                  <p
                    className="font-display"
                    style={{
                      fontSize: "28px",
                      fontWeight: 900,
                      color: "#F5EDD8",
                      marginBottom: "4px",
                    }}
                  >
                    {stat.value}
                  </p>
                  <p style={{ fontSize: "11px", color: "#8A7566" }}>
                    {stat.sub}
                  </p>
                </div>
              ))}
            </div>

            {/* Recent Orders + Popular Items */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 320px",
                gap: "24px",
              }}
            >
              <div
                style={{
                  background: "#221C16",
                  border: "1px solid #3D3028",
                  borderRadius: "14px",
                  padding: "24px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "20px",
                  }}
                >
                  <h3
                    className="font-display"
                    style={{
                      fontSize: "20px",
                      fontWeight: 700,
                      color: "#F5EDD8",
                    }}
                  >
                    Ordini recenti
                  </h3>
                  <button
                    onClick={() => setTab("orders")}
                    style={{
                      fontSize: "12px",
                      color: "#E8541A",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Vedi tutti
                  </button>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {orders.slice(0, 5).map((order) => {
                    const cfg =
                      STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                    return (
                      <div
                        key={order.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px",
                          background: "#2A221C",
                          borderRadius: "10px",
                          flexWrap: "wrap",
                          gap: "8px",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              fontWeight: 600,
                              fontSize: "14px",
                              color: "#F5EDD8",
                              marginBottom: "2px",
                            }}
                          >
                            {order.publicCode} · {order.customer}
                          </p>
                          <p
                            style={{
                              fontSize: "12px",
                              color: "#8A7566",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {order.items}
                          </p>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              fontSize: "14px",
                              fontWeight: 700,
                              color: "#F5EDD8",
                            }}
                          >
                            {formatPrice(order.total)}
                          </span>
                          <span
                            className="badge"
                            style={{ background: cfg.bg, color: cfg.color }}
                          >
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Popular Items */}
              <div
                style={{
                  background: "#221C16",
                  border: "1px solid #3D3028",
                  borderRadius: "14px",
                  padding: "24px",
                }}
              >
                <h3
                  className="font-display"
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "#F5EDD8",
                    marginBottom: "20px",
                  }}
                >
                  Più popolari oggi
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {[
                    { name: "Riso jollof alla brace", count: 24, pct: 90 },
                    { name: "Spiedini di suya", count: 19, pct: 72 },
                    { name: "Bistecca T-bone", count: 14, pct: 52 },
                    { name: "Lumache piccanti", count: 11, pct: 42 },
                    { name: "Chapman", count: 31, pct: 100 },
                  ].map((item) => (
                    <div key={item.name}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "4px",
                        }}
                      >
                        <span style={{ fontSize: "13px", color: "#F5EDD8" }}>
                          {item.name}
                        </span>
                        <span style={{ fontSize: "12px", color: "#8A7566" }}>
                          {item.count} ordini
                        </span>
                      </div>
                      <div
                        style={{
                          height: "4px",
                          background: "#3D3028",
                          borderRadius: "2px",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${item.pct}%`,
                            background: "#E8541A",
                            borderRadius: "2px",
                            transition: "width 1s ease",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {tab === "orders" && (
          <div className="page-enter">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <h2
                className="font-display"
                style={{ fontSize: "28px", fontWeight: 700, color: "#F5EDD8" }}
              >
                Tutti gli ordini
              </h2>
              <div style={{ display: "flex", gap: "8px" }}>
                {[
                  ["all", "Tutti"],
                  ["pending", "In attesa"],
                  ["preparing", "In preparazione"],
                  ["delivered", "Consegnati"],
                ].map(([f, label]) => (
                  <button
                    key={f}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "1px solid #3D3028",
                      background: "transparent",
                      color: "#8A7566",
                      textTransform: "capitalize",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {orders.length === 0 && (
                <p style={{ color: "#8A7566" }}>
                  Nessun ordine visualizzato. Usa il pulsante Carica ordini dal
                  database per aggiornare l&apos;elenco.
                </p>
              )}
              {orders.map((order) => {
                const cfg =
                  STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                return (
                  <div
                    key={order.id}
                    style={{
                      background: "#221C16",
                      border: "1px solid #3D3028",
                      borderRadius: "12px",
                      padding: "20px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: "12px",
                        marginBottom: "12px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "4px",
                          }}
                        >
                          <span
                            className="font-display"
                            style={{
                              fontSize: "16px",
                              fontWeight: 700,
                              color: "#D4A843",
                            }}
                          >
                            {order.publicCode}
                          </span>
                          <span
                            className="badge"
                            style={{ background: cfg.bg, color: cfg.color }}
                          >
                            {cfg.label}
                          </span>
                          <span
                            className="badge"
                            style={{ background: "#3D3028", color: "#8A7566" }}
                          >
                            {ORDER_TYPE_LABELS[order.type] ?? order.type}
                          </span>
                        </div>
                        <p
                          style={{
                            fontWeight: 600,
                            fontSize: "15px",
                            color: "#F5EDD8",
                            marginBottom: "4px",
                          }}
                        >
                          {order.customer}
                        </p>
                        <p style={{ fontSize: "13px", color: "#8A7566" }}>
                          {order.items}
                        </p>
                        <p
                          style={{
                            fontSize: "12px",
                            color: "#3D3028",
                            marginTop: "4px",
                          }}
                        >
                          {new Date(order.time).toLocaleString("it-IT")}
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p
                          className="font-display"
                          style={{
                            fontSize: "20px",
                            fontWeight: 700,
                            color: "#E8541A",
                            marginBottom: "8px",
                          }}
                        >
                          {formatPrice(order.total)}
                        </p>
                        <p style={{ color: "#D4A843", marginBottom: "8px" }}>
                          {order.paymentStatus === "paid" ? "Pagato" : "Non pagato"}
                        </p>
                        <Link href={`/admin/cash/${order.id}`} className="btn-ghost" style={{ marginBottom: "8px" }}>Pagamento / ritiro</Link>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            flexWrap: "wrap",
                            justifyContent: "flex-end",
                          }}
                        >
                          {order.status === "pending" && (
                            <button
                              onClick={() =>
                                updateOrderStatus(order.id, "confirmed")
                              }
                              style={{
                                padding: "6px 14px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: 600,
                                background: "#60A5FA",
                                color: "white",
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              Conferma
                            </button>
                          )}
                          {order.status === "confirmed" && (
                            <button
                              onClick={() =>
                                updateOrderStatus(order.id, "preparing")
                              }
                              style={{
                                padding: "6px 14px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: 600,
                                background: "#E8541A",
                                color: "white",
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              Avvia preparazione
                            </button>
                          )}
                          {order.status === "preparing" && (
                            <button
                              onClick={() =>
                                updateOrderStatus(order.id, "ready")
                              }
                              style={{
                                padding: "6px 14px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: 600,
                                background: "#A78BFA",
                                color: "white",
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              Segna come pronto
                            </button>
                          )}
                          {order.status === "ready" && order.type === "Delivery" && (
                            <button
                              onClick={() =>
                                updateOrderStatus(order.id, "out-for-delivery")
                              }
                              style={{
                                padding: "6px 14px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: 600,
                                background: "#34D399",
                                color: "#1A1612",
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              Affidato al corriere
                            </button>
                          )}
                          {!["delivered", "cancelled"].includes(
                            order.status,
                          ) && order.paymentStatus !== "paid" && (
                            <button
                              onClick={() =>
                                updateOrderStatus(order.id, "cancelled")
                              }
                              style={{
                                padding: "6px 14px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: 600,
                                background: "transparent",
                                color: "#F87171",
                                border: "1px solid rgba(248,113,113,0.3)",
                                cursor: "pointer",
                              }}
                            >
                              Annulla
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {whatsappEnabled && <p style={{ color: "#8A7566", fontSize: "12px", margin: "12px 0" }}>
                      {notificationMessage(order.whatsappStatus)}
                    </p>}
                    {whatsappEnabled && ["pending", "failed", "not_configured"].includes(order.whatsappStatus ?? "") && (
                      <button
                        className="btn-ghost"
                        disabled={retryingNotification !== null}
                        onClick={() => retryNotification(order.id)}
                        style={{ marginBottom: "12px" }}
                      >
                        {retryingNotification === order.id ? "Invio..." : "Riprova riepilogo WhatsApp"}
                      </button>
                    )}
                    <div
                      style={{
                        borderTop: "1px solid #3D3028",
                        paddingTop: "10px",
                        display: "flex",
                        gap: "16px",
                      }}
                    >
                      <a
                        href={`tel:${order.phone}`}
                        style={{
                          textDecoration: "none",
                          fontSize: "12px",
                          color: "#8A7566",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        📞 {order.phone}
                      </a>
                      <a
                        href={`https://wa.me/${order.phone.replace(/[\s\+]/g, "")}?text=${encodeURIComponent(`Ciao ${order.customer}! Lo stato del tuo ordine ${order.publicCode} è: ${STATUS_CONFIG[order.status]?.label}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          textDecoration: "none",
                          fontSize: "12px",
                          color: "#25D366",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        💬 Scrivi al cliente su WhatsApp
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* RESERVATIONS TAB */}
        {tab === "reservations" && (
          <div className="page-enter">
            <h2
              className="font-display"
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: "#F5EDD8",
                marginBottom: "24px",
              }}
            >
              Prenotazioni
            </h2>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {reservations.map((res) => (
                <div
                  key={res.id}
                  style={{
                    background: "#221C16",
                    border: "1px solid #3D3028",
                    borderRadius: "12px",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          marginBottom: "6px",
                        }}
                      >
                        <span
                          className="font-display"
                          style={{
                            fontSize: "15px",
                            fontWeight: 700,
                            color: "#D4A843",
                          }}
                        >
                          {res.id}
                        </span>
                        <span
                          className="badge"
                          style={{
                            background:
                              res.status === "confirmed"
                                ? "rgba(52,211,153,0.12)"
                                : "rgba(212,168,67,0.12)",
                            color:
                              res.status === "confirmed"
                                ? "#34D399"
                                : "#D4A843",
                          }}
                        >
                          {res.status === "confirmed" ? "Confermata" : "In attesa"}
                        </span>
                      </div>
                      <p
                        style={{
                          fontWeight: 700,
                          fontSize: "17px",
                          color: "#F5EDD8",
                          marginBottom: "6px",
                        }}
                      >
                        {res.name}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          gap: "20px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "13px",
                            color: "#8A7566",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Calendar size={13} /> {res.date}
                        </span>
                        <span
                          style={{
                            fontSize: "13px",
                            color: "#8A7566",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Clock size={13} /> {res.time}
                        </span>
                        <span
                          style={{
                            fontSize: "13px",
                            color: "#8A7566",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Users size={13} /> {res.guests} ospiti
                        </span>
                      </div>
                      {res.requests && (
                        <p
                          style={{
                            fontSize: "13px",
                            color: "#D4A843",
                            marginTop: "8px",
                            fontStyle: "italic",
                          }}
                        >
                          📝 {res.requests}
                        </p>
                      )}
                    </div>
                    <div
                      style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                    >
                      {res.status === "pending" && (
                        <button
                          onClick={() =>
                            updateReservationStatus(res.id, "confirmed")
                          }
                          style={{
                            padding: "8px 16px",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: 600,
                            background: "#34D399",
                            color: "#1A1612",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <CheckCircle size={14} /> Conferma
                        </button>
                      )}
                      {res.status !== "cancelled" && (
                        <button
                          onClick={() =>
                            updateReservationStatus(res.id, "cancelled")
                          }
                          style={{
                            padding: "8px 16px",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: 600,
                            background: "transparent",
                            color: "#F87171",
                            border: "1px solid rgba(248,113,113,0.3)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <XCircle size={14} /> Annulla
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MENU TAB */}
        {tab === "menu" && (
          <div className="page-enter">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <h2
                className="font-display"
                style={{ fontSize: "28px", fontWeight: 700, color: "#F5EDD8" }}
              >
                Piatti del menu
              </h2>
              <p style={{ fontSize: "13px", color: "#8A7566" }}>
                {MENU_ITEMS.length} piatti in totale ·{" "}
                {MENU_ITEMS.filter((i) => i.available).length} disponibili
              </p>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "12px",
              }}
            >
              {MENU_ITEMS.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "#221C16",
                    border: "1px solid #3D3028",
                    borderRadius: "10px",
                    padding: "14px",
                    display: "flex",
                    gap: "12px",
                    alignItems: "center",
                  }}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "8px",
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontWeight: 600,
                        fontSize: "14px",
                        color: "#F5EDD8",
                        marginBottom: "2px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.name}
                    </p>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#8A7566",
                        textTransform: "capitalize",
                      }}
                    >
                      {CATEGORIES.find((category) => category.id === item.category)?.label ?? item.category}
                    </p>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#E8541A",
                      }}
                    >
                      {formatPrice(item.price)}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      className="badge"
                      style={{
                        background: item.available
                          ? "rgba(52,211,153,0.1)"
                          : "rgba(248,113,113,0.1)",
                        color: item.available ? "#34D399" : "#F87171",
                      }}
                    >
                      {item.available ? "Disponibile" : "Non disponibile"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ height: "48px" }} />
      </div>

      <style>{`
        @media (max-width: 1200px) {
          .admin-page-shell {
            width: 100% !important;
            overflow-x: hidden !important;
          }

          .admin-page-shell > div:first-of-type {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }

          .admin-page-shell > div:last-of-type {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }

          .admin-page-shell div[style*="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))"] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .admin-page-shell div[style*="grid-template-columns: 1fr 320px"] {
            grid-template-columns: 1fr !important;
          }

          .admin-page-shell div[style*="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))"] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 768px) {
          .admin-page-shell > div:first-of-type {
            padding: 16px 12px !important;
          }

          .admin-page-shell > div:last-of-type {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }

          .admin-page-shell > div:last-of-type > div:first-child {
            overflow-x: auto !important;
            padding-bottom: 8px !important;
          }

          .admin-page-shell > div:last-of-type > div:first-child button {
            padding: 10px 14px !important;
            font-size: 13px !important;
          }

          .admin-page-shell div[style*="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))"],
          .admin-page-shell div[style*="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))"],
          .admin-page-shell div[style*="grid-template-columns: 1fr 320px"] {
            grid-template-columns: 1fr !important;
          }

          .admin-page-shell div[style*="padding: 24px"] {
            padding: 20px !important;
          }
        }

        @media (max-width: 480px) {
          .admin-page-shell > div:first-of-type {
            padding: 14px 10px !important;
          }

          .admin-page-shell > div:last-of-type {
            padding-left: 10px !important;
            padding-right: 10px !important;
          }

          .admin-page-shell div[style*="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))"],
          .admin-page-shell div[style*="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))"],
          .admin-page-shell div[style*="grid-template-columns: 1fr 320px"] {
            grid-template-columns: 1fr !important;
          }

          .admin-page-shell div[style*="padding: 24px"] {
            padding: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
