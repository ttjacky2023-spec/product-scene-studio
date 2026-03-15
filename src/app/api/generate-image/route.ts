import { NextRequest, NextResponse } from "next/server";
import { getAvailableProviders } from "@/lib/providers";
import { validateGenerationInput } from "@/lib/generation-validation";

type Body = {
  provider: "gemini" | "openai";
  locale?: "en" | "zh";
  prompt: string;
  model?: string;
  referenceAnalysisModel?: string;
  imageDataUrl?: string;
  referenceImageDataUrl?: string;
  useReferenceImage?: boolean;
  sourceImages?: { name: string; dataUrl: string; resolution?: string }[];
  aspectRatio?: string;
  outputSize?: string;
  generationCount?: number;
  productFrameCoverageTarget?: string | number;
};

type GeminiPart = { text?: string; inlineData?: { mimeType?: string; data?: string } };
type GeminiResponse = { candidates?: Array<{ content?: { parts?: GeminiPart[] } }>; error?: { message?: string } };
type BlockingIssue = { code: string; message: string };
type VariationLog = { variation: number; attempt: number; imageCount: number; textLength: number; accepted: boolean; reason?: string };
type ReferenceSummary = {
  model: string;
  structureHint: string;
  styleHint: string;
  sceneHint: string;
  warnings: string[];
  rawText?: string;
};

function extractBase64Data(dataUrl?: string) {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function extractGeminiImages(json: GeminiResponse) {
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

function extractGeminiText(json: GeminiResponse) {
  return (
    json?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join("\n") || ""
  );
}

function extractOpenAIImages(json: unknown) {
  const images: string[] = [];
  const output = (json as { output?: Array<{ content?: Array<{ type?: string; image_url?: string; b64_json?: string }> }> })?.output || [];
  for (const item of output) {
    for (const part of item.content || []) {
      if (part?.image_url) images.push(part.image_url);
      if (part?.b64_json) images.push(`data:image/png;base64,${part.b64_json}`);
      if (part?.type === "output_image" && part?.image_url) images.push(part.image_url);
    }
  }
  return images;
}

function buildCoverageInstruction(targetRaw: string | number | undefined) {
  const target = Number(targetRaw);
  if (!Number.isFinite(target)) return "Keep product framing naturally balanced in frame.";
  if (target >= 70) {
    return `Coverage target ${target}%: product must remain dominant, use tighter framing and near-camera distance with reduced empty background.`;
  }
  if (target <= 35) {
    return `Coverage target ${target}%: product should stay smaller with more contextual environment and a farther camera distance.`;
  }
  return `Coverage target ${target}%: keep balanced prominence with controlled surrounding context.`;
}

function parseReferenceSummary(raw: string, model: string): ReferenceSummary {
  try {
    const text = raw.trim();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as Partial<ReferenceSummary>;
      return {
        model,
        structureHint: parsed.structureHint || "Keep reference composition rhythm as optional guidance only.",
        styleHint: parsed.styleHint || "Use reference visual tone as optional style guidance.",
        sceneHint: parsed.sceneHint || "Keep environment and lighting coherent with the requested scene.",
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
        rawText: raw,
      };
    }
  } catch {
    // fall through to fallback object
  }
  return {
    model,
    structureHint: "Use reference composition as soft guidance and keep product as the final priority.",
    styleHint: "Use reference color/lighting as style guidance only.",
    sceneHint: "Keep scene realism and product clarity balanced.",
    warnings: ["Reference model did not return strict JSON. Fallback parsing was applied."],
    rawText: raw,
  };
}

async function runReferenceAnalysis(params: {
  apiKey: string;
  model: string;
  referenceImage: { mimeType: string; data: string };
  locale: "en" | "zh";
}) {
  const prompt = params.locale === "zh"
    ? "请分析参考图，仅输出 JSON 对象。字段必须包含：structureHint、styleHint、sceneHint、warnings（数组）。参考图只用于风格/构图指导，不用于定义产品身份。"
    : "Analyze the reference image and output JSON only with fields: structureHint, styleHint, sceneHint, warnings (array). Reference image is style/composition guidance only, not product identity.";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${params.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: params.referenceImage.mimeType, data: params.referenceImage.data } },
        ],
      }],
    }),
  });
  const json = (await res.json()) as GeminiResponse;
  if (!res.ok) {
    throw new Error(json?.error?.message || "Reference analysis request failed.");
  }
  const text = extractGeminiText(json);
  return parseReferenceSummary(text, params.model);
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

  const baseParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: body.prompt }];

  if (primaryImage) {
    baseParts.push({ text: "Primary product image:" });
    baseParts.push({ inlineData: { mimeType: primaryImage.mimeType, data: primaryImage.data } });
  }

  if (multiSourceImages.length) {
    baseParts.push({
      text: `Additional source images (${multiSourceImages.length}) for composition guidance. These images all belong to the SAME product. Combine all of them as one consistent product identity and output ONE composed final result per variation. Do not output a collage, split panel, or multiple products.`,
    });
    for (const item of multiSourceImages) {
      baseParts.push({ text: `Source image: ${item.name}` });
      baseParts.push({ inlineData: { mimeType: item.parsed!.mimeType, data: item.parsed!.data } });
    }
  }

  const model = body.model || "gemini-3.1-flash-image-preview";
  const referenceAnalysisModel = body.referenceAnalysisModel || model;
  let referenceSummary: ReferenceSummary | null = null;
  const chainWarnings: string[] = [];
  if (referenceImage) {
    try {
      referenceSummary = await runReferenceAnalysis({
        apiKey,
        model: referenceAnalysisModel,
        referenceImage,
        locale: body.locale || "en",
      });
    } catch (error) {
      chainWarnings.push(error instanceof Error ? error.message : "Reference analysis chain failed.");
    }
    baseParts.push({ text: "Reference image for optional structure/style guidance only:" });
    baseParts.push({ inlineData: { mimeType: referenceImage.mimeType, data: referenceImage.data } });
    if (referenceSummary) {
      baseParts.push({
        text: `Reference analysis summary (style/composition only): structure=${referenceSummary.structureHint}; style=${referenceSummary.styleHint}; scene=${referenceSummary.sceneHint}.`,
      });
    }
  }

  baseParts.push({ text: buildCoverageInstruction(body.productFrameCoverageTarget) });
  baseParts.push({
    text: "Hard rule: output exactly one final composed result image for each variation. Never return collage panels, split-screen, or multiple alternatives in one variation.",
  });

  const count = Math.max(1, Math.min(8, Number(body.generationCount || 1)));
  const images: string[] = [];
  const texts: string[] = [];
  const raws: GeminiResponse[] = [];
  const warnings: string[] = [...chainWarnings];
  const variationLog: VariationLog[] = [];
  const blockingIssues: BlockingIssue[] = [];

  for (let i = 0; i < count; i++) {
    let pickedImage: string | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const parts = [
        ...baseParts,
        {
          text:
            attempt === 1
              ? `Variation ${i + 1} of ${count}. Strict output contract: return exactly ONE final composed image only.`
              : `Variation ${i + 1} retry ${attempt}. Previous output violated contract. Return exactly ONE final composed image only, no extra images, no collage.`,
        },
      ];
      const contents = [{ role: "user", parts }];
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
      });
      const json = (await res.json()) as GeminiResponse;
      if (!res.ok) {
        throw new Error(json?.error?.message || "Gemini request failed.");
      }
      raws.push(json);
      const variationImages = extractGeminiImages(json);
      const txt = extractGeminiText(json);
      const accepted = variationImages.length === 1;
      variationLog.push({
        variation: i + 1,
        attempt,
        imageCount: variationImages.length,
        textLength: txt.length,
        accepted,
        reason: accepted ? undefined : variationImages.length > 1 ? "multiple_images_returned" : "no_image_returned",
      });
      if (txt) texts.push(txt);
      if (variationImages.length > 1 && attempt < 3) {
        warnings.push(`Variation ${i + 1} attempt ${attempt} returned ${variationImages.length} images. Retrying to enforce one-image contract.`);
      }
      if (variationImages.length === 0 && attempt < 3) {
        warnings.push(`Variation ${i + 1} attempt ${attempt} returned no image. Retrying.`);
      }
      if (accepted) {
        pickedImage = variationImages[0];
        break;
      }
    }
    if (pickedImage) {
      images.push(pickedImage);
    } else {
      blockingIssues.push({
        code: "variation_failed_image_contract",
        message: `Variation ${i + 1} failed to return exactly one image after retries.`,
      });
    }
  }

  if (images.length !== count) {
    blockingIssues.push({
      code: "result_count_mismatch",
      message: `Requested ${count} result(s) but accepted ${images.length}.`,
    });
  }

  const text = texts.join("\n\n") || (images.length ? `Image generation response received (${images.length}/${count}).` : "Gemini response received.");
  return {
    provider: "gemini",
    model,
    referenceAnalysisModel,
    requestedCount: count,
    text,
    images,
    raw: raws,
    warnings,
    variationLog,
    blockingIssues,
    referenceSummary,
  };
}

async function callOpenAI(body: Body) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const model = body.model || "gpt-4.1-mini";
  const content: Array<{ type: "input_text"; text: string } | { type: "input_image"; image_url: string }> = [{ type: "input_text", text: body.prompt }];
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
  const outputText = (json?.output || []).flatMap((item: { content?: Array<{ text?: string }> }) => item.content || []).map((part: { text?: string }) => part.text).filter(Boolean).join("\n") || "OpenAI response received.";
  const images = extractOpenAIImages(json);
  const requestedCount = Math.max(1, Math.min(8, Number(body.generationCount || 1)));
  const blockingIssues: BlockingIssue[] = [];
  if (!images.length) {
    blockingIssues.push({
      code: "no_image_payload",
      message: "OpenAI response did not include image payload for this route.",
    });
  }
  if (images.length && images.length !== requestedCount) {
    blockingIssues.push({
      code: "result_count_mismatch",
      message: `Requested ${requestedCount} result(s) but received ${images.length}.`,
    });
  }
  return { provider: "openai", model, requestedCount, text: outputText, images, raw: json, blockingIssues };
}

export async function POST(req: NextRequest) {
  const requestId = `gen_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    const body = (await req.json()) as Body;
    const validation = validateGenerationInput(body);
    if (!validation.ok) {
      return NextResponse.json(
        { error: "Generation input validation failed.", requestId, details: validation.issues },
        { status: 400 },
      );
    }
    const configured = getAvailableProviders();
    if (body.provider === "gemini") {
      if (!configured.gemini) return NextResponse.json({ error: "Gemini is not configured on the server." }, { status: 400 });
      const result = await callGemini(body);
      const debug = {
        requestId,
        provider: "gemini",
        requestedCount: result.requestedCount,
        returnedCount: result.images?.length || 0,
        warnings: result.warnings || [],
        variationLog: result.variationLog || [],
        referenceAnalysis: result.referenceSummary || null,
        inputSummary: {
          sourceImageCount: body.sourceImages?.length || 0,
          hasReferenceImage: Boolean(body.useReferenceImage && body.referenceImageDataUrl),
          coverageTarget: body.productFrameCoverageTarget ?? null,
        },
        outputValidation: {
          blockingIssues: result.blockingIssues || [],
        },
      };
      if (result.blockingIssues.length) {
        return NextResponse.json(
          {
            error: "Generation output validation failed.",
            requestId,
            details: result.blockingIssues,
            debug,
          },
          { status: 422 },
        );
      }
      return NextResponse.json({
        ...result,
        debug,
      });
    }
    if (body.provider === "openai") {
      if (!configured.openai) return NextResponse.json({ error: "OpenAI is not configured on the server." }, { status: 400 });
      const result = await callOpenAI(body);
      const debug = {
        requestId,
        provider: "openai",
        requestedCount: result.requestedCount,
        returnedCount: result.images?.length || 0,
        warnings: result.images?.length ? [] : ["Current OpenAI path returned no direct image payload."],
        variationLog: [],
        inputSummary: {
          sourceImageCount: body.sourceImages?.length || 0,
          hasReferenceImage: Boolean(body.useReferenceImage && body.referenceImageDataUrl),
          coverageTarget: body.productFrameCoverageTarget ?? null,
        },
        outputValidation: {
          blockingIssues: result.blockingIssues || [],
        },
      };
      if (result.blockingIssues.length) {
        return NextResponse.json(
          {
            error: "Generation output validation failed.",
            requestId,
            details: result.blockingIssues,
            debug,
          },
          { status: 422 },
        );
      }
      return NextResponse.json({
        ...result,
        debug,
      });
    }
    return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error.", requestId },
      { status: 500 },
    );
  }
}
