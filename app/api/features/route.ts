import { whatsappOrderNotificationsEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { whatsappOrderNotifications: whatsappOrderNotificationsEnabled() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
