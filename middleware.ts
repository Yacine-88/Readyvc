import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware: refreshes Supabase session cookies on every request.
 * When Supabase env vars are not configured this is a passthrough.
 */
export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured, pass through
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next();
  }

  try {
    // Dynamically import to avoid bundler issues in dev (Turbopack)
    const { createServerClient } = await import("@supabase/ssr");
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    await supabase.auth.getUser();
    return supabaseResponse;
  } catch {
    // If import fails (e.g. Turbopack in dev), passthrough
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
