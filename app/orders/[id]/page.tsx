import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getCustomer } from "@/lib/customerAuth";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/adminSession";
import { getOrderDetails } from "@/lib/orders";
import OrderDetails from "@/components/order/OrderDetails";
import { normalizeItalianPhone } from "@/lib/phone";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = isValidAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
  const user = staff ? null : await getCustomer();
  if (!staff && (!user || !normalizeItalianPhone(user.phone))) {
    redirect(`/auth?next=${encodeURIComponent(`/orders/${id}`)}`);
  }
  const order = await getOrderDetails(id);
  if (!order || (!staff && order.customerId !== user?.id)) notFound();

  return (
    <section style={{ maxWidth: "760px", margin: "0 auto", padding: "96px 16px 40px" }}>
      <OrderDetails order={order} staff={staff} />
    </section>
  );
}
