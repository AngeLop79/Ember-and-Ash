import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/adminSession";
import CashDesk from "@/components/admin/CashDesk";

export default async function CashPage() {
  if (!isValidAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value)) {
    redirect("/admin/login");
  }
  return <CashDesk />;
}
