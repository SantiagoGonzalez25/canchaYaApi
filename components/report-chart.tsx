"use client";

import { useEffect, useRef } from "react";
import type { ReportResult } from "@/lib/types";
import { secondaryButtonClass } from "./ui";

function buildMatrix(report: ReportResult) {
  const labels = new Map<string, string>();
  for (const series of report.series) {
    for (const point of series.points) labels.set(point.key, point.label);
  }
  const keys = [...labels.keys()];
  if (report.groupBy === "date" || report.groupBy === "week" || report.groupBy === "month") {
    keys.sort((a, b) => a.localeCompare(b));
  }
  const rows = keys.map((key) => [
    labels.get(key) ?? key,
    ...report.series.map(
      (series) => series.points.find((point) => point.key === key)?.value ?? 0,
    ),
  ]);
  return { keys, labels, rows };
}

export function ReportChart({
  report,
  height = 430,
}: {
  report: ReportResult;
  height?: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const serialized = JSON.stringify(report);

  useEffect(() => {
    let chart: { destroy: () => void } | null = null;
    let cancelled = false;
    const data = JSON.parse(serialized) as ReportResult;
    const current = buildMatrix(data);

    import("highcharts").then(({ default: Highcharts }) => {
      if (cancelled || !container.current) return;
      chart = Highcharts.chart(container.current, {
        chart: {
          type: "column",
          backgroundColor: "transparent",
          style: { fontFamily: "inherit" },
          height,
        },
        title: { text: undefined },
        credits: { enabled: false },
        colors: data.series.map((series) => series.color ?? "#0f766e"),
        xAxis: {
          categories: current.keys.map((key) => current.labels.get(key) ?? key),
          crosshair: true,
          labels: { style: { fontSize: "11px", color: "#64748b" } },
        },
        yAxis: {
          min: 0,
          title: {
            text: data.kind === "attendance" ? "Registros de asistencia" : "Inscripciones",
            style: { color: "#64748b", fontSize: "11px" },
          },
          allowDecimals: false,
          stackLabels: { enabled: false },
        },
        tooltip: { shared: true, valueSuffix: data.kind === "attendance" ? "" : "" },
        legend: {
          align: "left",
          verticalAlign: "bottom",
          itemStyle: { fontWeight: "600", fontSize: "11px", color: "#475569" },
        },
        plotOptions: {
          column: {
            stacking: "normal",
            borderWidth: 0,
            borderRadius: 4,
            maxPointWidth: 54,
          },
        },
        series: data.series.map((series) => ({
          name: series.name,
          data: current.keys.map(
            (key) => series.points.find((point) => point.key === key)?.value ?? 0,
          ),
          color: series.color,
        })),
        lang: { noData: "Sin datos para los filtros seleccionados" },
        noData: { style: { fontWeight: "500", color: "#94a3b8" } },
        responsive: {
          rules: [
            {
              condition: { maxWidth: 640 },
              chartOptions: {
                chart: { height: 360 },
                legend: { align: "center" },
              },
            },
          ],
        },
      });
    });

    return () => {
      cancelled = true;
      chart?.destroy();
    };
  }, [serialized, height]);

  return <div ref={container} className="w-full" style={{ height }} role="img" aria-label="Gráfica del reporte" />;
}

export function ReportActions({ report }: { report: ReportResult }) {
  const download = () => {
    const matrix = buildMatrix(report);
    const header = ["Dimensión", ...report.series.map((series) => series.name)];
    const lines = [header, ...matrix.rows];
    const csv = lines
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `canchaya-${report.kind}-${report.from || "inicio"}-${report.to || "hoy"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={download} className={secondaryButtonClass}>
        Exportar CSV
      </button>
      <button type="button" onClick={() => window.print()} className={secondaryButtonClass}>
        Imprimir
      </button>
    </div>
  );
}
