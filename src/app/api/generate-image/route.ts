import { NextRequest, NextResponse } from "next/server";
import { getAvailableProviders } from "@/lib/providers";

type Body = {
  provider: "gemini" | "openai";
  prompt: string;
  model?: string;
  imageDataUrl?: string;
  referenceImageDataUrl?: string;
  useReferenceImage?: boolean;
  sourceImages?: { name: string; dataUrl: string; resolution?: string }[];
  aspectRatio?: string;
  outputSize?: string;
  generationCount?: number;
};

function extractBase64Data(dataUrl?: string) {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function extractGeminiImages(json: any) {
  const images: string[] = [];
  for (const candidate of json?.candidates || []) {
    for (const part of candidate?.content?.parts || []) {
      if (part?.inlineData?.mimeType?.startsWith("image/") && part?.inlineData?.data) {
        images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
      }
    }
  }
  return images;
}

function extractGeminiText(json: any) {
  return (
    json?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text)
      .filter(Boolean)
      .join("\n") || ""
  );
}

async function callGemini(body: Body) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const primaryImage = extractBase64Data(body.imageDataUrl);
  const referenceImage = body.useReferenceImage ? extractBase64Data(body.referenceImageDataUrl) : null;
  const multiSourceImages = (body.sourceImages || [])
    .slice(0, 4)
    .map((img) => ({ name: img.name, parsed: extractBase64Data(img.dataUrl) }))
    .filter((x) => x.parsed);

  const baseParts: any[] = [{ text: body.prompt }];

  if (primaryImage) {
    baseParts.push({ text: "Primary product image:" });
    baseParts.push({ inlineData: { mimeType: primaryImage.mimeType, data: primaryImage.data } });
  }

  if (multiSourceImages.length) {
    baseParts.push({ text: `Additional source images (${multiSourceImages.length}) for combination/composition guidance. Use them together to produce ONE final composed product result:` });
    for (const item of multiSourceImages) {
      baseParts.push({ text: `Source image: ${item.name}` });
      baseParts.push({ inlineData: { mimeType: item.parsed!.mimeType, data: item.parsed!.data } });
    }
  }

  if (referenceImage) {
    baseParts.push({ text: "Reference image for optional structure/style guidance only:" });
    baseParts.push({ inlineData: { mimeType: referenceImage.mimeType, data: referenceImage.data } });
  }

  const model = body.model || "gemini-3.1-flash-image-preview";
  const count = Math.max(1, Math.min(8, Number(body.generationCount || 1)));
  const images: string[] = [];
  const texts: string[] = [];
  const raws: any[] = [];

  for (let i = 0; i < count; i++) {
    const parts = [...baseParts, { text: `Variation ${i + 1} of ${count}. Return one final image result for this variation.` }];
    const contents = [{ role: "user", parts }];
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.error?.message || "Gemini request failed.");
    }
    raws.push(json);
    images.push(...extractGeminiImages(json));
    const txt = extractGeminiText(json);
    if (txt) texts.push(txt);
  }

  const text = texts.join("\n\n") || (images.length ? `Image generation response received (${images.length}/${count}).` : "Gemini response received.");
  return { provider: "gemini", model, requestedCount: count, text, images, raw: raws };
}

async function callOpenAI(body: Body) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const model = body.model || "gpt-4.1-mini";
  const content: any[] = [{ type: "input_text", text: body.prompt }];
  if (body.imageDataUrl) content.push({ type: "input_image", image_url: body.imageDataUrl });
  for (const img of (body.sourceImages || []).slice(0, 4)) {
    content.push({ type: "input_image", image_url: img.dataUrl });
  }
  if (body.useReferenceImage && body.referenceImageDataUrl) {
    content.push({ type: "input_image", image_url: body.referenceImageDataUrl });
  }

  const input = [{ role: "user", content }];
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, input }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || "OpenAI request failed.");
  const outputText = (json?.output || []).flatMap((item: { content?: Array<{ text?: string }> }) => item.content || []).map((part: { text?: string }) => part.text).filter(Boolean).join("\n") || "OpenAI response received, but no direct image payload was returned by this route.";
  return { provider: "openai", model, text: outputText, images: [], raw: json };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    if (!body.prompt?.trim()) return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
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
