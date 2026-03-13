export type Strictness = "maximum preservation" | "balanced" | "concept-first";
export type AngleTolerance = "same angle only" | "slight angle shift" | "significant angle change";

export interface IntakeData {
  imageName: string;
  imageDataUrl: string;
  sourceResolution: string;
  productCoverage: string;
  availableViews: string;
  aspectRatio: string;
  outputSize: string;
  generationCount: string;
  intendedUse: string;
  sceneTypes: string;
  placementPreference: string;
  angleTolerance: AngleTolerance;
  stylePreference: string;
  strictness: Strictness;
  mustPreserve: string;
  draftApproval: string;
  maxIterations: string;
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
