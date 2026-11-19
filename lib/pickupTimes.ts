import pickupTimeConfig from "@/config/pickup-times.json";

export const PICKUP_TIMES = pickupTimeConfig.pickupTimes;

export function isPickupTime(value: unknown): value is string {
  return typeof value === "string" && PICKUP_TIMES.includes(value);
}
