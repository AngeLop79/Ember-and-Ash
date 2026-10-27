"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  MessageCircle,
  Calendar,
  MapPin,
  Clock,
  Star,
} from "lucide-react";
import { MENU_ITEMS, RESTAURANT_INFO } from "@/lib/data";
import { reservationsEnabled } from "@/lib/features";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";

const FEATURED = MENU_ITEMS.filter((i) => i.featured).slice(0, 4);

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { addItem, openCart } = useCartStore();
  const handleAdd = (item: (typeof MENU_ITEMS)[0]) => {
    addItem(item);
    toast.success(`${item.name} aggiunto al carrello!`);
    openCart();
  };

  const handleWhatsAppCTA = () => {
    if (!isAuthenticated) {
      toast.error("Accedi o crea un account prima di usare WhatsApp");
      router.push("/auth?next=/");
      return;
    }
    const message = encodeURIComponent(
      "Salve I ragazzi del sole! Vorrei effettuare un ordine 🔥",
    );
    window.open(
      `https://wa.me/${RESTAURANT_INFO.whatsapp.replace(/\+/g, "")}?text=${message}`,
      "_blank",
    );
  };
  return (
    <div className="page-shell home-page-shell" style={{ paddingTop: "64px" }}>
      <section
        className="section-shell home-hero-shell"
        style={{
          minHeight: "calc(100dvh - 64px)",
          position: "relative",
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          width: "100%",
        }}
      >
        <div
          className="home-hero-bg"
          style={{
            position: "absolute",
            top: "-1px",
            left: "-1px",
            right: "-1px",
            bottom: "-1px",
            backgroundImage:
              "url('/images/layout/salsiccia.jpeg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "brightness(0.3)",
            transform: "scale(1.02)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, rgba(232,84,26,0.15) 0%, rgba(26,22,18,0.8) 60%)",
          }}
        />
        <div
          className="page-enter home-hero-content"
          style={{
            position: "relative",
            zIndex: 10,
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 24px",
            width: "100%",
          }}
        >
          <p className="section-label " style={{marginTop: "13px", marginBottom: "24px" }}>
            🔥 Le ordinazioni sono aperte!
          </p>
          <h1
            className="font-display mobile-title"
            style={{
              fontSize: "clamp(44px, 10vw, 96px)",
              fontWeight: 900,
              lineHeight: 1.1,
              color: "#F5EDD8",
              marginBottom: "4px",
            }}
          >
            XIII° Sagra del Maiale
          </h1>
          <h1
            className="font-display mobile-title"
            style={{
              fontSize: "clamp(44px, 10vw, 96px)",
              fontWeight: 900,
              lineHeight: 1.1,
              color: "#E8541A",
              marginBottom: "28px",
              fontStyle: "italic",
            }}
          >
            I sapori della tradizione
          </h1>
          <p
            className="mobile-subtitle"
            style={{
              fontSize: "18px",
              color: "#8A7566",
              maxWidth: "480px",
              lineHeight: "1.7",
              marginBottom: "48px",
            }}
          >
            La tradizione calabrese, il gusto della cucina contadina e il profumo del maiale alla brace: una festa di sapori autentici e convivialità, nel cuore della nostra comunità.
          </p>
          <div
            className="mobile-stack mobile-small-gap"
            style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}
          >
            <Link href="/menu" style={{ textDecoration: "none" }}>
              <button
                className="btn-ember"
                style={{
                  padding: "16px 32px",
                  borderRadius: "10px",
                  fontSize: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                Scopri il menu <ArrowRight size={18} />
              </button>
            </Link>
            {reservationsEnabled() && (
              <Link href="/reservations" style={{ textDecoration: "none" }}>
                <button
                  className="btn-ghost"
                  style={{
                    padding: "16px 32px",
                    borderRadius: "10px",
                    fontSize: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <Calendar size={18} /> Prenota un tavolo
                </button>
              </Link>
            )}
          </div>
          <div
            className="mobile-stack mobile-small-gap"
            style={{
              display: "flex",
              gap: "40px",
              marginTop: "64px",
              flexWrap: "wrap",
            }}
          >
            {[
              { label: "Piatti in menu", value: "50+" },
              { label: "Ospiti soddisfatti", value: "12k+" },
              { label: "Anni di brace", value: "8" },
              { label: "Valutazione", value: "4.9★" },
            ].map((stat) => (
              <div key={stat.label}>
                <p
                  className="font-display"
                  style={{
                    fontSize: "32px",
                    fontWeight: 900,
                    color: "#F5EDD8",
                  }}
                >
                  {stat.value}
                </p>
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
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="home-section home-feature-section"
        style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 24px" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: "48px",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <p className="section-label" style={{ marginBottom: "12px" }}>
              Le nostre specialità
            </p>
            <h2
              className="font-display"
              style={{ fontSize: "40px", fontWeight: 700, color: "#F5EDD8" }}
            >
              {"I preferiti dello chef"}
            </h2>
          </div>
          <Link href="/menu" style={{ textDecoration: "none" }}>
            <span
              style={{
                color: "#E8541A",
                fontSize: "14px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              Tutto il menu <ArrowRight size={16} />
            </span>
          </Link>
        </div>
        <div
          className="mobile-grid-1 home-feature-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "20px",
          }}
        >
          {FEATURED.map((item) => (
            <div key={item.id} className="card" style={{ overflow: "hidden" }}>
              <div style={{ position: "relative", height: "200px" }}>
                <img
                  src={item.image}
                  alt={item.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "80px",
                    background: "linear-gradient(transparent, #221C16)",
                  }}
                />
                <span
                  className="badge"
                  style={{
                    position: "absolute",
                    top: "12px",
                    left: "12px",
                    background: "#E8541A",
                    color: "white",
                  }}
                >
                  In evidenza
                </span>
              </div>
              <div style={{ padding: "16px" }}>
                <h3
                  className="font-display"
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "#F5EDD8",
                    marginBottom: "6px",
                  }}
                >
                  {item.name}
                </h3>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#8A7566",
                    lineHeight: "1.5",
                    marginBottom: "16px",
                  }}
                >
                  {item.description}
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    className="font-display"
                    style={{
                      fontSize: "22px",
                      fontWeight: 700,
                      color: "#E8541A",
                    }}
                  >
                    {formatPrice(item.price)}
                  </span>
                  <button
                    onClick={() => handleAdd(item)}
                    className="btn-ember"
                    style={{
                      padding: "8px 18px",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  >
                    Aggiungi
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        className="home-section home-how-section"
        style={{
          background: "#221C16",
          borderTop: "1px solid #3D3028",
          borderBottom: "1px solid #3D3028",
          padding: "80px 24px",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <p
            className="section-label"
            style={{ marginBottom: "12px", textAlign: "center" }}
          >
            Semplice come il fuoco
          </p>
          <h2
            className="font-display"
            style={{
              fontSize: "36px",
              fontWeight: 700,
              color: "#F5EDD8",
              textAlign: "center",
              marginBottom: "48px",
            }}
          >
            Come ordinare
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "32px",
            }}
          >
            {[
              {
                step: "01",
                title: "Sfoglia il menu",
                desc: "Scopri i piatti alla brace: antipasti, primi, grigliate, zuppe e molto altro.",
                icon: "🍽️",
              },
              {
                step: "02",
                title: "Componi il tuo ordine",
                desc: "Aggiungi i piatti al carrello, scegli le quantità e inserisci eventuali richieste.",
                icon: "🛒",
              },
              {
                step: "03",
                title: "Scegli come riceverlo",
                desc: "Consegna a domicilio, ritiro o consumo al ristorante. Paga con carta, bonifico o contanti.",
                icon: "🛵",
              },
              {
                step: "04",
                title: "Segui l’ordine e gusta",
                desc: "Segui l’avanzamento dell’ordine e assapora ogni boccone cotto alla brace.",
                icon: "🔥",
              },
            ].map((s) => (
              <div key={s.step} style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "16px",
                    background: "rgba(232,84,26,0.1)",
                    border: "1px solid rgba(232,84,26,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "32px",
                    margin: "0 auto 20px",
                  }}
                >
                  {s.icon}
                </div>
                <p
                  style={{
                    fontSize: "11px",
                    color: "#E8541A",
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    marginBottom: "8px",
                  }}
                >
                  {s.step}
                </p>
                <h3
                  className="font-display"
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "#F5EDD8",
                    marginBottom: "8px",
                  }}
                >
                  {s.title}
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#8A7566",
                    lineHeight: "1.6",
                  }}
                >
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="home-section home-cta-section"
        style={{ padding: "80px 24px", maxWidth: "1200px", margin: "0 auto" }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
            borderRadius: "20px",
            padding: "60px 48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "32px",
          }}
        >
          <div>
            <h2
              className="font-display"
              style={{
                fontSize: "36px",
                fontWeight: 700,
                color: "white",
                marginBottom: "12px",
              }}
            >
              Ordina su WhatsApp
            </h2>
            <p
              style={{
                fontSize: "16px",
                color: "rgba(255,255,255,0.8)",
                maxWidth: "480px",
                lineHeight: "1.6",
              }}
            >
              Preferisci scriverci? Contattaci direttamente: confermeremo il tuo
              ordine e ti terremo aggiornato in ogni fase.
            </p>
          </div>
          <button
            onClick={handleWhatsAppCTA}
            style={{
              background: "white",
              color: "#128C7E",
              border: "none",
              padding: "18px 36px",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <MessageCircle size={22} /> Scrivici
          </button>
        </div>
      </section>

      <section
        className="home-section home-info-section"
        style={{
          background: "#221C16",
          borderTop: "1px solid #3D3028",
          padding: "40px 24px",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "32px",
          }}
        >
          <div
            style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}
          >
            <MapPin
              size={22}
              color="#E8541A"
              style={{ flexShrink: 0, marginTop: "2px" }}
            />
            <div>
              <p
                style={{
                  fontWeight: 600,
                  color: "#F5EDD8",
                  marginBottom: "4px",
                }}
              >
                Dove siamo
              </p>
              <p style={{ fontSize: "13px", color: "#8A7566" }}>
                {RESTAURANT_INFO.address}
              </p>
            </div>
          </div>
          <div
            style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}
          >
            <Clock
              size={22}
              color="#E8541A"
              style={{ flexShrink: 0, marginTop: "2px" }}
            />
            <div>
              <p
                style={{
                  fontWeight: 600,
                  color: "#F5EDD8",
                  marginBottom: "4px",
                }}
              >
                Orari
              </p>
              <p style={{ fontSize: "13px", color: "#8A7566" }}>
                Lun–Ven: {RESTAURANT_INFO.hours.weekday}
              </p>
              <p style={{ fontSize: "13px", color: "#8A7566" }}>
                Sab–Dom: {RESTAURANT_INFO.hours.weekend}
              </p>
            </div>
          </div>
          <div
            style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}
          >
            <Star
              size={22}
              color="#D4A843"
              style={{ flexShrink: 0, marginTop: "2px" }}
            />
            <div>
              <p
                style={{
                  fontWeight: 600,
                  color: "#F5EDD8",
                  marginBottom: "4px",
                }}
              >
                Consegna
              </p>
              <p style={{ fontSize: "13px", color: "#8A7566" }}>
                Entro {RESTAURANT_INFO.deliveryRadius}
              </p>
              <p style={{ fontSize: "13px", color: "#D4A843" }}>
                Gratuita sopra {formatPrice(RESTAURANT_INFO.freeDeliveryAbove)}
              </p>
            </div>
          </div>
        </div>
      </section>
      <footer
        style={{
          background: "#1A1612",
          borderTop: "1px solid #3D3028",
          padding: "32px 24px",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "13px", color: "#f4ecb9" }}>
          © 2026 I ragazzi del sole ·{" "}
          <a
            href={`tel:${RESTAURANT_INFO.phone}`}
            style={{ color: "#8A7566", textDecoration: "none" }}
          >
            {RESTAURANT_INFO.phone}
          </a>
        </p>
      </footer>
    </div>
  );
}
