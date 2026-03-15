"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "../shared.module.css";
import pipelineStyles from "@/components/pipeline.module.css";
import { PipelineToolbar } from "@/components/PipelineToolbar";
import { ImagePreviewCard } from "@/components/ImagePreviewCard";
import { MAX_COVERAGE_TARGET, MAX_SOURCE_IMAGES, MIN_COVERAGE_TARGET, validateGenerationInput } from "@/lib/generation-validation";
import { usePipelineStore } from "@/store/pipeline";

type ProviderStatus = {
  providers: { gemini: boolean; openai: boolean };
  defaultProvider: "gemini" | "openai";
  note: string;
};

type GenerateResult = {
  provider: string;
  model: string;
  requestedCount?: number;
  text?: string;
  images?: string[];
  debug?: {
    requestId?: string;
    provider?: string;
    requestedCount?: number;
    returnedCount?: number;
    warnings?: string[];
    variationLog?: { variation: number; attempt: number; imageCount: number; textLength: number }[];
  };
  details?: { code: string; message: string }[];
  error?: string;
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

function buildCoverageInstruction(targetRaw: string, locale: "en" | "zh") {
  const target = Number(targetRaw);
  if (!Number.isFinite(target)) {
    return locale === "en"
      ? "Coverage target is not numeric; keep product size naturally balanced in frame."
      : "占比目标不是有效数字；请保持产品在画面中自然均衡。";
  }
  if (target >= 70) {
    return locale === "en"
      ? `Coverage target ${target}%: keep the product dominant with tight framing, minimal empty space, and close camera distance.`
      : `占比目标 ${target}%：让产品成为主视觉，收紧构图、减少空白，并使用更近镜头。`;
  }
  if (target <= 35) {
    return locale === "en"
      ? `Coverage target ${target}%: keep the product visibly smaller, include more environment context, and pull camera distance back.`
      : `占比目标 ${target}%：让产品明显更小，保留更多环境信息，并拉远镜头距离。`;
  }
  return locale === "en"
    ? `Coverage target ${target}%: maintain balanced product prominence with moderate context.`
    : `占比目标 ${target}%：保持中等产品主体感，同时保留适量环境。`;
}

export default function GenerationPlanPage() {
  const locale = usePipelineStore((s) => s.locale);
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
  const [debugText, setDebugText] = useState("");
  const [debugWarnings, setDebugWarnings] = useState<string[]>([]);

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
    const multiSourceInstruction = intake.sourceImages?.length
      ? `Use the uploaded ${intake.sourceImages.length} source images as the same product from different real views/components. Combine them into ONE consistent product identity and return one final composed result per variation. Never output collage panels or multiple product objects. `
      : "";
    const referenceInstruction = intake.useReferenceImage && referenceAnalysis ? `Follow this optional reference image guidance for style and composition only: ${referenceAnalysis.structureHint} ${referenceAnalysis.styleHint} ` : "";
    const coverageInstruction = buildCoverageInstruction(intake.productFrameCoverageTarget || "55", locale);
    return `Create a ${intake.sceneTypes || "clean lifestyle"} product image for ${intake.intendedUse || "commerce"}. ${multiSourceInstruction}${referenceInstruction}Keep the product identity consistent. Preserve visible logo, text, and icons. Target aspect ratio ${aspect || "1:1"}. Placement preference: ${placement || "centered"}. Angle tolerance: ${intake.angleTolerance} (${intake.angleDegrees || "not specified"}). Coverage control: ${coverageInstruction} Execution mode: ${executionMode}. Style: ${style}. Rebuild-sensitive zones: ${rebuildList}. Extract-safe zones: ${extractList}.`;
  }, [intake, executionMode, style, aspect, placement, rebuildList, extractList, referenceAnalysis, locale]);

  const inputSummary = useMemo(() => {
    return [
      { title: locale === "en" ? "Primary product" : "主产品图", value: intake.imageName || (locale === "en" ? "Not uploaded" : "未上传") },
      { title: locale === "en" ? "Source bundle" : "多源图数量", value: `${intake.sourceImages?.length || 0} ${locale === "en" ? "image(s)" : "张"}` },
      { title: locale === "en" ? "Reference image" : "参考图", value: intake.useReferenceImage ? (intake.referenceImageName || (locale === "en" ? "Enabled but not uploaded" : "已启用但未上传")) : (locale === "en" ? "Disabled" : "未启用") },
      { title: locale === "en" ? "Aspect ratio" : "画面比例", value: aspect || "—" },
      { title: locale === "en" ? "Output size" : "输出像素", value: outputSize || "—" },
      { title: locale === "en" ? "Placement" : "摆放方式", value: placement || "—" },
      { title: locale === "en" ? "Style" : "风格", value: style || "—" },
      { title: locale === "en" ? "Coverage target" : "产品目标占比", value: `${intake.productFrameCoverageTarget || "—"}%` },
      { title: locale === "en" ? "Angle" : "产品角度变化", value: `${intake.angleTolerance} / ${intake.angleDegrees || "—"}` },
      { title: locale === "en" ? "Generation count" : "生成数量", value: intake.generationCount || "—" },
    ];
  }, [intake, aspect, outputSize, placement, style, locale]);

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
    setRunning(true); setErrorText(""); setResultText(""); setResultImages([]); setQualityNotes([]); setDebugText(""); setDebugWarnings([]);
    try {
      const validation = validateGenerationInput({
        prompt: prompt || promptSuggestion,
        imageDataUrl: intake.imageDataUrl,
        referenceImageDataUrl: intake.referenceImageDataUrl,
        useReferenceImage: intake.useReferenceImage,
        sourceImages: intake.sourceImages,
        generationCount: Number(intake.generationCount || 1),
        productFrameCoverageTarget: intake.productFrameCoverageTarget,
      });
      if (!validation.ok) {
        const localized = validation.issues.map((issue) => {
          if (issue.code === "primary_image_required") return locale === "en" ? "Primary image is required before generation." : "生成前必须先上传主图。";
          if (issue.code === "source_images_too_many") return locale === "en" ? `Source images cannot exceed ${MAX_SOURCE_IMAGES}.` : `多源图最多只能上传 ${MAX_SOURCE_IMAGES} 张。`;
          if (issue.code === "source_images_duplicate_name") return locale === "en" ? "Duplicate source image names detected; keep each name unique." : "检测到重复多源图文件名，请保证每张图文件名唯一。";
          if (issue.code === "coverage_target_out_of_range") return locale === "en" ? `Coverage target must be ${MIN_COVERAGE_TARGET}-${MAX_COVERAGE_TARGET}.` : `产品目标占比必须在 ${MIN_COVERAGE_TARGET}-${MAX_COVERAGE_TARGET} 之间。`;
          if (issue.code === "generation_count_invalid") return locale === "en" ? "Generation count must be an integer from 1 to 8." : "生成数量必须是 1 到 8 的整数。";
          if (issue.code === "reference_image_required") return locale === "en" ? "Reference image is enabled but not uploaded." : "已启用参考图，但未上传参考图。";
          if (issue.code === "source_images_duplicate") return locale === "en" ? "Duplicate source images detected; upload distinct images." : "检测到重复多源图，请上传不同图片。";
          if (issue.code === "cross_image_duplicate") return locale === "en" ? "Primary/source/reference images must not reuse the same image content." : "主图/多源图/参考图不能使用同一张内容图片。";
          if (issue.code === "source_image_resolution_invalid") return locale === "en" ? "Source image resolution format must be like '2000 x 2000'." : "多源图分辨率格式必须类似“2000 x 2000”。";
          if (issue.code === "source_image_resolution_out_of_range") return locale === "en" ? "Source image resolution is out of supported range." : "多源图分辨率超出支持范围。";
          return locale === "en" ? issue.message : `输入校验失败：${issue.message}`;
        });
        throw new Error(localized.join("\n"));
      }

      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          locale,
          model,
          referenceAnalysisModel: intake.referenceAnalysisModel,
          prompt: prompt || promptSuggestion,
          imageDataUrl: intake.imageDataUrl,
          referenceImageDataUrl: intake.referenceImageDataUrl,
          useReferenceImage: intake.useReferenceImage,
          sourceImages: intake.sourceImages,
          aspectRatio: aspect,
          outputSize,
          generationCount: Number(intake.generationCount || 1),
          productFrameCoverageTarget: intake.productFrameCoverageTarget,
        }),
      });
      const json: GenerateResult = await res.json();
      if (!res.ok) {
        const details = json.details?.map((item) => item.message).join("\n");
        throw new Error([json.error || "Generation failed.", details].filter(Boolean).join("\n"));
      }
      const returnedImages = json.images || [];
      const requestedCount = Number(json.requestedCount || intake.generationCount || 1);
      if (returnedImages.length !== requestedCount) {
        throw new Error(locale === "en"
          ? `Result count mismatch: requested ${requestedCount} but returned ${returnedImages.length}. This run is treated as failed.`
          : `结果数量不符合要求：你要求 ${requestedCount} 张，但只返回 ${returnedImages.length} 张。本次结果已判定为失败。`);
      }
      if (!returnedImages.length) {
        throw new Error(locale === "en"
          ? "No image payload returned. This run is blocked as failed."
          : "未返回任何图片数据，本次结果已阻断并判定失败。");
      }
      setResultText(json.text || "");
      setResultImages(returnedImages);
      setDebugWarnings(json.debug?.warnings || []);
      if (json.debug) {
        setDebugText(JSON.stringify(json.debug, null, 2));
      }

      const notes: string[] = [];
      if (locale === "en") {
        notes.push(`Returned ${returnedImages.length} image result(s).`);
        notes.push(`Requested generation count: ${requestedCount}.`);
        if (provider === "gemini" && model === "gemini-3-flash-preview") notes.push("This Gemini model often returns planning text rather than image payload. Prefer gemini-3.1-flash-image-preview.");
        if (intake.sourceImages?.length) notes.push(`Used ${intake.sourceImages.length} source image(s) as true multimodal inputs for one composed product result per variation.`);
        if (intake.useReferenceImage) notes.push("Reference image input was included for style/composition guidance only.");
        notes.push("Control strength guide: primary image=strong; multi-source=medium to strong; reference image=medium; scene/style/placement=medium; coverage target=weak to medium; angle shift=medium and model-dependent.");
        notes.push(`Coverage target now: ${intake.productFrameCoverageTarget || "not set"}%. It improves framing instruction quality but still requires output validation.`);
      } else {
        notes.push(`实际返回图片：${returnedImages.length} 张。`);
        notes.push(`本次要求生成：${requestedCount} 张。`);
        if (provider === "gemini" && model === "gemini-3-flash-preview") notes.push("当前 Gemini 模型更容易返回规划文字而不是图片，建议优先使用 gemini-3.1-flash-image-preview。");
        if (intake.sourceImages?.length) notes.push(`已将 ${intake.sourceImages.length} 张多源图作为真实多模态输入，并要求每个变体输出 1 张“组合后的单一最终结果”。`);
        if (intake.useReferenceImage) notes.push("参考图已作为多模态输入，仅用于风格/构图引导。");
        notes.push("控制强弱说明：主图=强控制；多源图=中到强控制；参考图=中控制；场景类型/风格/摆放=中控制；产品目标占比=弱到中等控制；角度变化=中等且依赖模型执行能力。");
        notes.push(`当前产品目标占比：${intake.productFrameCoverageTarget || "未填写"}%。该项会加强构图与镜头距离指令，但仍需要结果校验。`);
      }
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
      <div className={styles.header}><h1>{locale === "en" ? "Generation Plan" : "生成计划"}</h1><p>{locale === "en" ? "Review what will be sent to the model, then run generation." : "先确认这次会把什么内容发送给模型，再执行生成。这里也会说明每个关键参数会影响 prompt 的哪一部分。"}</p></div>
      <section className={styles.card}><ImagePreviewCard /></section>

      <section className={styles.card}>
        <h2>{locale === "en" ? "Generation input summary" : "生成输入摘要"}</h2>
        <div className={pipelineStyles.summaryGrid}>
          <div className={pipelineStyles.summaryCard}>
            <h4>{locale === "en" ? "Primary image" : "主图"}</h4>
            {intake.imageDataUrl ? <img src={intake.imageDataUrl} alt="Primary" className={pipelineStyles.miniImage} /> : <p className={styles.tip}>{locale === "en" ? "Not uploaded" : "未上传"}</p>}
          </div>
          <div className={pipelineStyles.summaryCard}>
            <h4>{locale === "en" ? "Reference image" : "参考图"}</h4>
            {intake.useReferenceImage && intake.referenceImageDataUrl ? <img src={intake.referenceImageDataUrl} alt="Reference" className={pipelineStyles.miniImage} /> : <p className={styles.tip}>{locale === "en" ? "Disabled or not uploaded" : "未启用或未上传"}</p>}
          </div>
          <div className={pipelineStyles.summaryCard}>
            <h4>{locale === "en" ? "Source bundle" : "多源图"}</h4>
            {intake.sourceImages?.length ? <div className={pipelineStyles.chips}>{intake.sourceImages.map((img) => <span key={img.name} className={pipelineStyles.chip}>{img.name}</span>)}</div> : <p className={styles.tip}>{locale === "en" ? "No extra source images" : "没有额外多源图"}</p>}
          </div>
        </div>
        <div className={pipelineStyles.analysisGrid} style={{ marginTop: 16 }}>
          {inputSummary.map((item) => <div key={item.title} className={pipelineStyles.analysisCard}><h3>{item.title}</h3><p className={styles.tip}>{item.value}</p></div>)}
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.card}><h2>{locale === "en" ? "Recommended plan" : "推荐计划"}</h2><ul className={styles.list}><li><strong>{locale === "en" ? "Execution mode" : "执行模式"}:</strong> {executionMode}</li><li><strong>{locale === "en" ? "Style" : "风格"}:</strong> {style}</li><li><strong>{locale === "en" ? "Extract zones" : "可提取区域"}:</strong> {extractList}</li><li><strong>{locale === "en" ? "Rebuild zones" : "需重建区域"}:</strong> {rebuildList}</li><li><strong>{locale === "en" ? "Aspect ratio" : "画面比例"}:</strong> {aspect}</li><li><strong>{locale === "en" ? "Output size" : "输出像素"}:</strong> {outputSize}</li><li><strong>{locale === "en" ? "Placement" : "摆放方式"}:</strong> {placement}</li><li><strong>{locale === "en" ? "Target product coverage" : "产品目标占比"}:</strong> {intake.productFrameCoverageTarget}% ({locale === "en" ? `${MIN_COVERAGE_TARGET}-${MAX_COVERAGE_TARGET} recommended` : `建议 ${MIN_COVERAGE_TARGET}-${MAX_COVERAGE_TARGET}`})</li><li><strong>{locale === "en" ? "Coverage guidance" : "占比控制指令"}:</strong> {buildCoverageInstruction(intake.productFrameCoverageTarget || "55", locale)}</li><li><strong>{locale === "en" ? "Reference image" : "参考图"}:</strong> {intake.useReferenceImage ? (locale === "en" ? "enabled" : "已启用") : (locale === "en" ? "disabled" : "未启用")}</li><li><strong>{locale === "en" ? "Multi-source images" : "多源图数量"}:</strong> {intake.sourceImages?.length || 0}</li></ul></section>
        <section className={styles.card}><h2>{locale === "en" ? "Provider status" : "Provider 状态"}</h2><div className={pipelineStyles.chips}><span className={pipelineStyles.chip}>Gemini: {status?.providers.gemini ? (locale === "en" ? "configured" : "已配置") : (locale === "en" ? "not configured" : "未配置")}</span><span className={pipelineStyles.chip}>OpenAI: {status?.providers.openai ? (locale === "en" ? "configured" : "已配置") : (locale === "en" ? "not configured" : "未配置")}</span></div><p className={styles.tip}>{locale === "en" ? "Keys are read from server environment variables only." : "密钥只从服务端环境变量读取。这里不会在前端暴露真实密钥。"}</p></section>
      </div>

      <section className={styles.card}>
        <h2>{locale === "en" ? "How fields affect generation" : "字段如何影响生成"}</h2>
        <ul className={styles.list}>
          <li><strong>{locale === "en" ? "Scene types" : "场景类型"}：</strong>{locale === "en" ? "Controls where the product appears and what environment/props exist." : "决定产品出现在哪里、周围有什么环境和道具。"}</li>
          <li><strong>{locale === "en" ? "Placement" : "摆放方式"}：</strong>{locale === "en" ? "Controls where the product sits in the frame (center, left, in-use, tabletop, etc.)." : "决定产品放在画面的哪个位置，例如居中、靠左、手持、桌面。"}</li>
          <li><strong>{locale === "en" ? "Angle" : "产品角度变化"}：</strong>{locale === "en" ? "Controls how much the product turns relative to the source view." : "决定产品相对原图改变多少角度。"}</li>
          <li><strong>{locale === "en" ? "Coverage target" : "产品目标占比"}：</strong>{locale === "en" ? "Asks the model to change framing and camera distance so the product appears larger or smaller in the final frame. Current control strength is weak-to-medium, so results still need validation." : "要求模型通过构图和镜头距离，让产品在最终画面里更大或更小。目前属于弱到中等控制，结果仍需要验证。"}</li>
          <li><strong>{locale === "en" ? "Reference image" : "参考图"}：</strong>{locale === "en" ? "Mainly affects style/composition, not the product identity itself." : "主要影响风格、构图、氛围，不是主要产品身份来源。"}</li>
          <li><strong>{locale === "en" ? "Source bundle" : "多源图"}：</strong>{locale === "en" ? "Adds extra real views/components so the model can understand more structure." : "补充更多真实视角或部件，帮助模型理解结构。"}</li>
        </ul>
      </section>

      <section className={styles.card}>
        <h2>{locale === "en" ? "Run generation" : "执行生成"}</h2>
        <div className={styles.formGrid}>
          <div><label>{locale === "en" ? "Provider" : "提供方"}</label><select value={provider} onChange={(e) => setProvider(e.target.value as "gemini" | "openai")}><option value="gemini">Gemini</option><option value="openai">OpenAI</option></select><p className={styles.tip}>{locale === "en" ? "Choose which backend model provider handles this generation." : "选择由哪个模型服务来执行这次生成。系统会先做输入校验，不通过就直接阻断请求。"} </p></div>
          <div><label>{locale === "en" ? "Model" : "模型"}</label><select value={model} onChange={(e) => setModel(e.target.value)}>{provider === 'gemini' ? <><option value="gemini-3.1-flash-image-preview">gemini-3.1-flash-image-preview</option><option value="gemini-3-flash-preview">gemini-3-flash-preview</option><option value="gemini-3-pro-image-preview">gemini-3-pro-image-preview</option></> : <option value="gpt-4.1-mini">gpt-4.1-mini</option>}</select><p className={styles.tip}>{locale === "en" ? "For direct image output, prefer gemini-3.1-flash-image-preview." : "如果目标是直接返回图片，优先使用 gemini-3.1-flash-image-preview。"}</p></div>
          <div style={{ gridColumn: "1 / -1" }}><label>{locale === "en" ? "Prompt" : "最终生成指令"}</label><textarea className={pipelineStyles.textarea} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={promptSuggestion} /><p className={styles.tip}>{locale === "en" ? "This is the final instruction sent to the model. If you leave it blank, the system will auto-compose it from your form fields." : "这是最终发给模型的指令。如果留空，系统会根据你前面填写的字段自动拼装。"}</p></div>
        </div>
        <div className={pipelineStyles.actions} style={{ marginTop: 16 }}>
          <button className={pipelineStyles.button} onClick={runGenerate} disabled={running}>{running ? (locale === "en" ? "Running…" : "生成中…") : (locale === "en" ? "Generate" : "开始生成")}</button>
          {resultImages.length ? <button className={`${pipelineStyles.button} ${pipelineStyles.secondary}`} onClick={downloadAll}>{locale === "en" ? "Download all" : "全部下载"}</button> : null}
        </div>
        {errorText ? <p className={`${styles.tip} ${pipelineStyles.statusBad}`} style={{ marginTop: 12 }}>{errorText}</p> : null}
        {debugWarnings.length ? <ul className={styles.list} style={{ marginTop: 10 }}>{debugWarnings.map((warning, index) => <li key={warning + index} className={pipelineStyles.statusWarn}>{warning}</li>)}</ul> : null}
      </section>

      <section className={styles.card}>
        <h2>{locale === "en" ? "Validation snapshot" : "验证摘要"}</h2>
        <ul className={styles.list}>
          <li>{locale === "en" ? `Requested result count: ${intake.generationCount || "—"}` : `要求生成数量：${intake.generationCount || "—"}`}</li>
          <li>{locale === "en" ? `Returned result count: ${resultImages.length || 0}` : `实际返回数量：${resultImages.length || 0}`}</li>
          <li>{locale === "en" ? `Multi-source input count: ${intake.sourceImages?.length || 0}` : `多源图输入数量：${intake.sourceImages?.length || 0}`}</li>
          <li>{locale === "en" ? `Reference image: ${intake.useReferenceImage ? "enabled" : "disabled"}` : `参考图：${intake.useReferenceImage ? "已启用" : "未启用"}`}</li>
          <li>{locale === "en" ? `Coverage target: ${intake.productFrameCoverageTarget || "—"}% (weak-to-medium control)` : `产品目标占比：${intake.productFrameCoverageTarget || "—"}%（弱到中等控制）`}</li>
          <li>{locale === "en" ? `Coverage target range check: ${MIN_COVERAGE_TARGET}-${MAX_COVERAGE_TARGET}` : `占比范围校验：${MIN_COVERAGE_TARGET}-${MAX_COVERAGE_TARGET}`}</li>
        </ul>
      </section>

      <section className={styles.card}>
        <h2>{locale === "en" ? "Result quality control" : "结果质量控制"}</h2>
        {qualityNotes.length ? <ul className={styles.list}>{qualityNotes.map((note) => <li key={note}>{note}</li>)}</ul> : <p className={`${styles.tip} ${pipelineStyles.statusWarn}`}>{locale === "en" ? "No quality notes yet. Run generation first." : "还没有质量说明，请先执行生成。"}</p>}
      </section>

      <section className={styles.card}>
        <h2>{locale === "en" ? "Result" : "结果"}</h2>
        {resultImages.length ? <div className={pipelineStyles.analysisGrid}>{resultImages.map((src, index) => <div key={src.slice(0, 80) + index} className={pipelineStyles.analysisCard}><img src={src} alt={`Generated ${index + 1}`} className={pipelineStyles.preview} /><div className={pipelineStyles.actions} style={{ marginTop: 12 }}><button className={pipelineStyles.button} onClick={() => downloadImage(src, index)}>{locale === "en" ? "Download" : "下载"}</button></div></div>)}</div> : null}
        <pre className={pipelineStyles.code}>{resultText || (locale === "en" ? "No generation result yet." : "还没有生成结果。")}</pre>
      </section>

      <section className={styles.card}>
        <h2>{locale === "en" ? "Debug details" : "调试详情"}</h2>
        <p className={styles.tip}>{locale === "en" ? "Includes request ID, provider counters, and per-variation execution logs for failure diagnosis." : "包含请求 ID、返回计数和每个变体的执行日志，便于定位失败原因。"} </p>
        <pre className={pipelineStyles.code}>{debugText || (locale === "en" ? "No debug payload yet." : "暂未产生调试数据。")}</pre>
      </section>
    </div>
  );
}
