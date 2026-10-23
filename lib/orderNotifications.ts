export type NotificationStatus =
  | "pending" | "sending" | "accepted" | "failed" | "unknown" | "not_configured";

export function notificationMessage(status: NotificationStatus | null): string {
  switch (status) {
    case "accepted": return "Riepilogo affidato a WhatsApp per l'invio.";
    case "pending":
    case "sending": return "Riepilogo WhatsApp in attesa di invio.";
    case "not_configured": return "Invio WhatsApp non ancora configurato. Puoi seguire l'ordine dal sito.";
    case "failed": return "Il riepilogo WhatsApp non e' stato inviato. L'ordine resta salvato.";
    case "unknown": return "Esito dell'invio WhatsApp non verificabile. L'ordine resta salvato.";
    default: return "Riepilogo WhatsApp non richiesto.";
  }
}
