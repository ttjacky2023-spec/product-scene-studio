"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import styles from "../shared.module.css";
import pipelineStyles from "@/components/pipeline.module.css";
import { PipelineToolbar } from "@/components/PipelineToolbar";
import type { IntakeData } from "@/lib/types";
import { usePipelineStore } from "@/store/pipeline";

const schema = z.object({
  imageName: z.string(),
  imageDataUrl: z.string(),
  sourceResolution: z.string().min(1, "Required"),
  productCoverage: z.string().min(1, "Required"),
  availableViews: z.string().min(1, "Required"),
  aspectRatio: z.string().min(1),
  outputSize: z.string().min(1, "Required"),
  generationCount: z.string().min(1, "Required"),
  intendedUse: z.string().min(1),
  sceneTypes: z.string().min(1, "Required"),
  placementPreference: z.string().min(1, "Required"),
  angleTolerance: z.enum(["same angle only", "slight angle shift", "significant angle change"]),
  stylePreference: z.string(),
  strictness: z.enum(["maximum preservation", "balanced", "concept-first"]),
  mustPreserve: z.string().min(1, "Required"),
  draftApproval: z.string().min(1),
  maxIterations: z.string().min(1, "Required"),
});

export default function IntakePage() {
  const intake = usePipelineStore((s) => s.intake);
  const setIntake = usePipelineStore((s) => s.setIntake);
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitSuccessful } } = useForm<IntakeData>({
    resolver: zodResolver(schema),
    defaultValues: intake,
  });

  const imageDataUrl = watch("imageDataUrl");

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
  };

  return (
    <div className={styles.page}>
      <PipelineToolbar />
      <div className={styles.header}>
        <h1>Intake Form</h1>
        <p>Fill this first. It drives every later page in the V4 workflow.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className={styles.grid}>
        <section className={styles.card}>
          <h2>Source image</h2>
          <div className={styles.formGrid}>
            <div>
              <label>Upload product image</label>
              <input type="file" accept="image/*" onChange={(e) => onFileChange(e.target.files?.[0] ?? null)} />
            </div>
            <div>
              <label>Source resolution</label>
              <input {...register("sourceResolution")} placeholder="5000 x 5000" />
              {errors.sourceResolution && <p>{errors.sourceResolution.message}</p>}
            </div>
            <div>
              <label>Product occupies % of frame</label>
              <input {...register("productCoverage")} placeholder="80" />
            </div>
            <div>
              <label>Available views</label>
              <input {...register("availableViews")} placeholder="front only / front+back / multi-view" />
            </div>
          </div>
          {imageDataUrl ? <img src={imageDataUrl} alt="Preview" className={pipelineStyles.preview} style={{ marginTop: 16, maxWidth: 280 }} /> : null}
        </section>
        <section className={styles.card}>
          <h2>Output request</h2>
          <div className={styles.formGrid}>
            <div><label>Aspect ratio</label><select {...register("aspectRatio")}><option>1:1</option><option>4:5</option><option>16:9</option><option>3:4</option></select></div>
            <div><label>Output pixel size</label><input {...register("outputSize")} placeholder="2000 x 2500" /></div>
            <div><label>Generation count</label><input {...register("generationCount")} placeholder="4" /></div>
            <div><label>Intended use</label><select {...register("intendedUse")}><option>Amazon gallery</option><option>A+ / PDP</option><option>Ads</option><option>Social</option></select></div>
          </div>
        </section>
        <section className={styles.card}>
          <h2>Scene and placement</h2>
          <div className={styles.formGrid}>
            <div><label>Scene types</label><textarea {...register("sceneTypes")} placeholder="minimal tabletop, kitchen counter, in-use hand-held" /></div>
            <div><label>Placement preference</label><textarea {...register("placementPreference")} placeholder="center hero, left-weighted, in-use" /></div>
            <div><label>Angle tolerance</label><select {...register("angleTolerance")}><option>same angle only</option><option>slight angle shift</option><option>significant angle change</option></select></div>
            <div><label>Style preference</label><textarea {...register("stylePreference")} placeholder="leave blank to infer from product type" /></div>
          </div>
        </section>
        <section className={styles.card}>
          <h2>Protection and approvals</h2>
          <div className={styles.formGrid}>
            <div><label>Preservation strictness</label><select {...register("strictness")}><option>maximum preservation</option><option>balanced</option><option>concept-first</option></select></div>
            <div><label>Elements that must never change</label><textarea {...register("mustPreserve")} placeholder="logo, critical text, icons" /></div>
            <div><label>Draft approval required?</label><select {...register("draftApproval")}><option>yes</option><option>no</option></select></div>
            <div><label>Max iteration rounds</label><input {...register("maxIterations")} placeholder="3" /></div>
          </div>
        </section>
        <div style={{ display: "flex", gap: 12 }}>
          <button type="submit" className={pipelineStyles.button}>Save intake</button>
          {isSubmitSuccessful ? <span>Saved to pipeline state.</span> : null}
        </div>
      </form>
    </div>
  );
}
