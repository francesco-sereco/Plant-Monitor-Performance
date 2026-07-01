export type ImportDocumentType = "takeoff_report" | "lab_autocontrol";

export type ImportPreviewParameter = {
  code?: string;
  name?: string;
  value: number | string;
  unit?: string;
  samplingPoint?: string;
  chemicalParameterId?: string;
  unitId?: string;
  samplingPointId?: string;
  mapped?: boolean;
  autoCreated?: boolean;
  included?: boolean;
};

export type ImportPreview = {
  customerName?: string;
  customerCity?: string;
  customerAddress?: string;
  customerReference?: string;
  customerExists?: boolean;
  plantName?: string;
  measurementDate?: string;
  technicianName?: string;
  laboratoryName?: string;
  parameters: ImportPreviewParameter[];
  warnings: string[];
};
