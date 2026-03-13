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
import type { IntakeData } from "@/lib/types";
import { usePipelineStore } from "@/store/pipeline";

const schema = z.object({
  imageName: z.string(), imageDataUrl: z.string(), sourceResolution: z.string().min(1, "Required"), productCoverage: z.string().min(1, "Required"), availableViews: z.string().min(1, "Required"),
  aspectRatio: z.string().min(1), outputSize: z.string().min(1, "Required"), generationCount: z.string().min(1, "Required"), intendedUse: z.string().min(1), sceneTypes: z.string().min(1, "Required"),
  placementPreference: z.string().min(1, "Required"), angleTolerance: z.enum(["same angle only", "slight angle shift", "significant angle change"]), stylePreference: z.string(), strictness: z.enum(["maximum preservation", "balanced", "concept-first"]),
  mustPreserve: z.string().min(1, "Required"), draftApproval: z.string().min(1), maxIterations: z.string().min(1, "Required"),
});

const placementHints: Record<string, string> = {
  centered: "Best for hero shots and Amazon gallery consistency.",
  "left-weighted": "Useful when you want space for copy or secondary props on the right.",
  "in-use": "Best when usage context matters more than packshot symmetry.",
  tabletop: "Reliable for product realism and easier shadow control.",
};

export default function IntakePage() {
  const locale = usePipelineStore((s) => s.locale);
  const text = t(locale);
  const intake = usePipelineStore((s) => s.intake);
  const analysis = usePipelineStore((s) => s.analysis);
  const setAnalysis = usePipelineStore((s) => s.setAnalysis);
  const setIntake = usePipelineStore((s) => s.setIntake);
  const [analyzing, setAnalyzing] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitSuccessful } } = useForm<IntakeData>({ resolver: zodResolver(schema), defaultValues: intake });
  const imageDataUrl = watch("imageDataUrl");
  const aspectRatio = watch("aspectRatio");
  const placementPreference = watch("placementPreference");

  const onSubmit = (data: IntakeData) => setIntake(data);

  const onFileChange = async (file: File | null) => {
    if (!file) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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

  const recommendationSummary = useMemo(() => {
    if (!analysis) return null;
    return {
      ratios: analysis.suggestedAspectRatios,
      sizes: analysis.suggestedOutputSizes,
      uses: analysis.suggestedIntendedUses,
      scenes: analysis.suggestedSceneTypes,
      style: analysis.suggestedStyle,
    };
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
        <p>{locale === "en" ? "Upload a source image first. The page will analyze the image and suggest settings." : "先上传源图。页面会自动分析图片，并给出推荐设置。"}</p>
      </div>

      <section className={pipelineStyles.heroPanel}>
        <strong>{locale === "en" ? "What V6 adds here" : "V6 在这里增加了什么"}</strong>
        <p className={styles.tip}>{locale === "en" ? "Automatic source-image analysis, smarter dropdown defaults, recommendation cards, and polished form guidance." : "增加了源图自动分析、更智能的下拉默认值、推荐卡片和更完整的表单建议。"}</p>
      </section>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.grid}>
        <section className={styles.card}>
          <h2>{locale === "en" ? "Source image" : "源图片"}</h2>
          <div className={styles.formGrid}>
            <div>
              <label>{locale === "en" ? "Upload product image" : "上传产品图"}</label>
              <input type="file" accept="image/*" onChange={(e) => onFileChange(e.target.files?.[0] ?? null)} />
              <p className={styles.tip}>{analyzing ? (locale === "en" ? "Analyzing image…" : "正在分析图片…") : (locale === "en" ? "After upload, resolution and coverage will be estimated automatically." : "上传后会自动估算分辨率与产品占比。")}</p>
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
                <option>front only</option>
                <option>front + back</option>
                <option>front + side</option>
                <option>multi-view</option>
              </select>
              <p className={styles.tip}>{locale === "en" ? "More views unlock safer angle changes later." : "视角越多，后续做角度变化越安全。"}</p>
            </div>
          </div>
          {imageDataUrl ? <img src={imageDataUrl} alt="Preview" className={pipelineStyles.preview} style={{ marginTop: 16, maxWidth: 300 }} /> : null}
        </section>

        <section className={styles.card}>
          <h2>{locale === "en" ? "Output request" : "输出要求"}</h2>
          <div className={styles.formGrid}>
            <div>
              <label>Aspect ratio</label>
              <select {...register("aspectRatio")}>
                {(recommendationSummary?.ratios ?? ["1:1", "4:5", "16:9", "3:4"]).map((x) => <option key={x}>{x}</option>)}
              </select>
              <p className={styles.tip}>{locale === "en" ? `Suggested for this upload: ${(recommendationSummary?.ratios ?? []).join(", ") || "standard ratios"}` : `本图推荐比例：${(recommendationSummary?.ratios ?? []).join("、") || "标准比例"}`}</p>
            </div>
            <div>
              <label>{locale === "en" ? "Output pixel size" : "输出像素"}</label>
              <select {...register("outputSize")}>
                {(recommendationSummary?.sizes ?? ["2000 x 2000", "2000 x 2500", "1920 x 1080"]).map((x) => <option key={x}>{x}</option>)}
              </select>
            </div>
            <div><label>{locale === "en" ? "Generation count" : "生成数量"}</label><select {...register("generationCount")}><option>1</option><option>2</option><option>4</option><option>6</option><option>8</option></select></div>
            <div>
              <label>{locale === "en" ? "Intended use" : "用途"}</label>
              <select {...register("intendedUse")}>
                {(recommendationSummary?.uses ?? ["Amazon gallery", "A+ / PDP", "Ads", "Social"]).map((x) => <option key={x}>{x}</option>)}
              </select>
              <p className={styles.tip}>{locale === "en" ? "Usage affects ratio, composition, and style recommendations." : "用途会影响比例、构图和风格建议。"}</p>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <h2>{locale === "en" ? "Scene and placement" : "场景与摆放"}</h2>
          <div className={styles.formGrid}>
            <div>
              <label>{locale === "en" ? "Scene types" : "场景类型"}</label>
              <textarea {...register("sceneTypes")} placeholder="minimal tabletop, kitchen counter, in-use hand-held" />
              <p className={styles.tip}>{locale === "en" ? `Suggested scenes: ${(recommendationSummary?.scenes ?? []).join(", ") || "—"}` : `推荐场景：${(recommendationSummary?.scenes ?? []).join("、") || "—"}`}</p>
            </div>
            <div>
              <label>{locale === "en" ? "Placement preference" : "摆放偏好"}</label>
              <select {...register("placementPreference")}>
                <option value="centered">centered</option>
                <option value="left-weighted">left-weighted</option>
                <option value="in-use">in-use</option>
                <option value="tabletop">tabletop</option>
              </select>
              <p className={styles.tip}>{placementHints[placementPreference] || (locale === "en" ? "Choose based on copy space and scene realism needs." : "根据文案留白和场景真实感需求来选择。")}</p>
            </div>
            <div>
              <label>{locale === "en" ? "Angle tolerance" : "角度容忍度"}</label>
              <select {...register("angleTolerance")}>
                <option>same angle only</option>
                <option>slight angle shift</option>
                <option>significant angle change</option>
              </select>
              <p className={styles.tip}>{locale === "en" ? "If only one front image exists, same-angle or slight-angle is usually safer." : "如果只有一张正面图，通常 same-angle 或 slight-angle 更安全。"}</p>
            </div>
            <div>
              <label>{locale === "en" ? "Style preference" : "风格偏好"}</label>
              <select {...register("stylePreference")}>
                <option value="">{locale === "en" ? "auto-suggest from image" : "根据图片自动建议"}</option>
                <option value="clean ecommerce lifestyle with bright controllable lighting">clean ecommerce lifestyle</option>
                <option value="premium contrast-forward studio scene with controlled highlights">premium dark studio</option>
                <option value="natural home-use lifestyle scene">natural home-use lifestyle</option>
                <option value="high-contrast marketing lifestyle scene">high-contrast marketing lifestyle</option>
              </select>
              <p className={styles.tip}>{locale === "en" ? `Suggested style: ${recommendationSummary?.style ?? "—"}` : `推荐风格：${recommendationSummary?.style ?? "—"}`}</p>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <h2>{locale === "en" ? "Protection and approvals" : "保护与审批"}</h2>
          <div className={styles.formGrid}>
            <div><label>{locale === "en" ? "Preservation strictness" : "保真严格度"}</label><select {...register("strictness")}><option>maximum preservation</option><option>balanced</option><option>concept-first</option></select><p className={styles.tip}>{locale === "en" ? "Maximum preservation is best for logo/text-critical commerce images." : "如果 logo/文字很关键，优先选 maximum preservation。"}</p></div>
            <div><label>{locale === "en" ? "Elements that must never change" : "绝不能变化的元素"}</label><textarea {...register("mustPreserve")} placeholder="logo, critical text, icons" /></div>
            <div><label>{locale === "en" ? "Draft approval required?" : "是否需要草稿审批"}</label><select {...register("draftApproval")}><option>yes</option><option>no</option></select></div>
            <div><label>{locale === "en" ? "Max iteration rounds" : "最大迭代轮数"}</label><select {...register("maxIterations")}><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></div>
          </div>
        </section>

        {analysis ? (
          <section className={styles.card}>
            <h2>{locale === "en" ? "Automatic image analysis" : "自动图片分析"}</h2>
            <div className={pipelineStyles.analysisGrid}>
              <div className={pipelineStyles.analysisCard}><h3>{locale === "en" ? "Detected facts" : "检测结果"}</h3><div className={pipelineStyles.chips}><span className={pipelineStyles.chip}>{analysis.width}×{analysis.height}</span><span className={pipelineStyles.chip}>{analysis.orientation}</span><span className={pipelineStyles.chip}>coverage ~ {analysis.estimatedCoverage}%</span><span className={pipelineStyles.chip}>bg: {analysis.backgroundTone}</span></div></div>
              <div className={pipelineStyles.analysisCard}><h3>{locale === "en" ? "Recommendations" : "推荐项"}</h3><div className={pipelineStyles.chips}>{analysis.suggestedAspectRatios.map((x) => <span key={x} className={pipelineStyles.chip}>{x}</span>)}{analysis.suggestedOutputSizes.map((x) => <span key={x} className={pipelineStyles.chip}>{x}</span>)}</div></div>
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
