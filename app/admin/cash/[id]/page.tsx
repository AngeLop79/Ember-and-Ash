import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/adminSession";
import { getOrderDetails } from "@/lib/orders";
import OrderDetails from "@/components/order/OrderDetails";
import { CashActions } from "@/components/admin/CashDesk";

export default async function CashOrderPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isValidAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value)) {
    redirect("/admin/login");
  }
  const order = await getOrderDetails((await params).id);
  if (!order) notFound();
  return (
    <section style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 16px 48px" }}>
      <OrderDetails order={order} staff />
      <CashActions id={order.id} status={order.status} type={order.type}
        paymentStatus={order.paymentStatus} total={order.total} />
    </section>
  );
}
