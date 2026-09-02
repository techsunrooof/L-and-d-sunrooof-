import { NextResponse, type NextRequest } from "next/server";
import { LEARNER_COOKIE } from "@/lib/constants";

/*
  Guarantee every request carries an anonymous learner cookie, so pages can read
  it synchronously during render. Edge-safe: only mints a UUID and sets a cookie.
  (Next 16's "proxy" convention — formerly "middleware".)
*/
export function proxy(request: NextRequest) {
  if (request.cookies.get(LEARNER_COOKIE)?.value) {
    return NextResponse.next();
  }
  const id = crypto.randomUUID();
  // Make the new cookie visible to THIS request's render…
  request.cookies.set(LEARNER_COOKIE, id);
  const response = NextResponse.next({ request });
  // …and persist it on the client for next time.
  response.cookies.set(LEARNER_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export const config = {
  // Everything except Next internals and always-public static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|thumbnails|brand).*)"],
};
