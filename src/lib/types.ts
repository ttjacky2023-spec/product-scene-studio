export type Strictness = "maximum preservation" | "balanced" | "concept-first";
export type AngleTolerance = "same angle only" | "slight angle shift" | "significant angle change";
export type Locale = "en" | "zh";

export interface ImageAsset {
  name: string;
  dataUrl: string;
  resolution: string;
}

export interface IntakeData {
  imageName: string;
  imageDataUrl: string;
  sourceResolution: string;
  productCoverage: string;
  availableViews: string;
  aspectRatio: string;
  aspectRatioCustom: string;
  outputSize: string;
  outputSizeCustom: string;
  generationCount: string;
  intendedUse: string;
  sceneTypes: string;
  placementPreference: string;
  placementCustom: string;
  angleTolerance: AngleTolerance;
  angleDegrees: string;
  stylePreference: string;
  styleCustom: string;
  strictness: Strictness;
  mustPreserve: string;
  draftApproval: string;
  maxIterations: string;
  productFrameCoverageTarget: string;
  useReferenceImage: boolean;
  referenceImageName: string;
  referenceImageDataUrl: string;
  referenceAnalysisModel: string;
  sourceImages: ImageAsset[];
}

export interface AuditRow {
  zone: string;
  contains: string;
  importance: string;
  action: string;
  notes: string;
}

export interface QaScore {
  category: string;
  score: string;
  notes: string;
}
