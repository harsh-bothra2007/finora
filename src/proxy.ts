import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Fast path: read the session from the cookie — no network call.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Only hit Supabase (to validate/refresh the token) when a session cookie
  // exists. Unauthenticated requests (landing, login, register, static
  // assets) must never depend on Supabase being reachable — otherwise a
  // temporary network outage breaks every page with "Failed to fetch".
  let user = session?.user ?? null;
  if (session) {
    try {
      const {
        data: { user: verifiedUser },
      } = await supabase.auth.getUser();
      user = verifiedUser;
    } catch {
      // Supabase unreachable — keep the cookie session instead of failing
      // the request or bouncing the user to /login.
      user = session.user ?? null;
    }
  }

  const pathname = request.nextUrl.pathname;

  // Protect dashboard and other authenticated routes
  if (!user && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from auth pages to dashboard
  if (
    user &&
    (pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/forgot-password")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};