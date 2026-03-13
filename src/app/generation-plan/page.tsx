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
function buildReport(intake: ReturnType<typeof usePipelineStore.getState>["intake"], extractList: string, rebuildList: string, executionMode: string, style: string) {
  return `# Product Scene Generation Report\n\n## Intake\n- Image: ${intake.imageName || "—"}\n- Resolution: ${intake.sourceResolution || "—"}\n- Ratio: ${intake.aspectRatio || "—"}\n- Output: ${intake.outputSize || "—"}\n- Count: ${intake.generationCount || "—"}\n- Use: ${intake.intendedUse || "—"}\n- Scene types: ${intake.sceneTypes || "—"}\n- Placement: ${intake.placementPreference || "—"}\n- Angle tolerance: ${intake.angleTolerance || "—"}\n- Strictness: ${intake.strictness || "—"}\n\n## Plan\n- Execution mode: ${executionMode}\n- Style: ${style}\n- Extract zones: ${extractList}\n- Rebuild zones: ${rebuildList}\n`;
}

export default function GenerationPlanPage() {
  const locale = usePipelineStore((s) => s.locale);
  const text = t(locale);
  const intake = usePipelineStore((s) => s.intake);
  const audit = usePipelineStore((s) => s.audit);
  const executionMode = recommendExecutionMode(intake.availableViews, intake.angleTolerance, intake.strictness);
  const style = recommendStyle(intake.intendedUse, intake.sceneTypes);
  const rebuildList = audit.filter((x) => /rebuild/i.test(x.action)).map((x) => x.zone).join(", ") || "none";
  const extractList = audit.filter((x) => /extract/i.test(x.action)).map((x) => x.zone).join(", ") || "none";
  const report = buildReport(intake, extractList, rebuildList, executionMode, style);

  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [provider, setProvider] = useState<"gemini" | "openai">("gemini");
  const [model, setModel] = useState("gemini-2.0-flash-exp");
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [resultText, setResultText] = useState("");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    fetch("/api/provider-status")
      .then((res) => res.json())
      .then((json: ProviderStatus) => {
        setStatus(json);
        setProvider(json.defaultProvider);
        setModel(json.defaultProvider === "gemini" ? "gemini-3-flash-preview" : "gpt-4.1-mini");
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setModel(provider === "gemini" ? "gemini-3-flash-preview" : "gpt-4.1-mini");
  }, [provider]);

  const promptSuggestion = useMemo(() => {
    return `Create a ${intake.sceneTypes || "clean lifestyle"} product image for ${intake.intendedUse || "commerce"}. Keep the product identity consistent. Preserve visible logo, text, and icons. Target aspect ratio ${intake.aspectRatio || "1:1"}. Placement preference: ${intake.placementPreference || "centered"}. Execution mode: ${executionMode}. Style: ${style}.`; 
  }, [intake, executionMode, style]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ intake, audit, executionMode, style, extractList, rebuildList }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "product-scene-plan.json"; a.click(); URL.revokeObjectURL(url);
  };
  const exportReport = () => {
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "product-scene-report.md"; a.click(); URL.revokeObjectURL(url);
  };
  const runGenerate = async () => {
    setRunning(true); setErrorText(""); setResultText("");
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model,
          prompt: prompt || promptSuggestion,
          imageDataUrl: intake.imageDataUrl,
          aspectRatio: intake.aspectRatio,
          outputSize: intake.outputSize,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed.");
      setResultText(json.text || JSON.stringify(json, null, 2));
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className={styles.page}>
      <PipelineToolbar />
      <div className={styles.header}><h1>{locale === "en" ? "Generation Plan" : "生成计划"}</h1><p>{locale === "en" ? "Plan output strategy and run provider-backed generation from the web." : "在网页里制定计划，并直接调用 provider 接口执行生成。"}</p></div>
      <section className={styles.card}><ImagePreviewCard /></section>
      <div className={styles.grid}>
        <section className={styles.card}><h2>{locale === "en" ? "Recommended plan" : "推荐计划"}</h2><ul className={styles.list}><li><strong>Execution mode:</strong> {executionMode}</li><li><strong>Style:</strong> {style}</li><li><strong>Extract zones:</strong> {extractList}</li><li><strong>Rebuild zones:</strong> {rebuildList}</li><li><strong>Output target:</strong> {intake.generationCount || "—"} image(s) at {intake.outputSize || "—"}</li></ul></section>
        <section className={styles.card}><h2>{locale === "en" ? "Provider status" : "Provider 状态"}</h2>
          <div className={pipelineStyles.chips}>
            <span className={pipelineStyles.chip}>Gemini: {status?.providers.gemini ? "configured" : "not configured"}</span>
            <span className={pipelineStyles.chip}>OpenAI: {status?.providers.openai ? "configured" : "not configured"}</span>
          </div>
          <p className={styles.tip}>{locale === "en" ? "Keys are read from server environment variables only. No persistent secret input is exposed in the public frontend." : "密钥只从服务端环境变量读取，不在公开前端持久化暴露。"}</p>
        </section>
      </div>
      <section className={styles.card}>
        <h2>{locale === "en" ? "Run generation" : "执行生成"}</h2>
        <div className={styles.formGrid}>
          <div><label>Provider</label><select value={provider} onChange={(e) => setProvider(e.target.value as "gemini" | "openai")}><option value="gemini">Gemini</option><option value="openai">OpenAI</option></select></div>
          <div><label>Model</label><input value={model} onChange={(e) => setModel(e.target.value)} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label>Prompt</label><textarea className={pipelineStyles.textarea} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={promptSuggestion} /></div>
        </div>
        <div className={pipelineStyles.actions} style={{ marginTop: 16 }}>
          <button className={pipelineStyles.button} onClick={runGenerate} disabled={running}>{running ? "Running…" : "Generate"}</button>
          <button className={`${pipelineStyles.button} ${pipelineStyles.secondary}`} onClick={exportJson}>{text.common.exportJson}</button>
          <button className={`${pipelineStyles.button} ${pipelineStyles.secondary}`} onClick={exportReport}>{text.common.exportReport}</button>
        </div>
        {errorText ? <p className={styles.tip} style={{ color: "#b91c1c", marginTop: 12 }}>{errorText}</p> : null}
      </section>
      <section className={styles.card}><h2>{locale === "en" ? "Result" : "结果"}</h2><pre className={pipelineStyles.code}>{resultText || (locale === "en" ? "No generation result yet." : "还没有生成结果。")}</pre></section>
    </div>
  );
}
