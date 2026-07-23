import { SignJWT } from "jose";
import { adminAuth } from "./_firebaseAdmin.js";

const ISSUER = "tradebuilt";
const AUDIENCE = "tradebuilt-session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function secretKey() {
  return new TextEncoder().encode(process.env.SESSION_SECRET);
}

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

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(idToken);
  } catch {
    res.status(401).json({ error: "Invalid ID token" });
    return;
  }

  const sessionToken = await new SignJWT({ sub: decoded.uid })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());

  res.setHeader(
    "Set-Cookie",
    `session=${sessionToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}`
  );
  res.status(200).json({ ok: true });
}
