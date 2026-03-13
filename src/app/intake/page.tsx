"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import styles from "../shared.module.css";
import pipelineStyles from "@/components/pipeline.module.css";
import { PipelineToolbar } from "@/components/PipelineToolbar";
import { analyzeImageDataUrl } from "@/lib/analyze";
import { t } from "@/lib/i18n";
import type { ImageAsset, IntakeData } from "@/lib/types";
import { usePipelineStore } from "@/store/pipeline";

const schema = z.object({
  imageName: z.string(), imageDataUrl: z.string(), sourceResolution: z.string().min(1, "Required"), productCoverage: z.string().min(1, "Required"), availableViews: z.string().min(1, "Required"),
  aspectRatio: z.string().min(1), aspectRatioCustom: z.string(), outputSize: z.string().min(1, "Required"), outputSizeCustom: z.string(), generationCount: z.string().min(1, "Required"), intendedUse: z.string().min(1), sceneTypes: z.string().min(1, "Required"),
  placementPreference: z.string().min(1, "Required"), placementCustom: z.string(), angleTolerance: z.enum(["same angle only", "slight angle shift", "significant angle change"]), angleDegrees: z.string(), stylePreference: z.string(), styleCustom: z.string(), strictness: z.enum(["maximum preservation", "balanced", "concept-first"]),
  mustPreserve: z.string().min(1, "Required"), draftApproval: z.string().min(1), maxIterations: z.string().min(1, "Required"), productFrameCoverageTarget: z.string().min(1), useReferenceImage: z.boolean(),
  referenceImageName: z.string(), referenceImageDataUrl: z.string(), referenceAnalysisModel: z.string(), sourceImages: z.array(z.object({ name: z.string(), dataUrl: z.string(), resolution: z.string() })),
});

const placementHints: Record<string, string> = {
  centered: "Best for hero shots and Amazon gallery consistency.",
  "left-weighted": "Useful when you want space for copy or secondary props on the right.",
  "in-use": "Best when usage context matters more than packshot symmetry.",
  tabletop: "Reliable for product realism and easier shadow control.",
  custom: "Use custom placement instructions for advanced control.",
};

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function IntakePage() {
  const locale = usePipelineStore((s) => s.locale);
  const text = t(locale);
  const intake = usePipelineStore((s) => s.intake);
  const analysis = usePipelineStore((s) => s.analysis);
  const referenceAnalysis = usePipelineStore((s) => s.referenceAnalysis);
  const setAnalysis = usePipelineStore((s) => s.setAnalysis);
  const setReferenceAnalysis = usePipelineStore((s) => s.setReferenceAnalysis);
  const setIntake = usePipelineStore((s) => s.setIntake);
  const addSourceImages = usePipelineStore((s) => s.addSourceImages);
  const [analyzing, setAnalyzing] = useState(false);
  const [referenceAnalyzing, setReferenceAnalyzing] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitSuccessful } } = useForm<IntakeData>({ resolver: zodResolver(schema), defaultValues: intake });
  const imageDataUrl = watch("imageDataUrl");
  const placementPreference = watch("placementPreference");
  const useReferenceImage = watch("useReferenceImage");
  const sourceImages = watch("sourceImages");
  const aspectRatio = watch("aspectRatio");
  const outputSize = watch("outputSize");
  const stylePreference = watch("stylePreference");

  const onSubmit = (data: IntakeData) => setIntake(data);

  const onPrimaryFileChange = async (file: File | null) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setValue("imageName", file.name, { shouldDirty: true });
    setValue("imageDataUrl", dataUrl, { shouldDirty: true });
    setAnalyzing(true);
    try {
      const result = await analyzeImageDataUrl(dataUrl);
      setAnalysis(result);
      setValue("sourceResolution", `${result.width} x ${result.height}`, { shouldDirty: true });
      setValue("productCoverage", String(result.estimatedCoverage), { shouldDirty: true });
      setValue("aspectRatio", result.suggestedAspectRatios[0], { shouldDirty: true });
      setValue("outputSize", result.suggestedOutputSizes[0], { shouldDirty: true });
      setValue("intendedUse", result.suggestedIntendedUses[0], { shouldDirty: true });
      setValue("sceneTypes", result.suggestedSceneTypes.join(", "), { shouldDirty: true });
      setValue("stylePreference", result.suggestedStyle, { shouldDirty: true });
      setValue("angleTolerance", result.suggestedAngleTolerance, { shouldDirty: true });
    } finally {
      setAnalyzing(false);
    }
  };

  const onReferenceFileChange = async (file: File | null) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setValue("referenceImageName", file.name, { shouldDirty: true });
    setValue("referenceImageDataUrl", dataUrl, { shouldDirty: true });
    setReferenceAnalyzing(true);
    try {
      const result = await analyzeImageDataUrl(dataUrl);
      setReferenceAnalysis(result);
    } finally {
      setReferenceAnalyzing(false);
    }
  };

  const onMultiSourceChange = async (files: FileList | null) => {
    if (!files) return;
    const chosen = Array.from(files).slice(0, 4);
    const assets: ImageAsset[] = [];
    for (const file of chosen) {
      const dataUrl = await fileToDataUrl(file);
      const result = await analyzeImageDataUrl(dataUrl);
      assets.push({ name: file.name, dataUrl, resolution: `${result.width} x ${result.height}` });
    }
    setValue("sourceImages", assets, { shouldDirty: true });
    addSourceImages(assets);
  };

  const recommendationSummary = useMemo(() => {
    if (!analysis) return null;
    return { ratios: analysis.suggestedAspectRatios, sizes: analysis.suggestedOutputSizes, uses: analysis.suggestedIntendedUses, scenes: analysis.suggestedSceneTypes, style: analysis.suggestedStyle };
  }, [analysis]);

  useEffect(() => {
    const sub = watch((values) => setIntake(values as IntakeData));
    return () => sub.unsubscribe();
  }, [watch, setIntake]);

  return (
    <div className={styles.page}>
      <PipelineToolbar />
      <div className={styles.header}>
        <h1>{locale === "en" ? "Intake Form" : "信息填写"}</h1>
        <p>{locale === "en" ? "Upload source images, optionally add a reference image, and control generation constraints before running." : "上传源图，可选上传参考图，并在生成前设置约束。"}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.grid}>
        <section className={styles.card}>
          <h2>{locale === "en" ? "Primary source image" : "主源图片"}</h2>
          <div className={styles.formGrid}>
            <div>
              <label>{locale === "en" ? "Upload primary image" : "上传主图"}</label>
              <input type="file" accept="image/*" onChange={(e) => onPrimaryFileChange(e.target.files?.[0] ?? null)} />
              <p className={styles.tip}>{analyzing ? "Analyzing image…" : "Primary image drives the default suggestions."}</p>
            </div>
            <div>
              <label>{locale === "en" ? "Source resolution" : "源图分辨率"}</label>
              <input {...register("sourceResolution")} placeholder="5000 x 5000" />
              {errors.sourceResolution && <p>{errors.sourceResolution.message}</p>}
            </div>
            <div>
              <label>{locale === "en" ? "Product occupies % of frame" : "产品占画面比例 %"}</label>
              <input {...register("productCoverage")} placeholder="80" />
            </div>
            <div>
              <label>{locale === "en" ? "Available views" : "可用视角"}</label>
              <select {...register("availableViews")}>
                <option>front only</option><option>front + back</option><option>front + side</option><option>multi-view</option>
              </select>
            </div>
          </div>
          {imageDataUrl ? <img src={imageDataUrl} alt="Preview" className={pipelineStyles.preview} style={{ marginTop: 16, maxWidth: 300 }} /> : null}
        </section>

        <section className={styles.card}>
          <h2>{locale === "en" ? "Multiple source image combination" : "多源图组合"}</h2>
          <label>{locale === "en" ? "Upload up to 4 source images" : "最多上传 4 张源图"}</label>
          <input type="file" accept="image/*" multiple onChange={(e) => onMultiSourceChange(e.target.files)} />
          <p className={styles.tip}>{locale === "en" ? "Use this when you want multiple product views or components merged into one generated result." : "适合把多个产品视角或多个组件合成一张生成结果图。"}</p>
          {sourceImages?.length ? <div className={pipelineStyles.analysisGrid} style={{ marginTop: 16 }}>{sourceImages.map((img) => <div key={img.name} className={pipelineStyles.analysisCard}><img src={img.dataUrl} alt={img.name} className={pipelineStyles.preview} /><p className={styles.tip}>{img.name} · {img.resolution}</p></div>)}</div> : null}
        </section>

        <section className={styles.card}>
          <h2>{locale === "en" ? "Reference image (optional)" : "参考图片（可选）"}</h2>
          <div className={styles.formGrid}>
            <div>
              <label><input type="checkbox" {...register("useReferenceImage")} /> {locale === "en" ? "Enable reference image instructions" : "启用参考图指令"}</label>
              <p className={styles.tip}>{locale === "en" ? "If enabled, the final prompt will include reference-derived structure and style instructions." : "启用后，最终生成 prompt 会加入参考图提取出的结构与风格指令。"}</p>
            </div>
            <div>
              <label>{locale === "en" ? "Reference analysis model" : "参考图分析模型"}</label>
              <select {...register("referenceAnalysisModel")}>
                <option>gemini-3-flash-preview</option>
                <option>gemini-3.1-flash-image-preview</option>
                <option>gemini-3-pro-image-preview</option>
              </select>
            </div>
          </div>
          {useReferenceImage ? <>
            <label>{locale === "en" ? "Upload reference image" : "上传参考图"}</label>
            <input type="file" accept="image/*" onChange={(e) => onReferenceFileChange(e.target.files?.[0] ?? null)} />
            <p className={styles.tip}>{referenceAnalyzing ? "Analyzing reference image…" : "Reference image is used for style and composition hints, not as a required source unless you enable it."}</p>
            {watch("referenceImageDataUrl") ? <img src={watch("referenceImageDataUrl")} alt="Reference preview" className={pipelineStyles.preview} style={{ marginTop: 16, maxWidth: 300 }} /> : null}
            {referenceAnalysis ? <div className={pipelineStyles.analysisGrid} style={{ marginTop: 16 }}>
              <div className={pipelineStyles.analysisCard}><h3>Structure hint</h3><p className={styles.tip}>{referenceAnalysis.structureHint}</p></div>
              <div className={pipelineStyles.analysisCard}><h3>Style hint</h3><p className={styles.tip}>{referenceAnalysis.styleHint}</p></div>
            </div> : null}
          </> : null}
        </section>

        <section className={styles.card}>
          <h2>{locale === "en" ? "Output request" : "输出要求"}</h2>
          <div className={styles.formGrid}>
            <div>
              <label>Aspect ratio</label>
              <select {...register("aspectRatio")}>
                {[...(recommendationSummary?.ratios ?? []), "1:1", "4:5", "16:9", "3:4", "2:3", "3:2", "9:16", "21:9", "custom"].filter((v, i, a) => a.indexOf(v) === i).map((x) => <option key={x}>{x}</option>)}
              </select>
              {aspectRatio === "custom" ? <input {...register("aspectRatioCustom")} placeholder="e.g. 5:4" style={{ marginTop: 10 }} /> : null}
            </div>
            <div>
              <label>{locale === "en" ? "Output pixel size" : "输出像素"}</label>
              <select {...register("outputSize")}>
                {[...(recommendationSummary?.sizes ?? []), "2000 x 2000", "2000 x 2500", "1920 x 1080", "3000 x 3000", "2560 x 1440", "1080 x 1350", "custom"].filter((v, i, a) => a.indexOf(v) === i).map((x) => <option key={x}>{x}</option>)}
              </select>
              {outputSize === "custom" ? <input {...register("outputSizeCustom")} placeholder="e.g. 2400 x 3000" style={{ marginTop: 10 }} /> : null}
            </div>
            <div><label>{locale === "en" ? "Generation count" : "生成数量"}</label><select {...register("generationCount")}><option>1</option><option>2</option><option>4</option><option>6</option><option>8</option></select></div>
            <div>
              <label>{locale === "en" ? "Intended use" : "用途"}</label>
              <select {...register("intendedUse")}>
                {[...(recommendationSummary?.uses ?? []), "Amazon gallery", "A+ / PDP", "Ads", "Social", "Landing page hero", "Marketplace listing", "Email banner", "Website product block"].filter((v, i, a) => a.indexOf(v) === i).map((x) => <option key={x}>{x}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <h2>{locale === "en" ? "Scene and placement" : "场景与摆放"}</h2>
          <div className={styles.formGrid}>
            <div>
              <label>{locale === "en" ? "Scene types" : "场景类型"}</label>
              <textarea {...register("sceneTypes")} placeholder="minimal tabletop, kitchen counter, in-use hand-held" />
            </div>
            <div>
              <label>{locale === "en" ? "Placement preference" : "摆放偏好"}</label>
              <select {...register("placementPreference")}>
                <option value="centered">centered</option><option value="left-weighted">left-weighted</option><option value="in-use">in-use</option><option value="tabletop">tabletop</option><option value="custom">custom</option>
              </select>
              {placementPreference === "custom" ? <textarea {...register("placementCustom")} placeholder="e.g. product anchored lower-right with copy space on left" style={{ marginTop: 10 }} /> : null}
              <p className={styles.tip}>{placementHints[placementPreference] || "Choose based on copy space and scene realism needs."}</p>
            </div>
            <div>
              <label>{locale === "en" ? "Angle tolerance" : "角度容忍度"}</label>
              <select {...register("angleTolerance")}>
                <option>same angle only</option><option>slight angle shift</option><option>significant angle change</option>
              </select>
              <input {...register("angleDegrees")} placeholder="e.g. 0-15°, 20°, 35° side turn" style={{ marginTop: 10 }} />
            </div>
            <div>
              <label>{locale === "en" ? "Style preference" : "风格偏好"}</label>
              <select {...register("stylePreference")}>
                <option value="">auto-suggest from image</option>
                <option value="clean ecommerce lifestyle with bright controllable lighting">clean ecommerce lifestyle</option>
                <option value="premium contrast-forward studio scene with controlled highlights">premium dark studio</option>
                <option value="natural home-use lifestyle scene">natural home-use lifestyle</option>
                <option value="high-contrast marketing lifestyle scene">high-contrast marketing lifestyle</option>
                <option value="custom">custom</option>
              </select>
              {stylePreference === "custom" ? <textarea {...register("styleCustom")} placeholder="e.g. luxury skincare editorial with soft side lighting" style={{ marginTop: 10 }} /> : null}
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <h2>{locale === "en" ? "Product prominence and controls" : "产品占比与控制"}</h2>
          <div className={styles.formGrid}>
            <div><label>{locale === "en" ? "Target product coverage in final image (%)" : "目标产品占画面比例 (%)"}</label><input {...register("productFrameCoverageTarget")} placeholder="55" /></div>
            <div><label>{locale === "en" ? "Elements that must never change" : "绝不能变化的元素"}</label><textarea {...register("mustPreserve")} placeholder="logo, critical text, icons" /></div>
            <div><label>{locale === "en" ? "Preservation strictness" : "保真严格度"}</label><select {...register("strictness")}><option>maximum preservation</option><option>balanced</option><option>concept-first</option></select></div>
            <div><label>{locale === "en" ? "Max iteration rounds" : "最大迭代轮数"}</label><select {...register("maxIterations")}><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></div>
          </div>
        </section>

        {analysis ? (
          <section className={styles.card}>
            <h2>{locale === "en" ? "Automatic image analysis" : "自动图片分析"}</h2>
            <div className={pipelineStyles.analysisGrid}>
              <div className={pipelineStyles.analysisCard}><h3>{locale === "en" ? "Detected facts" : "检测结果"}</h3><div className={pipelineStyles.chips}><span className={pipelineStyles.chip}>{analysis.width}×{analysis.height}</span><span className={pipelineStyles.chip}>{analysis.orientation}</span><span className={pipelineStyles.chip}>coverage ~ {analysis.estimatedCoverage}%</span><span className={pipelineStyles.chip}>bg: {analysis.backgroundTone}</span></div></div>
              <div className={pipelineStyles.analysisCard}><h3>{locale === "en" ? "Recommendations" : "推荐项"}</h3><div className={pipelineStyles.chips}>{analysis.suggestedAspectRatios.map((x) => <span key={x} className={pipelineStyles.chip}>{x}</span>)}{analysis.suggestedOutputSizes.map((x) => <span key={x} className={pipelineStyles.chip}>{x}</span>)}</div><p className={styles.tip}>{analysis.structureHint}</p><p className={styles.tip}>{analysis.styleHint}</p></div>
            </div>
            <ul className={styles.list} style={{ marginTop: 16 }}>{analysis.notes.map((note) => <li key={note}>{note}</li>)}</ul>
          </section>
        ) : null}

        <div style={{ display: "flex", gap: 12 }}>
          <button type="submit" className={pipelineStyles.button}>{text.common.save}</button>
          {isSubmitSuccessful ? <span>{text.common.saved}</span> : null}
        </div>
      </form>
    </div>
  );
}
