import { next } from "@vercel/edge";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "session";
const ISSUER = "tradebuilt";
const AUDIENCE = "tradebuilt-session";

export const config = {
  matcher: [
    "/hvacr.html",
    "/hvacr-codex.html",
    "/hvacr-fundamentals.html",
    "/hvacr-fundamentals-tools.html",
    "/hvacr-fundamentals-tools-impact-drivers.html",
    "/hvacr-installation.html",
    "/hvacr-maintenance.html",
    "/hvacr-service.html",
    "/hvacr-simulations.html",
    "/hvacr-quizzes.html",
    "/follow-the-build.html",
    "/quizzes/the-refrigeration-cycle.html",
  ],
};

function secretKey() {
  return new TextEncoder().encode(process.env.SESSION_SECRET);
}

function readCookie(request, name) {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

export default async function middleware(request) {
  const cookie = readCookie(request, SESSION_COOKIE);

  if (cookie) {
    try {
      await jwtVerify(cookie, secretKey(), {
        algorithms: ["HS256"],
        issuer: ISSUER,
        audience: AUDIENCE,
      });
      return next();
    } catch {
      // fall through to redirect on invalid/expired token
    }
  }

  const url = new URL(request.url);
  const loginUrl = new URL("/login.html", url.origin);
  loginUrl.searchParams.set("next", url.pathname);
  return Response.redirect(loginUrl, 307);
}
