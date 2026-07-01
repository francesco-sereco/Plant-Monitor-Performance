/** Same-origin in produzione; override con NEXT_PUBLIC_API_URL solo in dev separato. */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("pmp_token");
}

export async function downloadApiFile(path: string, filename: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error ?? "Download fallito", res.status);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body.error ?? "Errore API";

    if (res.status === 401 && !path.includes("/auth/login") && typeof window !== "undefined") {
      setAuthToken(null);
      const redirect = encodeURIComponent(window.location.pathname);
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = `/login?redirect=${redirect}`;
      }
    }

    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get("content-type");
  if (contentType?.includes("text/csv")) {
    return (await res.text()) as T;
  }
  return res.json();
}

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("pmp_token", token);
  else localStorage.removeItem("pmp_token");
}

export type Sector = { id: string; name: string; description?: string; active: boolean };
export type Customer = {
  id: string;
  code: string;
  businessName: string;
  sectorId: string;
  sector?: Sector;
  city?: string;
  province?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: string;
  notes?: string;
  plants?: Plant[];
};
export type PlantType = { id: string; name: string; description?: string; active: boolean };
export type Plant = {
  id: string;
  customerId: string;
  plantTypeId: string;
  name: string;
  description?: string;
  serialNumber?: string;
  location?: string;
  status: string;
  customer?: Customer;
  plantType?: PlantType;
};
export type Unit = { id: string; symbol: string; name: string };
export type ChemicalParameter = {
  id: string;
  code: string;
  name: string;
  defaultUnitId?: string;
  defaultUnit?: Unit;
  active: boolean;
  isNumeric: boolean;
};
export type SamplingPoint = { id: string; name: string; sortOrder: number; active: boolean };
export type Limit = {
  id: string;
  chemicalParameterId: string;
  unitId: string;
  scopeType: string;
  scopeId?: string;
  minValue?: number;
  maxValue?: number;
  legalReferenceText?: string;
  active: boolean;
  chemicalParameter?: ChemicalParameter;
  unit?: Unit;
};
export type Measurement = {
  id: string;
  valueNumeric?: number;
  valueText?: string;
  complianceStatus: string;
  limitMinSnapshot?: number;
  limitMaxSnapshot?: number;
  chemicalParameter: ChemicalParameter;
  samplingPoint: SamplingPoint;
  unit: Unit;
};
export type MeasurementSession = {
  id: string;
  customerId: string;
  plantId: string;
  measurementDate: string;
  sourceType: string;
  technicianName?: string;
  status: string;
  customer?: Customer & { sector?: Sector };
  plant?: Plant & { plantType?: PlantType };
  measurements: Measurement[];
};
export type Document = {
  id: string;
  originalFilename: string;
  fileSize: number;
  uploadedAt: string;
  customer?: Customer;
  plant?: Plant;
  documentType: string;
};
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
};
export type ImportPreview = {
  customerName?: string;
  plantName?: string;
  measurementDate?: string;
  technicianName?: string;
  laboratoryName?: string;
  parameters: ImportPreviewParameter[];
  warnings: string[];
};
export type PdfImportJob = {
  id: string;
  status: string;
  parserType?: string;
  structuredOutputJson?: ImportPreview;
  errorMessage?: string;
  createdAt: string;
  document: Document & { customer?: Customer; plant?: Plant };
};
