import { NextResponse } from "next/server";
import { getAvailableProviders, getDefaultProvider } from "@/lib/providers";

export async function GET() {
  return NextResponse.json({
    providers: getAvailableProviders(),
    defaultProvider: getDefaultProvider(),
    note: "Keys are read from server environment variables only.",
  });
}
