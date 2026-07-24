import { adminDb } from "./_firebaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const country = req.headers["x-vercel-ip-country"] || null;
  const region = req.headers["x-vercel-ip-country-region"] || null;
  const city = req.headers["x-vercel-ip-city"]
    ? decodeURIComponent(req.headers["x-vercel-ip-city"])
    : null;

  try {
    await adminDb().collection("pageViews").add({
      page: "homepage",
      country,
      region,
      city,
      timestamp: new Date(),
    });
  } catch (e) {
    res.status(500).json({ error: "Could not record view" });
    return;
  }

  res.status(200).json({ ok: true });
}
