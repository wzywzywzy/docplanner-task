import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = parseInt(id);

  if (isNaN(numId)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: numId },
  });

  if (!listing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(listing);
}
