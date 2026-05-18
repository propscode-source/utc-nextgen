/**
 * Certificate template field schema. Coordinates are percentages of the
 * 1100×778 (A4 landscape ≈ 1.414) canvas so the layout scales responsively.
 */
export type CertFieldKey =
  | "title"
  | "subtitle"
  | "certNumberLabel"
  | "certNumber"
  | "intro"
  | "recipientName"
  | "recipientNim"
  | "body"
  | "courseTitle"
  | "labName"
  | "issuedAt"
  | "score"
  | "passScore"
  | "qr"
  | "logo"
  | "signature"
  | "signatureName"
  | "signatureTitle"
  | "footer"
  | "custom";

export type CertField = {
  key: CertFieldKey;
  /** Static text. For dynamic keys (recipientName, etc.) leave empty and template engine fills it. */
  text?: string;
  x: number; // 0..100 (% from left)
  y: number; // 0..100 (% from top)
  fontSize: number; // px (relative to 1100px wide canvas)
  fontWeight: number; // 100..900
  color: string;
  fontFamily?: string; // e.g. "serif" / "sans-serif"
  align: "left" | "center" | "right";
  /** Width as % of canvas. Defaults to 60 if omitted. */
  width?: number;
  /** For QR: size in px on the rendered canvas. */
  qrSize?: number;
  /** For logo / signature image fields. */
  imageUrl?: string;
  /** Image render height in px. Width auto-scales. */
  imageHeight?: number;
};

export type CertTemplate = {
  backgroundUrl: string;
  fields: CertField[];
};

export const DEFAULT_TEMPLATE_FIELDS: CertField[] = [
  { key: "subtitle", text: "UTC NextGen — Unsri Training Center", x: 50, y: 8, fontSize: 13, fontWeight: 600, color: "#a16207", align: "center", width: 80 },
  { key: "title", text: "SERTIFIKAT", x: 50, y: 18, fontSize: 56, fontWeight: 700, color: "#0f172a", fontFamily: "serif", align: "center", width: 80 },
  { key: "certNumberLabel", x: 50, y: 28, fontSize: 14, fontWeight: 400, color: "#64748b", fontFamily: "serif", align: "center", width: 80 },
  { key: "intro", text: "Dengan ini menerangkan bahwa", x: 50, y: 36, fontSize: 14, fontWeight: 400, color: "#475569", align: "center", width: 80 },
  { key: "recipientName", x: 50, y: 44, fontSize: 38, fontWeight: 700, color: "#0f172a", fontFamily: "serif", align: "center", width: 80 },
  { key: "recipientNim", x: 50, y: 52, fontSize: 12, fontWeight: 400, color: "#64748b", align: "center", width: 80 },
  { key: "body", x: 50, y: 62, fontSize: 14, fontWeight: 400, color: "#334155", align: "center", width: 80 },
  { key: "issuedAt", x: 12, y: 86, fontSize: 12, fontWeight: 600, color: "#1e293b", align: "left", width: 30 },
  { key: "qr", x: 50, y: 86, fontSize: 11, fontWeight: 400, color: "#64748b", align: "center", width: 14, qrSize: 110 },
  { key: "footer", text: "UTC NextGen — Sistem Otomatis", x: 88, y: 86, fontSize: 12, fontWeight: 600, color: "#1e293b", align: "right", width: 30 },
];

export function isCertTemplate(v: unknown): v is CertTemplate {
  return !!v && typeof v === "object" && "backgroundUrl" in (v as object) && Array.isArray((v as CertTemplate).fields);
}
