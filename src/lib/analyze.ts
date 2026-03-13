export type ImageAnalysis = {
  width: number;
  height: number;
  orientation: "square" | "portrait" | "landscape";
  estimatedCoverage: number;
  backgroundTone: "light" | "dark" | "mixed";
  suggestedAspectRatios: string[];
  suggestedOutputSizes: string[];
  suggestedIntendedUses: string[];
  suggestedSceneTypes: string[];
  suggestedStyle: string;
  suggestedAngleTolerance: "same angle only" | "slight angle shift";
  notes: string[];
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function analyzeImageDataUrl(dataUrl: string): Promise<ImageAnalysis> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas context unavailable");

  const sampleWidth = 240;
  const ratio = img.height / img.width;
  canvas.width = sampleWidth;
  canvas.height = Math.max(1, Math.round(sampleWidth * ratio));
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];

  let r = 0, g = 0, b = 0;
  corners.forEach(([x, y]) => {
    const idx = (y * width + x) * 4;
    r += data[idx];
    g += data[idx + 1];
    b += data[idx + 2];
  });
  const bg = { r: r / 4, g: g / 4, b: b / 4 };
  const bgBrightness = (bg.r + bg.g + bg.b) / 3;
  const backgroundTone = bgBrightness > 205 ? "light" : bgBrightness < 70 ? "dark" : "mixed";

  const threshold = 34;
  let minX = width, minY = height, maxX = 0, maxY = 0, foregroundCount = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dr = Math.abs(data[idx] - bg.r);
      const dg = Math.abs(data[idx + 1] - bg.g);
      const db = Math.abs(data[idx + 2] - bg.b);
      if (dr + dg + db > threshold) {
        foregroundCount++;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  const estimatedCoverage = foregroundCount
    ? clamp(Math.round((foregroundCount / (width * height)) * 100), 1, 99)
    : 0;

  const orientation: ImageAnalysis["orientation"] =
    img.width === img.height ? "square" : img.width > img.height ? "landscape" : "portrait";

  const suggestedAspectRatios =
    orientation === "square" ? ["1:1", "4:5", "3:4"] :
    orientation === "portrait" ? ["4:5", "3:4", "1:1"] : ["16:9", "4:5", "1:1"];

  const suggestedOutputSizes =
    orientation === "square" ? ["2000 x 2000", "1600 x 1600", "2500 x 2500"] :
    orientation === "portrait" ? ["2000 x 2500", "1800 x 2400", "1500 x 2000"] : ["1920 x 1080", "2400 x 1350", "1600 x 900"];

  const suggestedIntendedUses =
    orientation === "landscape" ? ["Ads", "Social", "A+ / PDP"] : ["Amazon gallery", "A+ / PDP", "Social"];

  const suggestedSceneTypes =
    backgroundTone === "light"
      ? ["minimal tabletop", "soft lifestyle setup", "bright studio scene"]
      : ["premium dark studio", "high-contrast product setup", "dramatic shelf scene"];

  const suggestedStyle =
    backgroundTone === "light"
      ? "clean ecommerce lifestyle with bright controllable lighting"
      : "premium contrast-forward studio scene with controlled highlights";

  const suggestedAngleTolerance = estimatedCoverage > 55 ? "slight angle shift" : "same angle only";

  const notes = [
    `Detected ${img.width}×${img.height} ${orientation} image.`,
    `Estimated product coverage is about ${estimatedCoverage}% of the frame.`,
    backgroundTone === "light"
      ? "Corners suggest a light background, which is good for extraction and compositing."
      : backgroundTone === "dark"
        ? "Corners suggest a dark background; review edge separation before extraction."
        : "Background tone appears mixed; manual review of product edges is recommended.",
    estimatedCoverage < 35
      ? "Product appears relatively small in frame; preservation-first mode is recommended."
      : "Product occupies enough area for stronger extraction or slight-angle workflows.",
  ];

  return {
    width: img.width,
    height: img.height,
    orientation,
    estimatedCoverage,
    backgroundTone,
    suggestedAspectRatios,
    suggestedOutputSizes,
    suggestedIntendedUses,
    suggestedSceneTypes,
    suggestedStyle,
    suggestedAngleTolerance,
    notes,
  };
}
