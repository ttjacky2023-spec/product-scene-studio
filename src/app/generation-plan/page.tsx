"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "../shared.module.css";
import pipelineStyles from "@/components/pipeline.module.css";
import { PipelineToolbar } from "@/components/PipelineToolbar";
import { ImagePreviewCard } from "@/components/ImagePreviewCard";
import { t } from "@/lib/i18n";
import { usePipelineStore } from "@/store/pipeline";

type ProviderStatus = {
  providers: { gemini: boolean; openai: boolean };
  defaultProvider: "gemini" | "openai";
  note: string;
};

type GenerateResult = {
  provider: string;
  model: string;
  text?: string;
  images?: string[];
};

function recommendExecutionMode(views: string, angle: string, strictness: string) {
  if (strictness === "maximum preservation" && views.includes("front only")) return "Mode A — same-angle composited scene";
  if (angle === "significant angle change") return "Mode C — reconstruction-first";
  return "Mode B — slight-angle assisted generation";
}
function recommendStyle(intendedUse: string, sceneTypes: string) {
  if (/Amazon|gallery/i.test(intendedUse)) return "clean ecommerce lifestyle with bright controllable lighting";
  if (/ads|social/i.test(intendedUse)) return "high-contrast marketing lifestyle scene";
  if (/kitchen|home/i.test(sceneTypes)) return "natural home-use lifestyle scene";
  return "minimal premium product scene";
}
function effectiveValue(primary: string, custom: string) {
  return primary === "custom" ? custom : primary;
}
function slugify(input: string) {
  return (input || "generated-image").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "generated-image";
}

export default function GenerationPlanPage() {
  const locale = usePipelineStore((s) => s.locale);
  const text = t(locale);
  const intake = usePipelineStore((s) => s.intake);
  const audit = usePipelineStore((s) => s.audit);
  const referenceAnalysis = usePipelineStore((s) => s.referenceAnalysis);
  const executionMode = recommendExecutionMode(intake.availableViews, intake.angleTolerance, intake.strictness);
  const style = effectiveValue(intake.stylePreference, intake.styleCustom) || recommendStyle(intake.intendedUse, intake.sceneTypes);
  const placement = effectiveValue(intake.placementPreference, intake.placementCustom);
  const aspect = effectiveValue(intake.aspectRatio, intake.aspectRatioCustom);
  const outputSize = effectiveValue(intake.outputSize, intake.outputSizeCustom);
  const rebuildList = audit.filter((x) => /rebuild/i.test(x.action)).map((x) => x.zone).join(", ") || "none";
  const extractList = audit.filter((x) => /extract/i.test(x.action)).map((x) => x.zone).join(", ") || "none";

  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [provider, setProvider] = useState<"gemini" | "openai">("gemini");
  const [model, setModel] = useState("gemini-3.1-flash-image-preview");
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [resultText, setResultText] = useState("");
  const [resultImages, setResultImages] = useState<string[]>([]);
  const [errorText, setErrorText] = useState("");
  const [qualityNotes, setQualityNotes] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/provider-status").then((res) => res.json()).then((json: ProviderStatus) => {
      setStatus(json);
      setProvider(json.defaultProvider);
      setModel(json.defaultProvider === "gemini" ? "gemini-3.1-flash-image-preview" : "gpt-4.1-mini");
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    setModel(provider === "gemini" ? "gemini-3.1-flash-image-preview" : "gpt-4.1-mini");
  }, [provider]);

  const promptSuggestion = useMemo(() => {
    const multiSourceInstruction = intake.sourceImages?.length ? `Use the uploaded ${intake.sourceImages.length} source images as combined product references for one final composition. ` : "";
    const referenceInstruction = intake.useReferenceImage && referenceAnalysis ? `Follow this optional reference image guidance for style and composition only: ${referenceAnalysis.structureHint} ${referenceAnalysis.styleHint} ` : "";
    return `Create a ${intake.sceneTypes || "clean lifestyle"} product image for ${intake.intendedUse || "commerce"}. ${multiSourceInstruction}${referenceInstruction}Keep the product identity consistent. Preserve visible logo, text, and icons. Target aspect ratio ${aspect || "1:1"}. Placement preference: ${placement || "centered"}. Angle tolerance: ${intake.angleTolerance} (${intake.angleDegrees || "not specified"}). Product should occupy about ${intake.productFrameCoverageTarget || "55"}% of the final frame. Execution mode: ${executionMode}. Style: ${style}. Rebuild-sensitive zones: ${rebuildList}. Extract-safe zones: ${extractList}.`;
  }, [intake, executionMode, style, aspect, placement, rebuildList, extractList, referenceAnalysis]);

  const inputSummary = useMemo(() => {
    return [
      { title: "Primary product", value: intake.imageName || "Not uploaded" },
      { title: "Source bundle", value: `${intake.sourceImages?.length || 0} image(s)` },
      { title: "Reference image", value: intake.useReferenceImage ? (intake.referenceImageName || "Enabled but not uploaded") : "Disabled" },
      { title: "Aspect ratio", value: aspect || "—" },
      { title: "Output size", value: outputSize || "—" },
      { title: "Placement", value: placement || "—" },
      { title: "Style", value: style || "—" },
      { title: "Coverage target", value: `${intake.productFrameCoverageTarget || "—"}%` },
      { title: "Angle", value: `${intake.angleTolerance} / ${intake.angleDegrees || "—"}` },
    ];
  }, [intake, aspect, outputSize, placement, style]);

  const downloadImage = (dataUrl: string, index: number) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${slugify(intake.imageName || intake.sceneTypes || 'generated-image')}-${index + 1}.png`;
    a.click();
  };
  const downloadAll = () => {
    resultImages.forEach((src, index) => setTimeout(() => downloadImage(src, index), index * 180));
  };

  const runGenerate = async () => {
    setRunning(true); setErrorText(""); setResultText(""); setResultImages([]); setQualityNotes([]);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model,
          prompt: prompt || promptSuggestion,
          imageDataUrl: intake.imageDataUrl,
          referenceImageDataUrl: intake.referenceImageDataUrl,
          useReferenceImage: intake.useReferenceImage,
          sourceImages: intake.sourceImages,
          aspectRatio: aspect,
          outputSize,
        }),
      });
      const json: GenerateResult & { error?: string } = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed.");
      setResultText(json.text || "");
      setResultImages(json.images || []);

      const notes: string[] = [];
      if ((json.images || []).length) notes.push(`Returned ${json.images!.length} image result(s).`);
      else notes.push("No image payload returned; provider responded with text only.");
      if (provider === "gemini" && model === "gemini-3-flash-preview") notes.push("This Gemini model often returns planning/text rather than direct image output. Prefer gemini-3.1-flash-image-preview for image generation.");
      if (intake.sourceImages?.length) notes.push(`Used ${intake.sourceImages.length} source image(s) as true multimodal inputs.`);
      if (intake.useReferenceImage) notes.push("Reference image was included as a true multimodal input.");
      setQualityNotes(notes);
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className={styles.page}>
      <PipelineToolbar />
      <div className={styles.header}><h1>{locale === "en" ? "Generation Plan" : "生成计划"}</h1><p>{locale === "en" ? "V10 adds input-summary visualization, stronger result checks, and better download handling." : "V10 增加了输入摘要可视化、结果质量检查与更好的下载体验。"}</p></div>
      <section className={styles.card}><ImagePreviewCard /></section>

      <section className={styles.card}>
        <h2>{locale === "en" ? "Generation input summary" : "生成输入摘要"}</h2>
        <div className={pipelineStyles.summaryGrid}>
          <div className={pipelineStyles.summaryCard}>
            <h4>Primary image</h4>
            {intake.imageDataUrl ? <img src={intake.imageDataUrl} alt="Primary" className={pipelineStyles.miniImage} /> : <p className={styles.tip}>Not uploaded</p>}
          </div>
          <div className={pipelineStyles.summaryCard}>
            <h4>Reference image</h4>
            {intake.useReferenceImage && intake.referenceImageDataUrl ? <img src={intake.referenceImageDataUrl} alt="Reference" className={pipelineStyles.miniImage} /> : <p className={styles.tip}>Disabled or not uploaded</p>}
          </div>
          <div className={pipelineStyles.summaryCard}>
            <h4>Source bundle</h4>
            {intake.sourceImages?.length ? <div className={pipelineStyles.chips}>{intake.sourceImages.map((img) => <span key={img.name} className={pipelineStyles.chip}>{img.name}</span>)}</div> : <p className={styles.tip}>No extra source images</p>}
          </div>
        </div>
        <div className={pipelineStyles.analysisGrid} style={{ marginTop: 16 }}>
          {inputSummary.map((item) => <div key={item.title} className={pipelineStyles.analysisCard}><h3>{item.title}</h3><p className={styles.tip}>{item.value}</p></div>)}
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.card}><h2>{locale === "en" ? "Recommended plan" : "推荐计划"}</h2><ul className={styles.list}><li><strong>Execution mode:</strong> {executionMode}</li><li><strong>Style:</strong> {style}</li><li><strong>Extract zones:</strong> {extractList}</li><li><strong>Rebuild zones:</strong> {rebuildList}</li><li><strong>Aspect ratio:</strong> {aspect}</li><li><strong>Output size:</strong> {outputSize}</li><li><strong>Placement:</strong> {placement}</li><li><strong>Target product coverage:</strong> {intake.productFrameCoverageTarget}%</li><li><strong>Reference image:</strong> {intake.useReferenceImage ? "enabled" : "disabled"}</li><li><strong>Multi-source images:</strong> {intake.sourceImages?.length || 0}</li></ul></section>
        <section className={styles.card}><h2>{locale === "en" ? "Provider status" : "Provider 状态"}</h2><div className={pipelineStyles.chips}><span className={pipelineStyles.chip}>Gemini: {status?.providers.gemini ? "configured" : "not configured"}</span><span className={pipelineStyles.chip}>OpenAI: {status?.providers.openai ? "configured" : "not configured"}</span></div><p className={styles.tip}>{locale === "en" ? "Keys are read from server environment variables only." : "密钥只从服务端环境变量读取。"}</p></section>
      </div>

      <section className={styles.card}>
        <h2>{locale === "en" ? "Run generation" : "执行生成"}</h2>
        <div className={styles.formGrid}>
          <div><label>Provider</label><select value={provider} onChange={(e) => setProvider(e.target.value as "gemini" | "openai")}><option value="gemini">Gemini</option><option value="openai">OpenAI</option></select></div>
          <div><label>Model</label><select value={model} onChange={(e) => setModel(e.target.value)}>{provider === 'gemini' ? <><option value="gemini-3.1-flash-image-preview">gemini-3.1-flash-image-preview</option><option value="gemini-3-flash-preview">gemini-3-flash-preview</option><option value="gemini-3-pro-image-preview">gemini-3-pro-image-preview</option></> : <option value="gpt-4.1-mini">gpt-4.1-mini</option>}</select></div>
          <div style={{ gridColumn: "1 / -1" }}><label>Prompt</label><textarea className={pipelineStyles.textarea} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={promptSuggestion} /></div>
        </div>
        <div className={pipelineStyles.actions} style={{ marginTop: 16 }}>
          <button className={pipelineStyles.button} onClick={runGenerate} disabled={running}>{running ? "Running…" : "Generate"}</button>
          {resultImages.length ? <button className={`${pipelineStyles.button} ${pipelineStyles.secondary}`} onClick={downloadAll}>Download all</button> : null}
        </div>
        {errorText ? <p className={`${styles.tip} ${pipelineStyles.statusBad}`} style={{ marginTop: 12 }}>{errorText}</p> : null}
      </section>

      <section className={styles.card}>
        <h2>{locale === "en" ? "Result quality control" : "结果质量控制"}</h2>
        {qualityNotes.length ? <ul className={styles.list}>{qualityNotes.map((note) => <li key={note}>{note}</li>)}</ul> : <p className={`${styles.tip} ${pipelineStyles.statusWarn}`}>No quality notes yet. Run generation first.</p>}
      </section>

      <section className={styles.card}>
        <h2>{locale === "en" ? "Result" : "结果"}</h2>
        {resultImages.length ? <div className={pipelineStyles.analysisGrid}>{resultImages.map((src, index) => <div key={src.slice(0, 80) + index} className={pipelineStyles.analysisCard}><img src={src} alt={`Generated ${index + 1}`} className={pipelineStyles.preview} /><div className={pipelineStyles.actions} style={{ marginTop: 12 }}><button className={pipelineStyles.button} onClick={() => downloadImage(src, index)}>Download</button></div></div>)}</div> : null}
        <pre className={pipelineStyles.code}>{resultText || (locale === "en" ? "No generation result yet." : "还没有生成结果。")}</pre>
      </section>
    </div>
  );
}
