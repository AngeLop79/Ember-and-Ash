"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { MENU_ITEMS } from "@/lib/data";
import MenuCard from "@/components/menu/MenuCard";
import CategoryFilter from "@/components/menu/CategoryFilter";

export default function MenuPage() {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const filtered = MENU_ITEMS.filter((item) => {
    const matchCat = category === "all" || item.category === category;
    const matchSearch =
      search === "" ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });
  return (
    <div
      className="page-shell menu-page-shell w-full max-w-full overflow-x-hidden"
      style={{ paddingTop: "64px", minHeight: "100vh" }}
    >
      <div
        className="section-shell menu-hero w-full max-w-full"
        style={{
          background: "#221C16",
          borderBottom: "1px solid #3D3028",
          padding: "48px 24px 32px",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <p className="section-label" style={{ marginBottom: "12px" }}>
            I sapori di una volta, preparati con amore
          </p>
          <h1
            className="font-display menu-title"
            style={{
              fontSize: "48px",
              fontWeight: 900,
              color: "#F5EDD8",
              marginBottom: "32px",
            }}
          >
            Il nostro menu
          </h1>
          <div
            className="font-display menu-title menu-search-wrapper"
            style={{
              fontSize: "48px",
              fontWeight: 900,
              color: "#F5EDD8",
              marginBottom: "32px",
              position: "relative",
            }}
          >
            <Search
              size={18}
              color="#8A7566"
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />
            <input
              className="input-field w-full max-w-full"
              type="text"
              placeholder="Cerca un piatto..."
              aria-label="Cerca un piatto"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "44px" }}
            />
          </div>
          <CategoryFilter active={category} onChange={setCategory} />
        </div>
      </div>
      <div
        className="section-shell menu-content w-full max-w-full"
        style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px" }}
      >
        {filtered.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: "80px 0", color: "#8A7566" }}
          >
            <p style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</p>
            <p
              className="font-display"
              style={{
                fontSize: "24px",
                color: "#F5EDD8",
                marginBottom: "8px",
              }}
            >
              Nessun risultato
            </p>
            <p>Prova un’altra categoria o un termine di ricerca</p>
          </div>
        ) : (
          <>
            <p
              style={{
                fontSize: "13px",
                color: "#8A7566",
                marginBottom: "24px",
              }}
            >
              {filtered.length} {filtered.length === 1 ? "piatto trovato" : "piatti trovati"}
            </p>
            <div
              className="mobile-grid-1 menu-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "20px",
              }}
            >
              {filtered.map((item) => (
                <MenuCard key={item.id} item={item} />
              ))}
            </div>
          </>
        )}
      </div>
      <style>{`
        @media (max-width: 640px) {
          .menu-page-shell { padding-left: 0 !important; padding-right: 0 !important; }
          .menu-hero { padding: 28px 14px 20px !important; }
          .menu-title { font-size: 34px !important; margin-bottom: 20px !important; }
          .menu-search-wrapper { max-width: 100% !important; }
          .menu-content { padding: 20px 14px !important; }
          .menu-grid { grid-template-columns: 1fr !important; }
          .menu-search-wrapper input { width: 100% !important; max-width: 100% !important; }
          .menu-search-wrapper button { width: 100% !important; }
        }
        @media (max-width: 480px) {
          .menu-hero { padding: 24px 12px 18px !important; }
          .menu-title { font-size: 30px !important; }
          .menu-content { padding: 18px 12px !important; }
        }
      `}</style>
    </div>
  );
}
