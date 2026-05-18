import { formatDate } from "@/lib/utils";
import type { CertField, CertTemplate } from "@/lib/cert-template";
import { DEFAULT_TEMPLATE_FIELDS } from "@/lib/cert-template";

type CertProps = {
  certNumber: string;
  recipientName: string;
  recipientNim: string | null;
  courseTitle: string;
  labName: string;
  issuedAt: Date;
  qrPayload: string;
  passScore: number;
  finalScore?: number | null;
  /** When provided, render templated layout (background image + positioned fields). */
  template?: CertTemplate | null;
};

const CANVAS_W = 1100;

function resolveText(field: CertField, p: CertProps): string {
  if (field.text !== undefined && field.text !== "") return field.text;
  switch (field.key) {
    case "certNumberLabel":
      return `No: ${p.certNumber}`;
    case "certNumber":
      return p.certNumber;
    case "recipientName":
      return p.recipientName;
    case "recipientNim":
      return p.recipientNim ? `NIM: ${p.recipientNim}` : "";
    case "courseTitle":
      return p.courseTitle;
    case "labName":
      return p.labName;
    case "issuedAt":
      return `Diterbitkan ${formatDate(p.issuedAt)}`;
    case "passScore":
      return `Skor lulus min. ${p.passScore}%`;
    case "score":
      return typeof p.finalScore === "number" ? `Nilai: ${p.finalScore}%` : "";
    case "body":
      return [
        "telah berhasil menyelesaikan dan dinyatakan LULUS pada pelatihan",
        p.courseTitle,
        `yang diselenggarakan oleh ${p.labName}` +
          (typeof p.finalScore === "number" ? ` dengan nilai ${p.finalScore}%.` : "."),
      ].join("\n");
    default:
      return "";
  }
}

function FieldOverlay({
  field,
  content,
  qrPayload,
}: {
  field: CertField;
  content: string;
  qrPayload: string;
}) {
  if (field.key === "logo" || field.key === "signature") {
    if (!field.imageUrl) return null;
    const h = field.imageHeight ?? (field.key === "logo" ? 80 : 60);
    return (
      <div
        className="absolute"
        style={{
          left: `${field.x}%`,
          top: `${field.y}%`,
          transform: `translate(${field.align === "center" ? "-50%" : field.align === "right" ? "-100%" : "0"}, 0)`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={field.imageUrl} alt={field.key} style={{ height: h, width: "auto", objectFit: "contain" }} />
      </div>
    );
  }
  if (field.key === "qr") {
    const size = field.qrSize ?? 110;
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrPayload)}`;
    return (
      <div
        className="absolute flex flex-col items-center"
        style={{
          left: `${field.x}%`,
          top: `${field.y}%`,
          transform: "translate(-50%, 0)",
          width: `${field.width ?? 14}%`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrSrc} alt="QR verifikasi" style={{ width: size, height: size }} />
        <div style={{ fontSize: field.fontSize, color: field.color, marginTop: 4, textAlign: field.align }}>
          {field.text || "Scan untuk verifikasi"}
        </div>
      </div>
    );
  }
  if (!content) return null;
  const translateX = field.align === "center" ? "-50%" : field.align === "right" ? "-100%" : "0";
  return (
    <div
      className="absolute whitespace-pre-line"
      style={{
        left: `${field.x}%`,
        top: `${field.y}%`,
        transform: `translate(${translateX}, 0)`,
        width: `${field.width ?? 60}%`,
        fontSize: field.fontSize,
        fontWeight: field.fontWeight,
        color: field.color,
        fontFamily: field.fontFamily,
        textAlign: field.align,
        lineHeight: 1.25,
      }}
    >
      {content}
    </div>
  );
}

export function CertificateDocument(props: CertProps) {
  const tpl = props.template;
  const fields = tpl?.fields?.length ? tpl.fields : DEFAULT_TEMPLATE_FIELDS;
  const bgUrl = tpl?.backgroundUrl;

  return (
    <div
      className="cert-doc relative mx-auto bg-white text-slate-900 border border-slate-200 rounded-md shadow-xl overflow-hidden"
      style={{
        width: CANVAS_W,
        maxWidth: "100%",
        aspectRatio: "1.414 / 1",
        backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {!bgUrl && (
        <>
          <div className="absolute inset-0 border-[12px] border-double border-amber-600 rounded-md pointer-events-none" />
          <div className="absolute inset-4 border border-amber-400/60 rounded pointer-events-none" />
        </>
      )}
      {fields.map((f, i) => (
        <FieldOverlay key={`${f.key}-${i}`} field={f} content={resolveText(f, props)} qrPayload={props.qrPayload} />
      ))}
    </div>
  );
}
