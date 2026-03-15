import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { factoryRouter } from "./routers/factory";
import { stripeRouter } from "./routers/stripe";
import { bulkRouter } from "./routers/bulk";
import { verifySupabaseToken, isEmailAllowed, isEmailAdmin } from "./_core/supabaseAuth";
import { SignJWT } from "jose";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  
  exchangeSupabaseToken: publicProcedure
    .input(z.object({ accessToken: z.string(), refreshToken: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const payload = await verifySupabaseToken(input.accessToken);
      if (!payload) throw new TRPCError({ code: "UNAUTHORIZED", message: "Nieprawidłowy token Supabase" });
      const email = payload.email ?? "";
      if (!isEmailAllowed(email)) throw new TRPCError({ code: "FORBIDDEN", message: "Brak dostępu — email nie jest na liście dozwolonych" });
      const isAdmin = isEmailAdmin(email);
      const openId = `supabase:${payload.sub}`;
      await db.upsertUser({
        openId,
        name: payload.user_metadata?.full_name ?? payload.user_metadata?.name ?? email.split("@")[0] ?? null,
        email,
        loginMethod: "supabase_otp",
        lastSignedIn: new Date(),
        ...(isAdmin ? { role: "admin" } : {}),
      });
      const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? "ofshore-secret-2026");
      const sessionToken = await new SignJWT({ openId, email, role: isAdmin ? "admin" : "user" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("365d")
        .sign(secret);
      ctx.res.cookie(COOKIE_NAME, sessionToken, getSessionCookieOptions());
      return { success: true, role: isAdmin ? "admin" : "user" };
    }),
}),
  factory: factoryRouter,
  stripe: stripeRouter,
  bulk: bulkRouter,
});

export type AppRouter = typeof appRouter;
