import { create } from "zustand";
import { useCartStore } from "@/store/cartStore";

export type Accessory = { id: string; name: string; description: string };
type AccessoryStore = {
  enabled: boolean;
  byProduct: Record<string, Accessory[]>;
  loaded: boolean;
  load: () => Promise<void>;
};

export const useAccessoryStore = create<AccessoryStore>((set) => ({
  enabled: false,
  byProduct: {},
  loaded: false,
  load: async () => {
    const response = await fetch("/api/accessories", { cache: "no-store" });
    const result: unknown = await response.json();
    if (!response.ok || typeof result !== "object" || result === null ||
        !("enabled" in result) || typeof result.enabled !== "boolean" ||
        !("byProduct" in result) || typeof result.byProduct !== "object" || result.byProduct === null) {
      throw new Error("Impossibile caricare le personalizzazioni.");
    }
    const byProduct = result.byProduct as Record<string, Accessory[]>;
    set({ enabled: result.enabled, byProduct, loaded: true });
    if (!result.enabled) useCartStore.getState().clearAccessories();
  },
}));
