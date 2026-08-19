import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { HOME_BY_ROLE, type AppRole } from "@/lib/types";

const PUBLIC_PATHS = ["/login", "/signup", "/auth"];

/**
 * Rafraîchit la session Supabase et applique la protection de routes :
 *  - non authentifié           → /login
 *  - authentifié sur /login    → tableau de bord de son rôle
 *  - accès à une zone d'un rôle qui n'est pas le sien → son propre tableau de bord
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  // Non authentifié → login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role as AppRole | undefined;
    const home = role ? HOME_BY_ROLE[role] : "/login";

    // Authentifié sur /login, /signup ou racine → son tableau de bord
    if (role && (path === "/login" || path === "/signup" || path === "/")) {
      const url = request.nextUrl.clone();
      url.pathname = home;
      return NextResponse.redirect(url);
    }

    // Cloisonnement par rôle : interdiction d'entrer dans la zone d'un autre rôle
    if (role) {
      for (const [r, base] of Object.entries(HOME_BY_ROLE)) {
        if (path.startsWith(base) && r !== role) {
          const url = request.nextUrl.clone();
          url.pathname = home;
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return response;
}
