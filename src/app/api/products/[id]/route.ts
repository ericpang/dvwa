import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const productId = Number(id);

  const { rows: products } = await queryDb(
    "SELECT * FROM products WHERE id = $1",
    [productId],
    { endpoint: `/api/products/${productId}` }
  );
  if (!products[0]) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const { rows: reviews } = await queryDb(
    "SELECT * FROM reviews WHERE product_id = $1 ORDER BY id DESC",
    [productId]
  );

  return NextResponse.json({
    product: products[0],
    reviews,
  });
}
