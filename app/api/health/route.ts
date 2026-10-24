/** Comprueba que el servidor responde, sin tocar Firebase. */
export async function GET() {
  return Response.json({
    status: "ok",
    service: "canchaya_api",
    timestamp: new Date().toISOString(),
  });
}
