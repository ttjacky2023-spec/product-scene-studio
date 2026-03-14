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
  centered: "产品放在画面中间，适合主图或主体很强的构图。",
  "left-weighted": "产品偏左，右边留更多空间，适合放文案或道具。",
  "in-use": "产品出现在使用场景中，比如手持、桌面实际使用、人物互动。",
  tabletop: "产品放在桌面/台面上，更像真实场景摆拍。",
  custom: "你自己描述产品放在哪里、朝哪里、周围有什么。",
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
  const removeSourceImage = usePipelineStore((s) => s.removeSourceImage);
  const clearPrimaryImage = usePipelineStore((s) => s.clearPrimaryImage);
  const clearReferenceImage = usePipelineStore((s) => s.clearReferenceImage);
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
        <p>{locale === "en" ? "Upload source images, optionally add a reference image, and control generation constraints before running." : "先把图片和生成要求讲清楚。这里每一项都应该对应最终图片里的变化。"}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.grid}>
        <section className={styles.card}>
          <h2>{locale === "en" ? "Primary source image" : "主源图片"}</h2>
          <div className={styles.formGrid}>
            <div>
              <label>{locale === "en" ? "Upload primary image" : "上传主图"}</label>
              <input type="file" accept="image/*" onChange={(e) => onPrimaryFileChange(e.target.files?.[0] ?? null)} />
              <p className={styles.tip}>{analyzing ? "正在分析主图…" : "主图决定产品本体长什么样，是最主要的产品身份来源。"}</p>
            </div>
            <div>
              <label>{locale === "en" ? "Source resolution" : "源图分辨率"}</label>
              <input {...register("sourceResolution")} placeholder="5000 x 5000" />
              <p className={styles.tip}>这是主图本身的尺寸，用来判断能不能保留 logo、文字、icon 细节。</p>
              {errors.sourceResolution && <p>{errors.sourceResolution.message}</p>}
            </div>
            <div>
              <label>{locale === "en" ? "Product occupies % of frame" : "主图中产品占画面比例 %"}</label>
              <input {...register("productCoverage")} placeholder="80" />
              <p className={styles.tip}>这是“原图里产品有多大”。主要用于系统分析：如果主图里产品太小，后面生成时细节更容易丢，不是你最终场景图里产品大小的直接控制项。</p>
            </div>
            <div>
              <label>{locale === "en" ? "Available views" : "目前已有的产品视角"}</label>
              <select {...register("availableViews")}>
                <option>front only</option><option>front + back</option><option>front + side</option><option>multi-view</option>
              </select>
              <p className={styles.tip}>这项告诉系统你目前有几个真实视角。视角越多，后面让产品转角度时通常越稳定。</p>
            </div>
          </div>
          {imageDataUrl ? <div style={{ marginTop: 16 }}><img src={imageDataUrl} alt="Preview" className={pipelineStyles.preview} style={{ maxWidth: 300 }} /><div className={pipelineStyles.actions} style={{ marginTop: 12 }}><button type="button" className={`${pipelineStyles.button} ${pipelineStyles.secondary}`} onClick={() => { clearPrimaryImage(); setValue("imageName", ""); setValue("imageDataUrl", ""); setValue("sourceResolution", ""); setValue("productCoverage", ""); }}>删除主图</button></div></div> : null}
        </section>

        <section className={styles.card}>
          <h2>{locale === "en" ? "Multiple source image combination" : "多源图组合"}</h2>
          <label>{locale === "en" ? "Upload up to 4 source images" : "最多上传 4 张补充源图"}</label>
          <input type="file" accept="image/*" multiple onChange={(e) => onMultiSourceChange(e.target.files)} />
          <p className={styles.tip}>多源图不是主图替代，而是补充信息。适合补角度、补结构、补部件，帮助模型理解“同一个产品还有哪些真实视图”。</p>
          {sourceImages?.length ? <div className={pipelineStyles.analysisGrid} style={{ marginTop: 16 }}>{sourceImages.map((img, index) => <div key={img.name + index} className={pipelineStyles.analysisCard}><img src={img.dataUrl} alt={img.name} className={pipelineStyles.preview} /><p className={styles.tip}>{img.name} · {img.resolution}</p><div className={pipelineStyles.actions}><button type="button" className={`${pipelineStyles.button} ${pipelineStyles.secondary}`} onClick={() => { removeSourceImage(index); setValue('sourceImages', sourceImages.filter((_, i) => i !== index), { shouldDirty: true }); }}>删除这张图</button></div></div>)}</div> : null}
        </section>

        <section className={styles.card}>
          <h2>{locale === "en" ? "Reference image (optional)" : "参考图片（可选）"}</h2>
          <div className={styles.formGrid}>
            <div>
              <label><input type="checkbox" {...register("useReferenceImage")} /> {locale === "en" ? "Enable reference image instructions" : "启用参考图影响"}</label>
              <p className={styles.tip}>参考图不是告诉模型“你的产品长什么样”，而是告诉模型“我想要这种风格、构图、氛围、场景感觉”。</p>
            </div>
            <div>
              <label>{locale === "en" ? "Reference analysis model" : "参考图分析模型"}</label>
              <select {...register("referenceAnalysisModel")}>
                <option>gemini-3-flash-preview</option>
                <option>gemini-3.1-flash-image-preview</option>
                <option>gemini-3-pro-image-preview</option>
              </select>
              <p className={styles.tip}>这项的目的是决定“参考图分析说明”由哪个模型来理解。后续可以继续增强成真正模型分析链路。</p>
            </div>
          </div>
          {useReferenceImage ? <>
            <label>{locale === "en" ? "Upload reference image" : "上传参考图"}</label>
            <input type="file" accept="image/*" onChange={(e) => onReferenceFileChange(e.target.files?.[0] ?? null)} />
            <p className={styles.tip}>{referenceAnalyzing ? "正在分析参考图…" : "参考图会影响最终画面的风格和构图，不是主要产品身份来源。也就是说：主图决定产品是谁，参考图决定画面更像什么。"}</p>
            {watch("referenceImageDataUrl") ? <div style={{ marginTop: 16 }}><img src={watch("referenceImageDataUrl")} alt="Reference preview" className={pipelineStyles.preview} style={{ maxWidth: 300 }} /><div className={pipelineStyles.actions} style={{ marginTop: 12 }}><button type="button" className={`${pipelineStyles.button} ${pipelineStyles.secondary}`} onClick={() => { clearReferenceImage(); setValue('referenceImageName',''); setValue('referenceImageDataUrl',''); setValue('useReferenceImage', false); }}>删除参考图</button></div></div> : null}
            {referenceAnalysis ? <div className={pipelineStyles.analysisGrid} style={{ marginTop: 16 }}>
              <div className={pipelineStyles.analysisCard}><h3>结构提示</h3><p className={styles.tip}>{referenceAnalysis.structureHint}</p></div>
              <div className={pipelineStyles.analysisCard}><h3>风格提示</h3><p className={styles.tip}>{referenceAnalysis.styleHint}</p></div>
            </div> : null}
          </> : null}
        </section>

        <section className={styles.card}>
          <h2>{locale === "en" ? "Output request" : "输出要求"}</h2>
          <div className={styles.formGrid}>
            <div>
              <label>画面比例</label>
              <select {...register("aspectRatio")}>
                {[...(recommendationSummary?.ratios ?? []), "1:1", "4:5", "16:9", "3:4", "2:3", "3:2", "9:16", "21:9", "custom"].filter((v, i, a) => a.indexOf(v) === i).map((x) => <option key={x}>{x}</option>)}
              </select>
              {aspectRatio === "custom" ? <input {...register("aspectRatioCustom")} placeholder="例如 5:4" style={{ marginTop: 10 }} /> : null}
              <p className={styles.tip}>它控制最终图片横竖比例。不是风格项，而是“画布比例”。会影响产品能放多大、场景能容纳多少内容。</p>
            </div>
            <div>
              <label>输出像素</label>
              <select {...register("outputSize")}>
                {[...(recommendationSummary?.sizes ?? []), "2000 x 2000", "2000 x 2500", "1920 x 1080", "3000 x 3000", "2560 x 1440", "1080 x 1350", "custom"].filter((v, i, a) => a.indexOf(v) === i).map((x) => <option key={x}>{x}</option>)}
              </select>
              {outputSize === "custom" ? <input {...register("outputSizeCustom")} placeholder="例如 2400 x 3000" style={{ marginTop: 10 }} /> : null}
              <p className={styles.tip}>它控制最终导出图的分辨率。越大越适合后续精修或电商图使用，但生成成本也更高。</p>
            </div>
            <div><label>生成数量</label><select {...register("generationCount")}><option>1</option><option>2</option><option>4</option><option>6</option><option>8</option></select><p className={styles.tip}>一次想出几张结果图。</p></div>
            <div>
              <label>用途</label>
              <select {...register("intendedUse")}>
                {[...(recommendationSummary?.uses ?? []), "Amazon gallery", "A+ / PDP", "Ads", "Social", "Landing page hero", "Marketplace listing", "Email banner", "Website product block"].filter((v, i, a) => a.indexOf(v) === i).map((x) => <option key={x}>{x}</option>)}
              </select>
              <p className={styles.tip}>用途会影响构图与风格。比如 Amazon gallery 往往更克制，Ads 可以更有氛围感。</p>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <h2>{locale === "en" ? "Scene and placement" : "场景与产品摆放"}</h2>
          <div className={styles.formGrid}>
            <div>
              <label>场景类型</label>
              <textarea {...register("sceneTypes")} placeholder="例如：厨房台面、极简桌面、浴室洗手台、手持使用场景" />
              <p className={styles.tip}>这项回答“产品出现在哪里”。它决定环境、道具、背景、氛围。</p>
            </div>
            <div>
              <label>产品摆放方式</label>
              <select {...register("placementPreference")}>
                <option value="centered">居中摆放</option><option value="left-weighted">靠左摆放</option><option value="in-use">使用中摆放</option><option value="tabletop">桌面摆放</option><option value="custom">自定义</option>
              </select>
              {placementPreference === "custom" ? <textarea {...register("placementCustom")} placeholder="例如：产品放在右下角，左侧留白；产品斜放在桌面中央；产品靠近前景" style={{ marginTop: 10 }} /> : null}
              <p className={styles.tip}>{placementHints[placementPreference] || "这项决定产品在画面里放哪里、怎么放，不是风格本身。"}</p>
            </div>
            <div>
              <label>产品角度变化要求</label>
              <select {...register("angleTolerance")}>
                <option>same angle only</option><option>slight angle shift</option><option>significant angle change</option>
              </select>
              <input {...register("angleDegrees")} placeholder="例如：保持正面；左转 15°；右前 30°；俯拍 20°" style={{ marginTop: 10 }} />
              <p className={styles.tip}>这项决定产品本体转多少角度。它应该影响“产品朝向”和“镜头看到的是哪个面”。如果你要明显角度变化，必须在这里写清楚。</p>
            </div>
            <div>
              <label>风格偏好</label>
              <select {...register("stylePreference")}>
                <option value="">根据图片自动建议</option>
                <option value="clean ecommerce lifestyle with bright controllable lighting">干净电商风</option>
                <option value="premium contrast-forward studio scene with controlled highlights">高级深色棚拍风</option>
                <option value="natural home-use lifestyle scene">自然生活方式风</option>
                <option value="high-contrast marketing lifestyle scene">广告感高对比风</option>
                <option value="custom">自定义</option>
              </select>
              {stylePreference === "custom" ? <textarea {...register("styleCustom")} placeholder="例如：高级护肤广告感、清晨自然光、杂志封面感" style={{ marginTop: 10 }} /> : null}
              <p className={styles.tip}>这项回答“整张图看起来像什么风格”，不是产品放哪里。</p>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <h2>{locale === "en" ? "Product prominence and controls" : "产品大小与控制"}</h2>
          <div className={styles.formGrid}>
            <div><label>生成图中产品目标占比 (%)</label><input {...register("productFrameCoverageTarget")} placeholder="55" /><p className={styles.tip}>这项回答“最终生成图里产品要占多大”。比如 70 表示产品更大、更像主图；30 表示场景更多、产品更小。目前这项还是弱到中等控制，不是绝对硬控制。</p></div>
            <div><label>绝不能变化的元素</label><textarea {...register("mustPreserve")} placeholder="logo, critical text, icons" /><p className={styles.tip}>告诉系统哪些内容不能乱：比如 logo、文字、icon、包装主图案。</p></div>
            <div><label>保真严格度</label><select {...register("strictness")}><option>maximum preservation</option><option>balanced</option><option>concept-first</option></select><p className={styles.tip}>越偏 maximum preservation，越倾向保留产品本体与细节；越偏 concept-first，越允许模型更自由发挥。</p></div>
            <div><label>最大迭代轮数</label><select {...register("maxIterations")}><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select><p className={styles.tip}>如果结果不满意，最多允许系统反复尝试几轮。</p></div>
          </div>
        </section>

        <section className={styles.card}>
          <h2>三类图片分别控制什么</h2>
          <div className={pipelineStyles.analysisGrid}>
            <div className={pipelineStyles.analysisCard}><h3>主图</h3><p className={styles.tip}>主图是最重要的产品身份来源，决定“产品本体长什么样”。</p></div>
            <div className={pipelineStyles.analysisCard}><h3>多源图</h3><p className={styles.tip}>多源图用来补充额外视角、额外结构、额外部件信息，帮助模型理解同一个产品的更多真实样子。</p></div>
            <div className={pipelineStyles.analysisCard}><h3>参考图</h3><p className={styles.tip}>参考图主要控制风格、构图、氛围与环境感觉，不是主要产品身份来源。</p></div>
          </div>
        </section>

        {analysis ? (
          <section className={styles.card}>
            <h2>自动图片分析</h2>
            <div className={pipelineStyles.analysisGrid}>
              <div className={pipelineStyles.analysisCard}><h3>检测结果</h3><div className={pipelineStyles.chips}><span className={pipelineStyles.chip}>{analysis.width}×{analysis.height}</span><span className={pipelineStyles.chip}>{analysis.orientation}</span><span className={pipelineStyles.chip}>coverage ~ {analysis.estimatedCoverage}%</span><span className={pipelineStyles.chip}>bg: {analysis.backgroundTone}</span></div></div>
              <div className={pipelineStyles.analysisCard}><h3>推荐项</h3><div className={pipelineStyles.chips}>{analysis.suggestedAspectRatios.map((x) => <span key={x} className={pipelineStyles.chip}>{x}</span>)}{analysis.suggestedOutputSizes.map((x) => <span key={x} className={pipelineStyles.chip}>{x}</span>)}</div><p className={styles.tip}>{analysis.structureHint}</p><p className={styles.tip}>{analysis.styleHint}</p></div>
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
