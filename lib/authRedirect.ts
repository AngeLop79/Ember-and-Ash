import { reservationsEnabled } from "@/lib/features";

export function safeAuthDestination(value: string | null): string | null {
  if (!value) return null;
  const allowedDestinations = ["/", "/order", "/tracking", "/menu"];
  if (reservationsEnabled()) allowedDestinations.push("/reservations");
  if (
    allowedDestinations.includes(value) ||
    /^\/orders\/EA-[A-Fa-f0-9]{16}$/.test(value)
  ) {
    return value;
  }
  return null;
}
