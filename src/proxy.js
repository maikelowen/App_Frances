import { clerkMiddleware } from "@clerk/nextjs/server";

// Solo adjunta la sesión a la petición. La autorización se comprueba en cada
// ruta con requireUser() (recomendación de Clerk v7, ver src/lib/requireUser.js).
export default clerkMiddleware({
  // Solo en desarrollo: tolera que el reloj del PC vaya desfasado (por defecto Clerk
  // admite 5 s y los tokens duran 60 s). En producción se mantiene el valor estricto.
  clockSkewInMs: process.env.NODE_ENV === "development" ? 120_000 : undefined,
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|git)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
