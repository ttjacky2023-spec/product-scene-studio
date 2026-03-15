export const MAX_SOURCE_IMAGES = 4;
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const MIN_COVERAGE_TARGET = 15;
export const MAX_COVERAGE_TARGET = 85;
export const MIN_IMAGE_EDGE_PX = 128;
export const MAX_IMAGE_EDGE_PX = 12000;
export const SUPPORTED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export type ValidationIssue = {
  code: string;
  message: string;
};

function parseDataUrl(dataUrl?: string) {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function parseResolution(resolution?: string) {
  if (!resolution?.trim()) return null;
  const match = resolution.trim().match(/^(\d{2,5})\s*[xX]\s*(\d{2,5})$/);
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2]) };
}

function createImageFingerprint(parsed: { mimeType: string; data: string }) {
  const head = parsed.data.slice(0, 96);
  const tail = parsed.data.slice(-96);
  return `${parsed.mimeType}|${parsed.data.length}|${head}|${tail}`;
}

function estimateBytesFromBase64(base64: string) {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function validateImageDataUrl(dataUrl: string | undefined, field: string, required: boolean) {
  const issues: ValidationIssue[] = [];
  if (!dataUrl) {
    if (required) issues.push({ code: `${field}_required`, message: `${field} is required.` });
    return { issues, parsed: null as ReturnType<typeof parseDataUrl> };
  }
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    issues.push({ code: `${field}_invalid_data_url`, message: `${field} must be a valid base64 data URL.` });
    return { issues, parsed: null as ReturnType<typeof parseDataUrl> };
  }
  if (!parsed.mimeType.startsWith("image/")) {
    issues.push({ code: `${field}_not_image`, message: `${field} must be an image data URL.` });
  }
  if (!SUPPORTED_IMAGE_MIME_TYPES.includes(parsed.mimeType as typeof SUPPORTED_IMAGE_MIME_TYPES[number])) {
    issues.push({
      code: `${field}_unsupported_mime`,
      message: `${field} must use one of: ${SUPPORTED_IMAGE_MIME_TYPES.join(", ")}.`,
    });
  }
  const byteSize = estimateBytesFromBase64(parsed.data);
  if (byteSize > MAX_IMAGE_BYTES) {
    issues.push({ code: `${field}_too_large`, message: `${field} exceeds the ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB limit.` });
  }
  return { issues, parsed };
}

type SourceImageInput = { name: string; dataUrl: string; resolution?: string };

function validateSourceImages(sourceImages: SourceImageInput[] | undefined) {
  const issues: ValidationIssue[] = [];
  const parsedMap = new Map<number, ReturnType<typeof parseDataUrl>>();
  if (!sourceImages?.length) return { issues, parsedMap };
  if (sourceImages.length > MAX_SOURCE_IMAGES) {
    issues.push({ code: "source_images_too_many", message: `At most ${MAX_SOURCE_IMAGES} source images are allowed.` });
  }
  const seenDataFingerprint = new Set<string>();
  const seenNames = new Set<string>();
  sourceImages.slice(0, MAX_SOURCE_IMAGES).forEach((img, index) => {
    const normalizedName = img.name?.trim().toLowerCase();
    if (!normalizedName) {
      issues.push({ code: "source_image_name_required", message: `sourceImages[${index}].name is required.` });
    } else if (seenNames.has(normalizedName)) {
      issues.push({
        code: "source_images_duplicate_name",
        message: `sourceImages[${index}] duplicates file name "${img.name}".`,
      });
    }
    seenNames.add(normalizedName || `__empty_${index}`);

    const imageValidation = validateImageDataUrl(img.dataUrl, `sourceImages[${index}]`, true);
    issues.push(...imageValidation.issues);
    if (imageValidation.parsed) {
      parsedMap.set(index, imageValidation.parsed);
      const fingerprint = createImageFingerprint(imageValidation.parsed);
      if (seenDataFingerprint.has(fingerprint)) {
        issues.push({ code: "source_images_duplicate", message: "Duplicate source images detected. Upload distinct images only." });
      }
      seenDataFingerprint.add(fingerprint);
    }

    const parsedResolution = parseResolution(img.resolution);
    if (img.resolution?.trim() && !parsedResolution) {
      issues.push({
        code: "source_image_resolution_invalid",
        message: `sourceImages[${index}].resolution must use format "<width> x <height>".`,
      });
    }
    if (parsedResolution && (
      parsedResolution.width < MIN_IMAGE_EDGE_PX ||
      parsedResolution.height < MIN_IMAGE_EDGE_PX ||
      parsedResolution.width > MAX_IMAGE_EDGE_PX ||
      parsedResolution.height > MAX_IMAGE_EDGE_PX
    )) {
      issues.push({
        code: "source_image_resolution_out_of_range",
        message: `sourceImages[${index}].resolution must stay within ${MIN_IMAGE_EDGE_PX}-${MAX_IMAGE_EDGE_PX}px per edge.`,
      });
    }
  });
  return { issues, parsedMap };
}

export function validateGenerationInput(input: {
  prompt?: string;
  imageDataUrl?: string;
  referenceImageDataUrl?: string;
  useReferenceImage?: boolean;
  sourceImages?: SourceImageInput[];
  generationCount?: number;
  productFrameCoverageTarget?: string | number;
}) {
  const issues: ValidationIssue[] = [];
  const fingerprintOwners = new Map<string, string>();

  const registerFingerprint = (owner: string, parsed: ReturnType<typeof parseDataUrl>) => {
    if (!parsed) return;
    const key = createImageFingerprint(parsed);
    const existing = fingerprintOwners.get(key);
    if (existing) {
      issues.push({
        code: "cross_image_duplicate",
        message: `${owner} duplicates ${existing}. Use distinct images for each role.`,
      });
      return;
    }
    fingerprintOwners.set(key, owner);
  };

  if (!input.prompt?.trim()) {
    issues.push({ code: "prompt_required", message: "Prompt is required." });
  }
  const primaryValidation = validateImageDataUrl(input.imageDataUrl, "primary_image", true);
  issues.push(...primaryValidation.issues);
  registerFingerprint("primary_image", primaryValidation.parsed);

  const sourceValidation = validateSourceImages(input.sourceImages);
  issues.push(...sourceValidation.issues);
  sourceValidation.parsedMap.forEach((parsed, index) => registerFingerprint(`sourceImages[${index}]`, parsed));

  if (input.useReferenceImage) {
    const referenceValidation = validateImageDataUrl(input.referenceImageDataUrl, "reference_image", true);
    issues.push(...referenceValidation.issues);
    registerFingerprint("reference_image", referenceValidation.parsed);
  }

  const generationCount = Number(input.generationCount ?? 1);
  if (!Number.isInteger(generationCount) || generationCount < 1 || generationCount > 8) {
    issues.push({ code: "generation_count_invalid", message: "generationCount must be an integer between 1 and 8." });
  }

  if (input.productFrameCoverageTarget !== undefined && `${input.productFrameCoverageTarget}`.trim()) {
    const target = Number(input.productFrameCoverageTarget);
    if (!Number.isFinite(target)) {
      issues.push({ code: "coverage_target_invalid", message: "productFrameCoverageTarget must be a number." });
    } else if (target < MIN_COVERAGE_TARGET || target > MAX_COVERAGE_TARGET) {
      issues.push({
        code: "coverage_target_out_of_range",
        message: `productFrameCoverageTarget should be between ${MIN_COVERAGE_TARGET} and ${MAX_COVERAGE_TARGET}.`,
      });
    }
  }

  return { ok: issues.length === 0, issues };
}
