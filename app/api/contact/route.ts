import { NextResponse } from "next/server";
import { handleContactRequest } from "@/lib/contact/handler";

export async function POST(request: Request) {
  const result = await handleContactRequest(request);
  return NextResponse.json(result.body, {
    status: result.status,
    headers: result.headers,
  });
}
