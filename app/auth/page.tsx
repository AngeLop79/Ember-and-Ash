"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { readAccounts, saveAccounts, type Account } from "@/lib/demoAuth";
import toast from "react-hot-toast";

type AuthMode = "signin" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const { signIn } = useAuthStore();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [loading, setLoading] = useState(false);
  const [successState, setSuccessState] = useState<null | {
    name: string;
    action: "logged in" | "signed up";
  }>(null);

  const [signinForm, setSigninForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const handleSignIn = (event: FormEvent) => {
    event.preventDefault();
    const email = signinForm.email.trim().toLowerCase();
    const password = signinForm.password;

    if (!email || !password) {
      toast.error("Inserisci email e password");
      return;
    }

    setLoading(true);
    const account = readAccounts().find(
      (item: Account) =>
        item.email.toLowerCase() === email && item.password === password,
    );

    if (!account) {
      setLoading(false);
      toast.error("Account non trovato. Registrati prima.");
      return;
    }

    signIn({ name: account.name, email: account.email, phone: account.phone });
    setLoading(false);
    toast.success("Bentornato!");
    setSuccessState({ name: account.name, action: "logged in" });
  };

  const handleSignUp = (event: FormEvent) => {
    event.preventDefault();
    const name = signupForm.name.trim();
    const email = signupForm.email.trim().toLowerCase();
    const phone = signupForm.phone.trim();
    const password = signupForm.password;
    const confirmPassword = signupForm.confirmPassword;

    if (!name || !email || !password) {
      toast.error("Nome, email e password sono obbligatori");
      return;
    }

    if (password.length < 6) {
      toast.error("La password deve contenere almeno 6 caratteri");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Le password non coincidono");
      return;
    }

    setLoading(true);
    const accounts = readAccounts();
    const exists = accounts.some(
      (item: Account) => item.email.toLowerCase() === email,
    );
    if (exists) {
      setLoading(false);
      toast.error("Questa email è già registrata. Accedi.");
      return;
    }

    const newAccount: Account = { name, email, phone, password };
    saveAccounts([...accounts, newAccount]);
    signIn({ name, email, phone });
    setLoading(false);
    toast.success("Account creato");
    setSuccessState({ name, action: "signed up" });
  };

  if (successState) {
    return (
      <div
        className="page-shell auth-page-shell w-full max-w-full overflow-x-hidden"
        style={{
          paddingTop: "64px",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
        }}
      >
        <div
          className="card page-enter"
          style={{
            width: "100%",
            maxWidth: "520px",
            padding: "32px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "84px",
              height: "84px",
              borderRadius: "50%",
              margin: "0 auto 20px",
              background: "rgba(52,211,153,0.12)",
              border: "2px solid rgba(52,211,153,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#34D399",
              fontSize: "36px",
            }}
          >
            ✓
          </div>
          <p
            className="section-label"
            style={{ marginBottom: "10px", color: "#34D399" }}
          >
            {successState.action === "logged in"
              ? "Accesso effettuato"
              : "Registrazione completata"}
          </p>
          <h1
            className="font-display"
            style={{
              fontSize: "34px",
              fontWeight: 800,
              color: "#F5EDD8",
              marginBottom: "10px",
            }}
          >
            Benvenuto, {successState.name}
          </h1>
          <p
            style={{
              color: "#8A7566",
              marginBottom: "28px",
              lineHeight: "1.6",
            }}
          >
            Il tuo account è attivo e hai effettuato l’accesso.
          </p>
          <button
            onClick={() => router.push("/")}
            className="btn-ember"
            style={{
              padding: "14px 22px",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            Torna alla home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="page-shell auth-page-shell w-full max-w-full overflow-x-hidden"
      style={{
        paddingTop: "64px",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
      }}
    >
      <div
        className="card page-enter auth-card w-full max-w-full"
        style={{ width: "100%", maxWidth: "520px", padding: "28px" }}
      >
        <p className="section-label" style={{ marginBottom: "10px" }}>
          Account cliente
        </p>
        <h1
          className="font-display auth-title"
          style={{
            fontSize: "32px",
            fontWeight: 800,
            color: "#F5EDD8",
            marginBottom: "20px",
          }}
        >
          {mode === "signin"
            ? "Accedi con email"
            : "Crea un account"}
        </h1>

        <div className="auth-toggle-row" style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
          <button
            onClick={() => setMode("signin")}
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: "10px",
              border: mode === "signin" ? "none" : "1px solid #3D3028",
              background: mode === "signin" ? "#E8541A" : "transparent",
              color: mode === "signin" ? "white" : "#8A7566",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "14px",
              transition: "all 0.2s",
            }}
          >
            Accedi
          </button>
          <button
            onClick={() => setMode("signup")}
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: "10px",
              border: mode === "signup" ? "none" : "1px solid #3D3028",
              background: mode === "signup" ? "#E8541A" : "transparent",
              color: mode === "signup" ? "white" : "#8A7566",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "14px",
              transition: "all 0.2s",
            }}
          >
            Registrati
          </button>
        </div>

        {mode === "signin" ? (
          <form
            onSubmit={handleSignIn}
            className="auth-form"
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
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
                Indirizzo email
              </label>
              <input
                className="input-field"
                type="email"
                placeholder="tu@email.it"
                value={signinForm.email}
                onChange={(event) =>
                  setSigninForm({ ...signinForm, email: event.target.value })
                }
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
                Password
              </label>
              <input
                className="input-field"
                type="password"
                placeholder="Inserisci la password"
                value={signinForm.password}
                onChange={(event) =>
                  setSigninForm({ ...signinForm, password: event.target.value })
                }
              />
            </div>
            <button
              className="btn-ember"
              type="submit"
              disabled={loading}
              style={{
                marginTop: "8px",
                padding: "14px 18px",
                borderRadius: "10px",
                fontWeight: 700,
              }}
            >
              {loading ? "Accesso in corso..." : "Accedi"}
            </button>
            <p className="auth-switch-copy" style={{ marginTop: "8px", fontSize: "13px", color: "#8A7566", textAlign: "center" }}>
              Non hai un account?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#D4A843",
                  cursor: "pointer",
                  padding: 0,
                  fontWeight: 600,
                }}
              >
                Registrati
              </button>
            </p>
          </form>
        ) : (
          <form
            onSubmit={handleSignUp}
            className="auth-form"
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
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
                Nome e cognome
              </label>
              <input
                className="input-field"
                placeholder="Il tuo nome"
                value={signupForm.name}
                onChange={(event) =>
                  setSignupForm({ ...signupForm, name: event.target.value })
                }
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
                Indirizzo email
              </label>
              <input
                className="input-field"
                type="email"
                placeholder="tu@email.it"
                value={signupForm.email}
                onChange={(event) =>
                  setSignupForm({ ...signupForm, email: event.target.value })
                }
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
                Telefono
              </label>
              <input
                className="input-field"
                type="tel"
                placeholder="+39..."
                value={signupForm.phone}
                onChange={(event) =>
                  setSignupForm({ ...signupForm, phone: event.target.value })
                }
              />
            </div>
            <div
              className="password-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
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
                  Password
                </label>
                <input
                  className="input-field"
                  type="password"
                  placeholder="Almeno 6 caratteri"
                  value={signupForm.password}
                  onChange={(event) =>
                    setSignupForm({
                      ...signupForm,
                      password: event.target.value,
                    })
                  }
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
                  Conferma password
                </label>
                <input
                  className="input-field"
                  type="password"
                  placeholder="Ripeti la password"
                  value={signupForm.confirmPassword}
                  onChange={(event) =>
                    setSignupForm({
                      ...signupForm,
                      confirmPassword: event.target.value,
                    })
                  }
                />
              </div>
            </div>
            <button
              className="btn-ember"
              type="submit"
              disabled={loading}
              style={{
                marginTop: "8px",
                padding: "14px 18px",
                borderRadius: "10px",
                fontWeight: 700,
              }}
            >
              {loading ? "Creazione account..." : "Crea account"}
            </button>
            <p className="auth-switch-copy" style={{ marginTop: "8px", fontSize: "13px", color: "#8A7566", textAlign: "center" }}>
              Hai già un account?{" "}
              <button
                type="button"
                onClick={() => setMode("signin")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#D4A843",
                  cursor: "pointer",
                  padding: 0,
                  fontWeight: 600,
                }}
              >
                Accedi
              </button>
            </p>
          </form>
        )}

        <p className="auth-guest-copy" style={{ marginTop: "24px", fontSize: "13px", color: "#8A7566", textAlign: "center", borderTop: "1px solid #3D3028", paddingTop: "16px" }}>
          Vuoi continuare come ospite? Torna al{" "}
          <Link href="/menu" style={{ color: "#D4A843", fontWeight: 600 }}>
            menu
          </Link>
          .
        </p>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .auth-page-shell {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }

          .auth-card {
            padding: 24px 20px !important;
          }

          .auth-toggle-row {
            gap: 10px !important;
          }

          .auth-form {
            gap: 14px !important;
          }

          .auth-guest-copy {
            margin-top: 20px !important;
          }
        }

        @media (max-width: 480px) {
          .auth-page-shell {
            padding-top: 56px !important;
            padding-left: 12px !important;
            padding-right: 12px !important;
          }

          .auth-card { padding: 20px 16px !important; }
          .auth-title { font-size: 26px !important; }
          .password-grid { grid-template-columns: 1fr !important; }

          .auth-toggle-row {
            flex-direction: column !important;
          }

          .auth-toggle-row button,
          .auth-form button {
            width: 100% !important;
          }

          .auth-switch-copy,
          .auth-guest-copy {
            font-size: 12px !important;
          }
        }
      `}</style>
    </div>
  );
}
