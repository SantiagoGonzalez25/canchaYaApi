import { attendanceReport, enrollmentReport } from "@/lib/data/reports";
import { requireStaff, requireUser } from "@/lib/guard";
import { parseQuery, route } from "@/lib/http";
import { buildReportPdf } from "@/lib/reports/pdf";
import { reportQuerySchema } from "@/lib/schemas";

/**
 * GET /api/reports/:kind/pdf
 * `kind`: enrollments | attendance. Devuelve el PDF del reporte con los
 * mismos filtros y agrupación que los endpoints JSON.
 */
export const GET = route(
  async (request, ctx: { params: Promise<{ kind: string }> }) => {
    const user = await requireUser(request);
    requireStaff(user);
    const { kind } = await ctx.params;
    if (kind !== "enrollments" && kind !== "attendance") {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Tipo de reporte no encontrado" } },
        { status: 404 },
      );
    }

    const query = parseQuery(request, reportQuerySchema);
    if (user.role === "manager") query.teacherId = user.uid;

    const report =
      kind === "attendance"
        ? await attendanceReport(query)
        : await enrollmentReport(query);
    const pdf = await buildReportPdf(report);
    const fileName = `canchaya-${kind}-${report.from || "inicio"}-${report.to || "hoy"}.pdf`;

    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  },
);
