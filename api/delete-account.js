import { adminAuth, adminDb } from "./_firebaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { idToken } = req.body || {};
  if (!idToken) {
    res.status(400).json({ error: "Missing idToken" });
    return;
  }

  let uid;
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    res.status(401).json({ error: "Invalid ID token" });
    return;
  }

  try {
    await adminDb().recursiveDelete(adminDb().doc(`users/${uid}`));
    await adminAuth().deleteUser(uid);
  } catch (e) {
    res.status(500).json({ error: "Could not delete account" });
    return;
  }

  res.setHeader(
    "Set-Cookie",
    "session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
  );
  res.status(200).json({ ok: true });
}
