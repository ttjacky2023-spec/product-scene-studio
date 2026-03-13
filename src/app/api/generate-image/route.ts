import { NextRequest, NextResponse } from "next/server";
import { getAvailableProviders } from "@/lib/providers";

type Body = {
  provider: "gemini" | "openai";
  prompt: string;
  model?: string;
  imageDataUrl?: string;
  aspectRatio?: string;
  outputSize?: string;
};

function extractBase64Data(dataUrl?: string) {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

async function callGemini(body: Body) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const image = extractBase64Data(body.imageDataUrl);
  const contents = [
    {
      role: "user",
      parts: [
        { text: body.prompt },
        ...(image ? [{ inlineData: { mimeType: image.mimeType, data: image.data } }] : []),
      ],
    },
  ];

  const model = body.model || "gemini-2.0-flash-exp";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || "Gemini request failed.");
  }

  const text = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).filter(Boolean).join("\n") || "Gemini response received, but no direct image payload was returned by this route.";
  return { provider: "gemini", model, text, raw: json };
}

async function callOpenAI(body: Body) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const model = body.model || "gpt-4.1-mini";
  const input = [
    {
      role: "user",
      content: [
        { type: "input_text", text: body.prompt },
        ...(body.imageDataUrl ? [{ type: "input_image", image_url: body.imageDataUrl }] : []),
      ],
    },
  ];

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || "OpenAI request failed.");
  }

  const outputText = (json?.output || [])
    .flatMap((item: { content?: Array<{ text?: string }> }) => item.content || [])
    .map((part: { text?: string }) => part.text)
    .filter(Boolean)
    .join("\n") || "OpenAI response received, but no direct image payload was returned by this route.";

  return { provider: "openai", model, text: outputText, raw: json };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const configured = getAvailableProviders();
    if (body.provider === "gemini") {
      if (!configured.gemini) return NextResponse.json({ error: "Gemini is not configured on the server." }, { status: 400 });
      return NextResponse.json(await callGemini(body));
    }
    if (body.provider === "openai") {
      if (!configured.openai) return NextResponse.json({ error: "OpenAI is not configured on the server." }, { status: 400 });
      return NextResponse.json(await callOpenAI(body));
    }

    return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error." }, { status: 500 });
  }
}
