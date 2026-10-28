import AuthForm from "./AuthForm";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;

  return <AuthForm initialMode={mode === "signup" ? "signup" : "signin"} />;
}
