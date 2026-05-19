import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifyTokenEdge } from "@/lib/auth-edge";

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (UNSAFE.has(req.method) && pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin) {
      try {
        const o = new URL(origin);
        if (o.host !== host) {
          return NextResponse.json({ error: "origin non consentito" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "origin invalido" }, { status: 403 });
      }
    }
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/login") ||
    pathname === "/login" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const ok = await verifyTokenEdge(req.cookies.get(COOKIE_NAME)?.value, process.env.SESSION_SECRET);
  if (!ok) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
