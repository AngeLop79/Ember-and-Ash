import { create } from "zustand";

type FeatureStore = {
  whatsappOrderNotifications: boolean;
  loadFeatures: () => Promise<void>;
};

export const useFeatureStore = create<FeatureStore>((set) => ({
  whatsappOrderNotifications: false,
  loadFeatures: async () => {
    try {
      const response = await fetch("/api/features", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || typeof result.whatsappOrderNotifications !== "boolean") {
        throw new Error("Configurazione notifiche non valida.");
      }
      set({ whatsappOrderNotifications: result.whatsappOrderNotifications });
    } catch (error) {
      set({ whatsappOrderNotifications: false });
      throw new Error("Impossibile verificare la disponibilita' delle notifiche WhatsApp.", { cause: error });
    }
  },
}));
