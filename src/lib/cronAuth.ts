export function isCronAuthed(req: Request) {
  return req.headers.get("x-cron-secret") === process.env.CRON_SECRET;
}

export function requireCronAuth(req: Request) {
  if (!isCronAuthed(req)) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  return null;
}
