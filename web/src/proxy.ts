import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf : fichiers statiques, images, favicon,
     * manifeste, service worker et page hors-ligne (sinon ils seraient
     * redirigés vers /login et casseraient la PWA).
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|.*\\.(?:js|css|json|svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|map)$).*)",
  ],
};
