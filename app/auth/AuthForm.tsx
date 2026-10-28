"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import { safeAuthDestination } from "@/lib/authRedirect";
import { italianPhoneDigits, normalizeItalianPhone } from "@/lib/phone";

type AuthMode = "signin" | "signup";

export default function AuthPage({
  initialMode,
}: {
  initialMode: AuthMode;
}) {
  const router = useRouter();
  const { signIn, user, isAuthenticated, hasHydrated } = useAuthStore();

  const [mode, setMode] = useState<AuthMode>(initialMode);
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
  const [profilePhone, setProfilePhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    if (error === "google_config") {
      toast.error("Accesso Google non configurato sul server.");
    } else if (error) {
      toast.error("Accesso Google non riuscito. Riprova.");
    }
  }, []);

  const authenticate = async (mode: AuthMode) => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          ...(mode === "signup"
            ? {
                ...signupForm,
                phone: normalizeItalianPhone(signupForm.phone),
              }
            : signinForm),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Accesso non riuscito.");
      signIn(result.user);
      setSigninForm({ email: "", password: "" });
      setSignupForm({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
      toast.success(mode === "signup" ? "Account creato" : "Bentornato!");
      setSuccessState({ name: result.user.name, action: mode === "signup" ? "signed up" : "logged in" });
      const next = new URLSearchParams(window.location.search).get("next");
      const destination = safeAuthDestination(next);
      if (destination) router.replace(destination);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Accesso non riuscito.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = (event: FormEvent) => {
    event.preventDefault();
    const email = signinForm.email.trim().toLowerCase();
    const password = signinForm.password;

    if (!email || !password) {
      toast.error("Inserisci email e password");
      return;
    }

    void authenticate("signin");
  };

  const handleSignUp = (event: FormEvent) => {
    event.preventDefault();
    const name = signupForm.name.trim();
    const email = signupForm.email.trim().toLowerCase();
    const password = signupForm.password;
    const confirmPassword = signupForm.confirmPassword;

    if (!name || !email || !password || !normalizeItalianPhone(signupForm.phone)) {
      toast.error("Nome, email, telefono italiano e password sono obbligatori.");
      return;
    }

    if (password.length < 10 || password.length > 128) {
      toast.error("La password deve contenere da 10 a 128 caratteri");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Le password non coincidono");
      return;
    }

    void authenticate("signup");
  };

  const completeProfile = async (event: FormEvent) => {
    event.preventDefault();
    const phone = normalizeItalianPhone(profilePhone);
    if (!phone) {
      toast.error("Inserisci un numero italiano valido con prefisso +39.");
      return;
    }
    setSavingPhone(true);
    try {
      const response = await fetch("/api/auth", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossibile salvare il telefono.");
      signIn(result.user);
      toast.success("Numero di telefono salvato.");
      const destination = safeAuthDestination(
        new URLSearchParams(window.location.search).get("next"),
      );
      router.replace(destination ?? "/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossibile salvare il telefono.");
    } finally {
      setSavingPhone(false);
    }
  };

  const startGoogleLogin = () => {
    const next = new URLSearchParams(window.location.search).get("next");
    const destination = safeAuthDestination(next);
    const url = new URL("/api/auth/google", window.location.origin);
    if (destination) url.searchParams.set("next", destination);
    window.location.assign(url);
  };

  if (hasHydrated && isAuthenticated && user) {
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
          {!normalizeItalianPhone(user.phone ?? "") ? (
            <>
              <p className="section-label" style={{ marginBottom: "10px" }}>
                Ultimo passaggio
              </p>
              <h1
                className="font-display"
                style={{
                  fontSize: "30px",
                  fontWeight: 800,
                  color: "#F5EDD8",
                  marginBottom: "12px",
                }}
              >
                Completa il tuo profilo
              </h1>
              <p style={{ color: "#8A7566", marginBottom: "24px" }}>
                Per usare il tuo account è necessario un numero di telefono italiano.
              </p>
              <form
                onSubmit={completeProfile}
                style={{ display: "flex", flexDirection: "column", gap: "14px" }}
              >
                <label
                  htmlFor="profile-phone"
                  style={{ textAlign: "left", color: "#8A7566", fontSize: "13px" }}
                >
                  Numero di telefono *
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
                    id="profile-phone"
                    className="input-field"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="320 123 4567"
                    required
                    value={italianPhoneDigits(profilePhone)}
                    onChange={(event) =>
                      setProfilePhone(italianPhoneDigits(event.target.value))
                    }
                    style={{ flex: 1 }}
                  />
                </div>
                <button
                  className="btn-ember"
                  type="submit"
                  disabled={savingPhone}
                  style={{ padding: "14px 18px", borderRadius: "10px", fontWeight: 700 }}
                >
                  {savingPhone ? "Salvataggio..." : "Salva e continua"}
                </button>
              </form>
            </>
          ) : (
            <>
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
            {successState?.action === "signed up"
              ? "Registrazione completata"
              : "Accesso effettuato"}
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
            Benvenuto, {successState?.name ?? user?.name}
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
            </>
          )}
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
                htmlFor="signup-phone"
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
                  id="signup-phone"
                  className="input-field"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="320 123 4567"
                  required
                  value={italianPhoneDigits(signupForm.phone)}
                  onChange={(event) =>
                    setSignupForm({
                      ...signupForm,
                      phone: italianPhoneDigits(event.target.value),
                    })
                  }
                  style={{ flex: 1 }}
                />
              </div>
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
                  placeholder="Da 10 a 128 caratteri"
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

        <button
          type="button"
          onClick={startGoogleLogin}
          className="btn-ghost"
          style={{
            width: "100%",
            marginTop: "16px",
            padding: "14px 18px",
            borderRadius: "10px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          <svg
            aria-hidden="true"
            focusable="false"
            width="20"
            height="20"
            viewBox="0 0 48 48"
          >
            <path
              fill="#4285F4"
              d="M43.611 20.083H42V20H24v8h11.303C33.653 31.657 29.214 35 24 35c-6.075 0-11-4.925-11-11s4.925-11 11-11c2.807 0 5.366 1.06 7.31 2.79l5.657-5.657C33.57 6.842 28.984 5 24 5 13.507 5 5 13.507 5 24s8.507 19 19 19 19-8.507 19-19c0-1.304-.134-2.577-.389-3.917Z"
            />
            <path
              fill="#34A853"
              d="M24 44c5.518 0 10.15-1.83 13.533-4.975l-6.24-5.074C29.61 35.33 26.99 36 24 36c-5.185 0-9.59-3.31-11.17-7.93L6.57 33.2C9.92 39.62 16.44 44 24 44Z"
            />
            <path
              fill="#FBBC05"
              d="M12.83 28.07A12 12 0 0 1 12 24c0-1.42.25-2.79.7-4.07l-6.57-5.02A19 19 0 0 0 5 24c0 3.08.74 5.98 2.05 8.53l5.78-4.46Z"
            />
            <path
              fill="#EA4335"
              d="M24 12c3.01 0 5.72 1.04 7.85 3.08l5.86-5.86C34.15 5.9 29.52 4 24 4 16.44 4 9.92 8.38 6.57 14.8l6.13 5.13C14.3 15.31 18.72 12 24 12Z"
            />
          </svg>
          Continua con Google
        </button>

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
            gap: 8px !important;
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

          .auth-toggle-row button,
          .auth-form button {
            width: 100% !important;
          }

          .auth-toggle-row button {
            min-width: 0;
            padding-left: 8px !important;
            padding-right: 8px !important;
            font-size: 13px !important;
            white-space: nowrap;
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
