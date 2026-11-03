import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { REPORT_GROUP_LABELS } from "../labels";
import type { ReportResult, ReportRow } from "../types";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const GREEN = rgb(0, 0.396, 0.18);
const DARK = rgb(0.06, 0.09, 0.16);
const MUTED = rgb(0.28, 0.33, 0.41);
const SOFT = rgb(0.96, 0.98, 0.93);
const BORDER = rgb(0.84, 0.88, 0.82);

function safeText(value: string | number): string {
  return String(value)
    .replace(/\r?\n/g, " ")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u00b7/g, "-")
    .replace(/\u2192/g, "->")
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "");
}

function fitText(
  value: string | number,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string {
  const text = safeText(value);
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = `${text.slice(0, mid)}...`;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) low = mid;
    else high = mid - 1;
  }
  return `${text.slice(0, low)}...`;
}

function formatGeneratedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return safeText(value);
  try {
    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Bogota",
    }).format(date);
  } catch {
    return date.toISOString().replace("T", " ").slice(0, 16);
  }
}

interface MatrixRow {
  label: string;
  values: number[];
}

function buildMatrix(report: ReportResult): { series: string[]; rows: MatrixRow[] } {
  const labels = new Map<string, string>();
  for (const series of report.series) {
    for (const point of series.points) labels.set(point.key, point.label);
  }
  const keys = [...labels.keys()];
  if (report.groupBy === "date" || report.groupBy === "week" || report.groupBy === "month") {
    keys.sort((a, b) => a.localeCompare(b));
  }
  return {
    series: report.series.map((item) => item.name),
    rows: keys.map((key) => ({
      label: labels.get(key) ?? key,
      values: report.series.map(
        (series) => series.points.find((point) => point.key === key)?.value ?? 0,
      ),
    })),
  };
}

interface TableOptions {
  headers: string[];
  rows: (string | number)[][];
  widths: number[];
  fontSize?: number;
  rowHeight?: number;
  onNewPage: () => void;
  ensureSpace: (height: number) => void;
  page: () => PDFPage;
  y: () => number;
  setY: (value: number) => void;
}

function drawTable(
  options: TableOptions,
  font: PDFFont,
  bold: PDFFont,
): void {
  const fontSize = options.fontSize ?? 8;
  const rowHeight = options.rowHeight ?? 14;
  const headerHeight = 18;

  const drawHeader = () => {
    const page = options.page();
    const currentY = options.y();
    page.drawRectangle({
      x: MARGIN,
      y: currentY - headerHeight,
      width: CONTENT_WIDTH,
      height: headerHeight,
      color: SOFT,
    });
    let x = MARGIN;
    options.headers.forEach((header, index) => {
      const width = options.widths[index] ?? 0;
      page.drawText(fitText(header, bold, 7.5, width - 8), {
        x: x + 4,
        y: currentY - 12,
        size: 7.5,
        font: bold,
        color: GREEN,
      });
      x += width;
    });
    options.setY(currentY - headerHeight);
  };

  const drawRow = (row: (string | number)[]) => {
    options.ensureSpace(rowHeight);
    const page = options.page();
    const currentY = options.y();
    let x = MARGIN;
    row.forEach((value, index) => {
      const width = options.widths[index] ?? 0;
      page.drawText(fitText(value, font, fontSize, width - 8), {
        x: x + 4,
        y: currentY - rowHeight + 4,
        size: fontSize,
        font,
        color: DARK,
      });
      x += width;
    });
    page.drawLine({
      start: { x: MARGIN, y: currentY - rowHeight },
      end: { x: MARGIN + CONTENT_WIDTH, y: currentY - rowHeight },
      thickness: 0.4,
      color: BORDER,
    });
    options.setY(currentY - rowHeight);
  };

  options.ensureSpace(headerHeight + rowHeight);
  drawHeader();
  for (const row of options.rows) {
    if (options.y() - rowHeight < MARGIN) {
      options.onNewPage();
      drawHeader();
    }
    drawRow(row);
  }
}

export async function buildReportPdf(report: ReportResult): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pages: PDFPage[] = [];
  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  pages.push(page);
  let cursorY = PAGE_HEIGHT - MARGIN;

  const newPage = () => {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    cursorY = PAGE_HEIGHT - MARGIN;
  };

  const ensureSpace = (height: number) => {
    if (cursorY - height < MARGIN) newPage();
  };

  const text = (
    value: string | number,
    x: number,
    yPosition: number,
    size: number,
    selectedFont: PDFFont,
    color: RGB = DARK,
  ) => {
    page.drawText(safeText(value), {
      x,
      y: yPosition,
      size,
      font: selectedFont,
      color,
    });
  };

  const section = (title: string) => {
    ensureSpace(36);
    text(title, MARGIN, cursorY - 12, 12, bold, GREEN);
    cursorY -= 20;
    page.drawLine({
      start: { x: MARGIN, y: cursorY },
      end: { x: MARGIN + CONTENT_WIDTH, y: cursorY },
      thickness: 0.6,
      color: BORDER,
    });
    cursorY -= 10;
  };

  const groupLabel = REPORT_GROUP_LABELS[report.groupBy];
  const kindLabel = report.kind === "attendance" ? "asistencia" : "inscripciones";

  text("CanchaYa · Bienestar Institucional TdeA", MARGIN, PAGE_HEIGHT - MARGIN, 9, bold, GREEN);
  cursorY = PAGE_HEIGHT - MARGIN - 24;
  text(`Reporte de ${kindLabel}`, MARGIN, cursorY, 18, bold, GREEN);
  cursorY -= 22;
  text(
    `Agrupación: ${groupLabel} · Rango: ${report.from || "sin límite"} a ${report.to || "hoy"}`,
    MARGIN,
    cursorY,
    8.5,
    font,
    MUTED,
  );
  cursorY -= 12;
  text(`Generado: ${formatGeneratedAt(report.generatedAt)}`, MARGIN, cursorY, 8.5, font, MUTED);
  cursorY -= 20;

  const summary =
    report.kind === "attendance"
      ? [
          ["Registros", report.summary.total],
          ["Asistencias", report.summary.present],
          ["Ausencias", report.summary.absent],
          ["Tasa de asistencia", `${report.summary.attendanceRate}%`],
        ]
      : [
          ["Eventos", report.summary.total],
          ["Activas", report.summary.active],
          ["Canceladas", report.summary.canceled],
          [
            "Tasa de cancelación",
            `${
              report.summary.total > 0
                ? Math.round((report.summary.canceled / report.summary.total) * 100)
                : 0
            }%`,
          ],
        ];

  const cardGap = 8;
  const cardWidth = (CONTENT_WIDTH - cardGap * 3) / 4;
  const cardHeight = 46;
  ensureSpace(cardHeight + 14);
  summary.forEach(([label, value], index) => {
    const x = MARGIN + index * (cardWidth + cardGap);
    page.drawRectangle({
      x,
      y: cursorY - cardHeight,
      width: cardWidth,
      height: cardHeight,
      color: SOFT,
      borderColor: BORDER,
      borderWidth: 0.4,
    });
    text(String(label).toUpperCase(), x + 8, cursorY - 15, 6.8, font, MUTED);
    text(String(value), x + 8, cursorY - 34, 14, bold, GREEN);
  });
  cursorY -= cardHeight + 14;

  const matrix = buildMatrix(report);
  section(`Resumen por ${groupLabel.toLowerCase()}`);
  if (matrix.rows.length === 0) {
    text("Sin datos para los filtros seleccionados.", MARGIN, cursorY - 10, 9, font, MUTED);
    cursorY -= 18;
  } else {
    const firstWidth = 180;
    const seriesWidth = Math.max(
      45,
      (CONTENT_WIDTH - firstWidth) / Math.max(1, matrix.series.length),
    );
    const widths = [firstWidth, ...matrix.series.map(() => seriesWidth)];
    drawTable(
      {
        headers: [groupLabel, ...matrix.series],
        rows: matrix.rows.map((row) => [row.label, ...row.values]),
        widths,
        fontSize: 7.5,
        rowHeight: 13,
        onNewPage: newPage,
        ensureSpace,
        page: () => page,
        y: () => cursorY,
        setY: (value) => {
          cursorY = value;
        },
      },
      font,
      bold,
    );
    cursorY -= 14;
  }

  section(`Registros (${report.rows.length})`);
  if (report.rows.length === 0) {
    text("Sin registros para los filtros seleccionados.", MARGIN, cursorY - 10, 9, font, MUTED);
    cursorY -= 18;
  } else {
    const widths = [52, 92, 112, 76, 74, 70, 39];
    drawTable(
      {
        headers: ["Fecha", "Estudiante", "ACUDE", "Franja", "Escenario", "Docente", "Estado"],
        rows: report.rows.map((row: ReportRow) => [
          row.date,
          row.student,
          row.acude,
          row.slot,
          row.scenario,
          row.teacher,
          row.status,
        ]),
        widths,
        fontSize: 6.8,
        rowHeight: 13,
        onNewPage: newPage,
        ensureSpace,
        page: () => page,
        y: () => cursorY,
        setY: (value) => {
          cursorY = value;
        },
      },
      font,
      bold,
    );
  }

  pages.forEach((currentPage, index) => {
    currentPage.drawLine({
      start: { x: MARGIN, y: 30 },
      end: { x: MARGIN + CONTENT_WIDTH, y: 30 },
      thickness: 0.4,
      color: BORDER,
    });
    currentPage.drawText(
      safeText(`CanchaYa · Página ${index + 1} de ${pages.length} · Documento generado automáticamente`),
      { x: MARGIN, y: 18, size: 7, font, color: MUTED },
    );
  });

  doc.setTitle(`Reporte de ${kindLabel} - CanchaYa`);
  doc.setAuthor("CanchaYa · Bienestar Institucional TdeA");
  doc.setCreator("CanchaYa");
  return doc.save();
}
