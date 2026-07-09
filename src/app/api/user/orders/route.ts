import { NextRequest, NextResponse } from "next/server";
import { getCustomerProfile, getOrdersByCustomer, findProductById } from "@/data/mock-database";

export async function GET(request: NextRequest) {
  const customerId = request.headers.get("x-customer-id");

  if (!customerId) {
    return NextResponse.json({ orders: null });
  }

  const profile = getCustomerProfile(customerId);

  if (!profile) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const customerOrders = getOrdersByCustomer(customerId);

  return NextResponse.json({
    user_id: profile.id,
    name: profile.name,
    email: profile.email,
    loyaltyTier: profile.loyaltyTier ?? "Insider",
    stylePreference: profile.stylePreference ?? undefined,
    preferredSizes: profile.preferredSizes ?? [],
    favoriteCategories: profile.favoriteCategories ?? [],
    lastPurchaseDate: profile.lastPurchaseDate || "Never",
    orders: customerOrders.map((o) => ({
      id: o.id,
      itemId: o.itemId,
      itemName: findProductById(o.itemId)?.name ?? o.itemId,
      itemType: o.itemType,
      purchaseDate: o.purchaseDate,
      status: o.status,
    })),
  });
}
