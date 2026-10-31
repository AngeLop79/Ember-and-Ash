import AuthForm from "./AuthForm";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const initialMode = mode === "signup" ? "signup" : "signin";

  return <AuthForm key={initialMode} initialMode={initialMode} />;
}
