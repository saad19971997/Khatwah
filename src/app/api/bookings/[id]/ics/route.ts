import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookingIcs } from "@/lib/payments/service";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await db.booking.findUnique({ where: { id }, include: { consultant: true } });
  if (!booking || booking.status !== "CONFIRMED") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return new NextResponse(bookingIcs(booking), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="khatwah-${booking.ref}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
