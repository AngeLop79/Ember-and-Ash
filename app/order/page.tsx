"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import {
  formatPrice,
  buildWhatsAppOrderMessage,
  getWhatsAppUrl,
  calculateDeliveryFee,
} from "@/lib/utils";
import { RESTAURANT_INFO } from "@/lib/data";
import { CustomerInfo } from "@/types";
import {
  ShoppingBag,
  Truck,
  MapPin,
  CreditCard,
  Banknote,
  MessageCircle,
  CheckCircle,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useFeatureStore } from "@/store/featureStore";
import { italianPhoneDigits, normalizeItalianPhone } from "@/lib/phone";

type Step = "cart" | "details" | "payment" | "confirm";
type OrderType = "delivery" | "pickup" | "dine-in";
type PaymentMethod = "card" | "cash" | "transfer";

export default function OrderPage() {
  const whatsappEnabled = useFeatureStore((state) => state.whatsappOrderNotifications);
  const router = useRouter();
  const { items, updateQuantity, removeItem, subtotal, clearCart } =
    useCartStore();
  const { user, isAuthenticated, hasHydrated, refreshSession } = useAuthStore();
  const [step, setStep] = useState<Step>("cart");
  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: "",
    phone: "",
    email: "",
    address: "",
  });
  const [orderId, setOrderId] = useState("");
  const [publicCode, setPublicCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [whatsappConsent, setWhatsappConsent] = useState<boolean | null>(null);
  const [notificationMessage, setNotificationMessage] = useState("");
  const requestRef = useRef<{ body: string; key: string } | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
    cardholderName: "",
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (hasHydrated && (!isAuthenticated || !user?.phone || !normalizeItalianPhone(user.phone))) {
      router.replace("/auth?next=/order");
    }
  }, [hasHydrated, isAuthenticated, router, user?.phone]);

  const sub = subtotal();
  const deliveryFee = orderType === "delivery" ? calculateDeliveryFee(sub) : 0;
  const total = sub + deliveryFee;

  const currentLagosHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Lagos",
      hour: "2-digit",
      hour12: false,
    }).format(now),
  );
  const lagosDay = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Lagos",
    weekday: "short",
  }).format(now);
  const isWeekend = lagosDay === "Sat" || lagosDay === "Sun";
  const closingHour = isWeekend
    ? RESTAURANT_INFO.closingHour.weekend
    : RESTAURANT_INFO.closingHour.weekday;
  const isRestaurantClosed = currentLagosHour >= closingHour;

  const guardWhatsAppAccess = () => {
    if (isAuthenticated) return true;
    toast.error("Accedi o crea un account prima di usare WhatsApp");
    router.push("/auth?next=/order");
    return false;
  };

  const handlePlaceOrder = async () => {
    if (loading) return;
    const phone = normalizeItalianPhone(customer.phone);
    if (!phone) {
      toast.error("Inserisci un numero di telefono italiano valido con prefisso +39.");
      return;
    }
    if (isRestaurantClosed) {
      toast.error("Per oggi siamo chiusi. Riprova domani.");
      return;
    }

    // Validate payment details based on method
    if (paymentMethod === "card") {
      if (!paymentDetails.cardholderName.trim()) {
        toast.error("Inserisci il nome del titolare della carta");
        return;
      }
      if (
        !paymentDetails.cardNumber.trim() ||
        paymentDetails.cardNumber.length < 13
      ) {
        toast.error("Inserisci un numero di carta valido");
        return;
      }
      if (!paymentDetails.expiry.trim() || paymentDetails.expiry.length < 5) {
        toast.error("Inserisci la data di scadenza (MM/AA)");
        return;
      }
      if (!paymentDetails.cvv.trim() || paymentDetails.cvv.length < 3) {
        toast.error("Inserisci un CVV valido");
        return;
      }
    }

    setLoading(true);
    try {
      const body = JSON.stringify({
        items: items.map(({ id, quantity, notes }) => ({ id, quantity, notes })),
        customer: { ...customer, phone },
        type: orderType,
        paymentMethod,
        whatsappConsent: whatsappEnabled && whatsappConsent !== false,
      });
      if (requestRef.current?.body !== body) {
        requestRef.current = { body, key: crypto.randomUUID() };
      }
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": requestRef.current.key,
        },
        body,
      });
      const responseText = await response.text();
      let result: unknown;
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Il server ha restituito una risposta non valida (HTTP ${response.status}). Verifica il deploy dell’API /api/orders.`,
        );
      }

      if (typeof result !== "object" || result === null) {
        throw new Error("Il server ha restituito una risposta non valida.");
      }

      if (!response.ok) {
        if (response.status === 401) {
          await useAuthStore.getState().refreshSession();
          router.push("/auth?next=/order");
        }
        const message =
          "error" in result && typeof result.error === "string"
            ? result.error
            : "Non è stato possibile salvare l’ordine.";
        throw new Error(message);
      }

      if (!("id" in result) || typeof result.id !== "string" ||
          !("publicCode" in result) || typeof result.publicCode !== "string") {
        throw new Error("Il server non ha restituito il codice dell’ordine.");
      }

      setOrderId(result.id);
      setPublicCode(result.publicCode);
      setNotificationMessage(
        "notification" in result && typeof result.notification === "string"
          ? result.notification
          : "",
      );
      setStep("confirm");
      clearCart();
      toast.success("Ordine salvato correttamente! 🔥");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Non è stato possibile salvare l’ordine. Riprova.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
    if (!guardWhatsAppAccess()) return;
    const msg = buildWhatsAppOrderMessage(
      items,
      total,
      orderType,
      customer.name,
      customer.address,
    );
    window.open(getWhatsAppUrl(msg), "_blank");
  };

  if (!hasHydrated || !isAuthenticated || !user?.phone || !normalizeItalianPhone(user.phone)) {
    return (
      <div style={{ padding: "100px 24px" }}>
        <p>Verifica dell’accesso in corso...</p>
        {!hasHydrated && (
          <button
            className="btn-ghost"
            onClick={() => {
              void refreshSession().catch((error: unknown) => {
                toast.error(error instanceof Error ? error.message : "Sessione non disponibile.");
              });
            }}
          >
            Riprova
          </button>
        )}
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div
        style={{
          paddingTop: "64px",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 24px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "480px" }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "rgba(232,84,26,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}
          >
            <CheckCircle size={40} color="#E8541A" />
          </div>
          <h1
            className="font-display"
            style={{
              fontSize: "36px",
              fontWeight: 800,
              color: "#F5EDD8",
              marginBottom: "12px",
            }}
          >
            Ordine ricevuto!
          </h1>
          <p style={{ color: "#D4A843", marginBottom: "16px" }} role="status">
            In attesa di conferma del ristorante. {whatsappEnabled && notificationMessage}
          </p>
          <p
            style={{ color: "#8A7566", marginBottom: "8px", fontSize: "15px" }}
          >
            Il tuo ordine{" "}
            <span style={{ color: "#E8541A", fontWeight: 700, fontSize: "40px", display: "block", margin: "12px 0" }}>
              {publicCode}
            </span>{" "}
            è stato ricevuto.
          </p>
          <p
            style={{
              color: "#8A7566",
              marginBottom: "32px",
              fontSize: "14px",
              lineHeight: "1.6",
            }}
          >
            Mostra questo numero in cassa. Pagamento e ritiro vengono registrati
            separatamente dallo staff. Nessun addebito online e&apos; stato eseguito.
          </p>
          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link href={`/orders/${orderId}`} style={{ textDecoration: "none" }}>
              <button
                className="btn-ember"
                style={{
                  padding: "12px 28px",
                  borderRadius: "10px",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Truck size={16} /> Visualizza ordine
              </button>
            </Link>
            <Link href="/menu" style={{ textDecoration: "none" }}>
              <button
                className="btn-ghost"
                style={{
                  padding: "12px 28px",
                  borderRadius: "10px",
                  fontSize: "14px",
                }}
              >
                Torna al menu
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="page-shell"
      style={{ paddingTop: "64px", minHeight: "100vh" }}
    >
      <div
        className="section-shell"
        style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 24px" }}
      >
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <p className="section-label" style={{ marginBottom: "8px" }}>
            Completa l’ordine
          </p>
          <h1
            className="font-display order-title"
            style={{ fontSize: "40px", fontWeight: 800, color: "#F5EDD8" }}
          >
            Il tuo ordine
          </h1>
        </div>

        {/* Steps */}
        <div
          className="mobile-stack mobile-small-gap order-steps"
          style={{ display: "flex", gap: "0", marginBottom: "40px" }}
        >
          {(["cart", "details", "payment"] as Step[]).map((s, i) => {
            const labels: Record<Step, string> = {
              cart: "Carrello",
              details: "Dati",
              payment: "Pagamento",
              confirm: "Conferma",
            };
            const stepIndex = ["cart", "details", "payment"].indexOf(step);
            const thisIndex = i;
            const done = thisIndex < stepIndex;
            const active = s === step;
            return (
              <div
                key={s}
                style={{
                  display: "flex",
                  alignItems: "center",
                  flex: i < 2 ? "1" : "auto",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: active
                        ? "#E8541A"
                        : done
                          ? "#E8541A"
                          : "#3D3028",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "white",
                      flexShrink: 0,
                    }}
                  >
                    {done ? "✓" : i + 1}
                  </div>
                  <span
                    className="order-step-label"
                    style={{
                      fontSize: "13px",
                      fontWeight: active ? 600 : 400,
                      color: active ? "#F5EDD8" : "#8A7566",
                    }}
                  >
                    {labels[s]}
                  </span>
                </div>
                {i < 2 && (
                  <div
                    style={{
                      flex: 1,
                      height: "1px",
                      background: done ? "#E8541A" : "#3D3028",
                      margin: "0 12px",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 320px",
            gap: "24px",
          }}
          className="order-grid mobile-grid-1"
        >
          {/* Main content */}
          <div>
            {step === "cart" && (
              <div>
                {items.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "60px",
                      color: "#8A7566",
                    }}
                  >
                    <ShoppingBag
                      size={48}
                      style={{
                        margin: "0 auto 16px",
                        opacity: 0.3,
                        display: "block",
                      }}
                    />
                    <p
                      className="font-display"
                      style={{ fontSize: "22px", marginBottom: "8px" }}
                    >
                      Il carrello è vuoto
                    </p>
                    <Link href="/menu" style={{ textDecoration: "none" }}>
                      <button
                        className="btn-ember"
                        style={{
                          marginTop: "16px",
                          padding: "12px 24px",
                          borderRadius: "8px",
                          fontSize: "14px",
                        }}
                      >
                        Sfoglia il menu
                      </button>
                    </Link>
                  </div>
                ) : (
                  <div>
                    {/* Order type */}
                    <div
                      className="card"
                      style={{ padding: "20px", marginBottom: "20px" }}
                    >
                      <p
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#F5EDD8",
                          marginBottom: "12px",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        Tipo di ordine
                      </p>
                      <div
                        className="order-type-options"
                        style={{
                          display: "flex",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        {(
                          [
                            {
                              val: "delivery",
                              label: "Consegna a domicilio",
                              icon: <Truck size={16} />,
                            },
                            {
                              val: "pickup",
                              label: "Ritiro",
                              icon: <MapPin size={16} />,
                            },
                            {
                              val: "dine-in",
                              label: "Consumo al ristorante",
                              icon: <ShoppingBag size={16} />,
                            },
                          ] as {
                            val: OrderType;
                            label: string;
                            icon: React.ReactNode;
                          }[]
                        ).map(({ val, label, icon }) => (
                          <button
                            key={val}
                            onClick={() => setOrderType(val)}
                            className="order-type-btn"
                            style={{
                              padding: "10px 20px",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontSize: "14px",
                              fontWeight: 600,
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              transition: "all 0.2s",
                              background:
                                orderType === val ? "#E8541A" : "transparent",
                              border:
                                orderType === val
                                  ? "none"
                                  : "1px solid #3D3028",
                              color: orderType === val ? "white" : "#8A7566",
                            }}
                          >
                            {icon} {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Items */}
                    <div
                      className="card"
                      style={{ padding: "20px", marginBottom: "20px" }}
                    >
                      <p
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#F5EDD8",
                          marginBottom: "16px",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        Articoli ({items.length})
                      </p>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "16px",
                        }}
                      >
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="cart-item-row"
                            style={{
                              display: "flex",
                              gap: "14px",
                              alignItems: "center",
                            }}
                          >
                            <img
                              src={item.image}
                              alt={item.name}
                              style={{
                                width: "64px",
                                height: "64px",
                                borderRadius: "8px",
                                objectFit: "cover",
                                flexShrink: 0,
                              }}
                            />
                            <div style={{ flex: 1 }}>
                              <p
                                style={{
                                  fontWeight: 600,
                                  fontSize: "14px",
                                  color: "#F5EDD8",
                                  marginBottom: "4px",
                                }}
                              >
                                {item.name}
                              </p>
                              <p
                                style={{
                                  fontSize: "13px",
                                  color: "#E8541A",
                                  fontWeight: 600,
                                }}
                              >
                                {formatPrice(item.price)}
                              </p>
                            </div>
                            <div
                              className="cart-item-controls"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                              }}
                            >
                              <button
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity - 1)
                                }
                                style={{
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "6px",
                                  background: "#3D3028",
                                  border: "none",
                                  color: "#F5EDD8",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Minus size={12} />
                              </button>
                              <span
                                style={{
                                  fontSize: "14px",
                                  fontWeight: 700,
                                  color: "#F5EDD8",
                                  minWidth: "20px",
                                  textAlign: "center",
                                }}
                              >
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity + 1)
                                }
                                style={{
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "6px",
                                  background: "#E8541A",
                                  border: "none",
                                  color: "white",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Plus size={12} />
                              </button>
                              <span
                                style={{
                                  fontSize: "14px",
                                  fontWeight: 700,
                                  color: "#F5EDD8",
                                  minWidth: "60px",
                                  textAlign: "right",
                                }}
                              >
                                {formatPrice(item.price * item.quantity)}
                              </span>
                              <button
                                onClick={() => removeItem(item.id)}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "#8A7566",
                                  cursor: "pointer",
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div
                      className="order-action-row"
                      style={{
                        display: "flex",
                        gap: "12px",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        onClick={handleWhatsApp}
                        style={{
                          padding: "12px 24px",
                          borderRadius: "10px",
                          fontSize: "14px",
                          fontWeight: 600,
                          cursor: "pointer",
                          background: "#25D366",
                          color: "white",
                          border: "none",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <MessageCircle size={16} /> Ordina su WhatsApp
                      </button>
                      <button
                        onClick={() => {
                          if (!isAuthenticated) {
                            toast.error("Accedi prima di completare l’ordine");
                            router.push("/auth?next=/order");
                            return;
                          }
                          if (user) {
                            setCustomer((prev) => ({
                              ...prev,
                              name: prev.name || user.name,
                              email: prev.email || user.email,
                              phone: prev.phone || user.phone || "",
                            }));
                          }
                          setStep("details");
                        }}
                        className="btn-ember"
                        style={{
                          padding: "12px 32px",
                          borderRadius: "10px",
                          fontSize: "14px",
                        }}
                      >
                        Continua →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === "details" && (
              <div className="card" style={{ padding: "28px" }}>
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#F5EDD8",
                    marginBottom: "20px",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  I tuoi dati
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  <div
                    className="details-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "16px",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: "12px",
                          color: "#8A7566",
                          display: "block",
                          marginBottom: "6px",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        Nome e cognome *
                      </label>
                      <input
                        className="input-field"
                        placeholder="Il tuo nome"
                        value={customer.name}
                        onChange={(e) =>
                          setCustomer({ ...customer, name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: "12px",
                          color: "#8A7566",
                          display: "block",
                          marginBottom: "6px",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        Telefono *
                      </label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <span
                          aria-hidden="true"
                          style={{
                            padding: "14px",
                            background: "#1A1612",
                            border: "1px solid #3D3028",
                            borderRadius: "10px",
                            color: "#F5EDD8",
                          }}
                        >
                          +39
                        </span>
                        <input
                          className="input-field"
                          placeholder="320 123 4567"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          required
                          value={italianPhoneDigits(customer.phone)}
                          onChange={(e) =>
                            setCustomer({
                              ...customer,
                              phone: `+39${italianPhoneDigits(e.target.value)}`,
                            })
                          }
                          style={{ flex: 1 }}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "12px",
                        color: "#8A7566",
                        display: "block",
                        marginBottom: "6px",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      Email
                    </label>
                    <input
                      className="input-field"
                      placeholder="tu@email.it"
                      type="email"
                      value={customer.email}
                      onChange={(e) =>
                        setCustomer({ ...customer, email: e.target.value })
                      }
                    />
                  </div>
                  {orderType === "delivery" && (
                    <div>
                      <label
                        style={{
                          fontSize: "12px",
                          color: "#8A7566",
                          display: "block",
                          marginBottom: "6px",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        Indirizzo di consegna *
                      </label>
                      <textarea
                        className="input-field"
                        placeholder="Indirizzo completo, incluso il comune"
                        rows={3}
                        value={customer.address}
                        onChange={(e) =>
                          setCustomer({ ...customer, address: e.target.value })
                        }
                        style={{ resize: "vertical" }}
                      />
                    </div>
                  )}
                </div>
                <div
                  className="order-action-row"
                  style={{ display: "flex", gap: "12px", marginTop: "24px" }}
                >
                  <button
                    onClick={() => setStep("cart")}
                    className="btn-ghost"
                    style={{
                      padding: "12px 24px",
                      borderRadius: "10px",
                      fontSize: "14px",
                    }}
                  >
                    ← Indietro
                  </button>
                  <button
                    onClick={() => {
                      if (!customer.name || !customer.phone) {
                        toast.error("Compila i campi obbligatori");
                        return;
                      }
                      if (orderType === "delivery" && !customer.address) {
                        toast.error("Inserisci l’indirizzo di consegna");
                        return;
                      }
                      setStep("payment");
                    }}
                    className="btn-ember"
                    style={{
                      padding: "12px 32px",
                      borderRadius: "10px",
                      fontSize: "14px",
                    }}
                  >
                    Continua →
                  </button>
                </div>
              </div>
            )}

            {step === "payment" && (
              <div className="card" style={{ padding: "28px" }}>
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#F5EDD8",
                    marginBottom: "20px",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Metodo di pagamento
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    marginBottom: "24px",
                  }}
                >
                  {(
                    [
                      {
                        val: "card",
                        label: "Carta di debito o credito",
                        sub: "Visa, Mastercard, Verve",
                        icon: <CreditCard size={20} />,
                      },
                      {
                        val: "transfer",
                        label: "Bonifico bancario",
                        sub: "GTBank, Access, UBA",
                        icon: <Banknote size={20} />,
                      },
                      {
                        val: "cash",
                        label: "Pagamento alla consegna",
                        sub: "Contanti alla consegna",
                        icon: <Banknote size={20} />,
                      },
                    ] as {
                      val: PaymentMethod;
                      label: string;
                      sub: string;
                      icon: React.ReactNode;
                    }[]
                  ).map(({ val, label, sub, icon }) => (
                    <button
                      key={val}
                      onClick={() => setPaymentMethod(val)}
                      style={{
                        padding: "16px 20px",
                        borderRadius: "10px",
                        cursor: "pointer",
                        textAlign: "left",
                        border:
                          paymentMethod === val
                            ? "1px solid #E8541A"
                            : "1px solid #3D3028",
                        background:
                          paymentMethod === val
                            ? "rgba(232,84,26,0.08)"
                            : "transparent",
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        transition: "all 0.2s",
                      }}
                    >
                      <span
                        style={{
                          color: paymentMethod === val ? "#E8541A" : "#8A7566",
                        }}
                      >
                        {icon}
                      </span>
                      <div>
                        <p
                          style={{
                            fontWeight: 600,
                            fontSize: "14px",
                            color: "#F5EDD8",
                            marginBottom: "2px",
                          }}
                        >
                          {label}
                        </p>
                        <p style={{ fontSize: "12px", color: "#8A7566" }}>
                          {sub}
                        </p>
                      </div>
                      <div
                        style={{
                          marginLeft: "auto",
                          width: "18px",
                          height: "18px",
                          borderRadius: "50%",
                          border:
                            paymentMethod === val
                              ? "none"
                              : "2px solid #3D3028",
                          background:
                            paymentMethod === val ? "#E8541A" : "transparent",
                          flexShrink: 0,
                        }}
                      />
                    </button>
                  ))}
                </div>

                {paymentMethod === "card" && (
                  <div
                    style={{
                      marginBottom: "24px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: "12px",
                          color: "#8A7566",
                          display: "block",
                          marginBottom: "8px",
                          textTransform: "uppercase",
                          fontWeight: 600,
                        }}
                      >
                        Nome del titolare
                      </label>
                      <input
                        type="text"
                        placeholder="Mario Rossi"
                        value={paymentDetails.cardholderName}
                        onChange={(e) =>
                          setPaymentDetails({
                            ...paymentDetails,
                            cardholderName: e.target.value,
                          })
                        }
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "8px",
                          border: "1px solid #3D3028",
                          background: "#0F0D0A",
                          color: "#F5EDD8",
                          fontSize: "14px",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: "12px",
                          color: "#8A7566",
                          display: "block",
                          marginBottom: "8px",
                          textTransform: "uppercase",
                          fontWeight: 600,
                        }}
                      >
                        Numero della carta
                      </label>
                      <input
                        type="text"
                        placeholder="4111 1111 1111 1111"
                        value={paymentDetails.cardNumber}
                        onChange={(e) =>
                          setPaymentDetails({
                            ...paymentDetails,
                            cardNumber: e.target.value,
                          })
                        }
                        maxLength={19}
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "8px",
                          border: "1px solid #3D3028",
                          background: "#0F0D0A",
                          color: "#F5EDD8",
                          fontSize: "14px",
                          fontFamily: "monospace",
                        }}
                      />
                    </div>
                    <div
                      className="details-grid"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "16px",
                      }}
                    >
                      <div>
                        <label
                          style={{
                            fontSize: "12px",
                            color: "#8A7566",
                            display: "block",
                            marginBottom: "8px",
                            textTransform: "uppercase",
                            fontWeight: 600,
                          }}
                        >
                          Scadenza (MM/AA)
                        </label>
                        <input
                          type="text"
                          placeholder="12/28"
                          value={paymentDetails.expiry}
                          onChange={(e) =>
                            setPaymentDetails({
                              ...paymentDetails,
                              expiry: e.target.value,
                            })
                          }
                          maxLength={5}
                          style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "8px",
                            border: "1px solid #3D3028",
                            background: "#0F0D0A",
                            color: "#F5EDD8",
                            fontSize: "14px",
                          }}
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            fontSize: "12px",
                            color: "#8A7566",
                            display: "block",
                            marginBottom: "8px",
                            textTransform: "uppercase",
                            fontWeight: 600,
                          }}
                        >
                          CVV
                        </label>
                        <input
                          type="text"
                          placeholder="123"
                          value={paymentDetails.cvv}
                          onChange={(e) =>
                            setPaymentDetails({
                              ...paymentDetails,
                              cvv: e.target.value,
                            })
                          }
                          maxLength={3}
                          style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "8px",
                            border: "1px solid #3D3028",
                            background: "#0F0D0A",
                            color: "#F5EDD8",
                            fontSize: "14px",
                            fontFamily: "monospace",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === "transfer" && (
                  <div
                    style={{
                      marginBottom: "24px",
                      padding: "20px",
                      background: "rgba(232,84,26,0.08)",
                      borderRadius: "10px",
                      border: "1px solid #3D3028",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#D4A843",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        marginBottom: "16px",
                      }}
                    >
                      Coordinate bancarie
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontSize: "11px",
                            color: "#8A7566",
                            marginBottom: "4px",
                          }}
                        >
                          Nome della banca
                        </p>
                        <p
                          style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "#F5EDD8",
                          }}
                        >
                          Guaranty Trust Bank (GTBank)
                        </p>
                      </div>
                      <div>
                        <p
                          style={{
                            fontSize: "11px",
                            color: "#8A7566",
                            marginBottom: "4px",
                          }}
                        >
                          Numero di conto
                        </p>
                        <p
                          style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "#F5EDD8",
                            fontFamily: "monospace",
                          }}
                        >
                          0123456789
                        </p>
                      </div>
                      <div>
                        <p
                          style={{
                            fontSize: "11px",
                            color: "#8A7566",
                            marginBottom: "4px",
                          }}
                        >
                          Intestatario del conto
                        </p>
                        <p
                          style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "#F5EDD8",
                          }}
                        >
                          I Ragazzi del Sole
                        </p>
                      </div>
                      <div>
                        <p
                          style={{
                            fontSize: "11px",
                            color: "#8A7566",
                            marginBottom: "4px",
                          }}
                        >
                          Importo
                        </p>
                        <p
                          style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "#E8541A",
                          }}
                        >
                          {formatPrice(total)}
                        </p>
                      </div>
                    </div>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#8A7566",
                        marginTop: "16px",
                        lineHeight: "1.5",
                      }}
                    >
                      ℹ️ Dopo aver effettuato il bonifico, conferma l’ordine.
                      Tieni a portata di mano la ricevuta della transazione.
                    </p>
                  </div>
                )}

                {whatsappEnabled && <label style={{ display: "flex", gap: "12px", alignItems: "flex-start", margin: "20px 0", fontSize: "14px" }}>
                  <input
                    type="checkbox"
                    checked={whatsappEnabled && whatsappConsent !== false}
                    onChange={(event) => setWhatsappConsent(event.target.checked)}
                    disabled={loading}
                  />
                  <span>
                    Desidero ricevere su WhatsApp il riepilogo di questo ordine al
                    numero indicato. La spunta è attiva in partenza, ma il consenso
                    è facoltativo e puoi disattivarla prima di confermare.
                  </span>
                </label>}

                {isRestaurantClosed && (
                  <div
                    style={{
                      marginBottom: "20px",
                      padding: "16px 18px",
                      borderRadius: "12px",
                      background: "rgba(212,168,67,0.08)",
                      border: "1px solid rgba(212,168,67,0.25)",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#D4A843",
                        marginBottom: "4px",
                      }}
                    >
                      Per oggi siamo chiusi
                    </p>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#8A7566",
                        lineHeight: "1.5",
                      }}
                    >
                      Torna durante gli orari di apertura: saremo felici di
                      occuparci del tuo ordine.
                    </p>
                  </div>
                )}

                <div
                  className="order-action-row"
                  style={{ display: "flex", gap: "12px" }}
                >
                  <button
                    onClick={() => setStep("details")}
                    className="btn-ghost"
                    style={{
                      padding: "12px 24px",
                      borderRadius: "10px",
                      fontSize: "14px",
                    }}
                  >
                    ← Indietro
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={isRestaurantClosed || loading}
                    className="btn-ember"
                    style={{
                      padding: "12px 32px",
                      borderRadius: "10px",
                      fontSize: "14px",
                      flex: 1,
                      opacity: isRestaurantClosed || loading ? 0.6 : 1,
                      cursor:
                        isRestaurantClosed || loading ? "not-allowed" : "pointer",
                    }}
                  >
                    {loading ? "Salvataggio dell’ordine..." : "Invia l’ordine"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Summary sidebar */}
          <div>
            <div
              className="card order-summary-card"
              style={{ padding: "20px", position: "sticky", top: "80px" }}
            >
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#F5EDD8",
                  marginBottom: "16px",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Riepilogo ordine
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  marginBottom: "16px",
                }}
              >
                {items.map((item) => (
                  <div
                    key={item.id}
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span style={{ fontSize: "13px", color: "#8A7566" }}>
                      {item.name} ×{item.quantity}
                    </span>
                    <span style={{ fontSize: "13px", color: "#F5EDD8" }}>
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="divider" style={{ marginBottom: "12px" }} />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                }}
              >
                <span style={{ fontSize: "13px", color: "#8A7566" }}>
                  Subtotale
                </span>
                <span style={{ fontSize: "13px", color: "#F5EDD8" }}>
                  {formatPrice(sub)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "14px",
                }}
              >
                <span style={{ fontSize: "13px", color: "#8A7566" }}>
                  Consegna {orderType !== "delivery" && "(non disponibile)"}
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    color: deliveryFee === 0 ? "#D4A843" : "#F5EDD8",
                  }}
                >
                  {orderType !== "delivery"
                    ? "—"
                    : deliveryFee === 0
                      ? "Gratuita"
                      : formatPrice(deliveryFee)}
                </span>
              </div>
              <div className="divider" style={{ marginBottom: "12px" }} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, color: "#F5EDD8" }}>Totale</span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "18px",
                    color: "#E8541A",
                  }}
                >
                  {formatPrice(total)}
                </span>
              </div>

              <div
                style={{
                  marginTop: "16px",
                  padding: "12px",
                  background: "#221C16",
                  borderRadius: "8px",
                  border: "1px solid #3D3028",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    color: "#8A7566",
                    lineHeight: "1.6",
                  }}
                >
                  🕒 Tempo stimato:{" "}
                  <span style={{ color: "#F5EDD8" }}>30–45 min</span> per la
                  consegna, <span style={{ color: "#F5EDD8" }}>15–20 min</span>{" "}
                  per il ritiro
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .order-grid { grid-template-columns: 1fr !important; }
          .order-title { font-size: 30px !important; }
          .order-steps { margin-bottom: 24px !important; }
          .order-step-label { font-size: 12px !important; }
          .order-type-options { gap: 8px !important; }
          .order-type-btn {
            flex: 1 1 calc(50% - 8px);
            justify-content: center;
            padding: 10px 12px !important;
          }
          .cart-item-row {
            display: grid !important;
            grid-template-columns: 56px 1fr !important;
            gap: 10px !important;
            align-items: start !important;
          }
          .cart-item-controls {
            grid-column: 1 / -1;
            justify-content: space-between;
            gap: 8px !important;
            flex-wrap: wrap;
          }
          .details-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .order-action-row {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .order-action-row button {
            width: 100%;
            justify-content: center;
          }
          .order-summary-card {
            position: static !important;
            top: auto !important;
          }
        }

        @media (max-width: 480px) {
          .order-title { font-size: 26px !important; }
          .order-step-label { display: none; }
          .section-shell { padding: 28px 16px !important; }
          .card { padding: 16px !important; }
          .order-type-btn { flex: 1 1 100%; }
        }
      `}</style>
    </div>
  );
}
