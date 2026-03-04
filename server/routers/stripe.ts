import { z } from "zod";
import Stripe from "stripe";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { orders, projects } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export const stripeRouter = router({
  // Create checkout session for a project bundle
  createCheckout: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      price: z.number().min(50), // cents, min $0.50
      title: z.string(),
      description: z.string().optional(),
      origin: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: input.title,
              description: input.description || "English Teaching Digital Resource Bundle",
              metadata: { projectId: input.projectId.toString() },
            },
            unit_amount: input.price,
          },
          quantity: 1,
        }],
        mode: "payment",
        allow_promotion_codes: true,
        customer_email: ctx.user.email || undefined,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          user_id: ctx.user.id.toString(),
          project_id: input.projectId.toString(),
          customer_email: ctx.user.email || "",
          customer_name: ctx.user.name || "",
        },
        success_url: `${input.origin}/dashboard?payment=success&project=${input.projectId}`,
        cancel_url: `${input.origin}/marketplace/${input.projectId}?payment=cancelled`,
      });

      // Create pending order
      await db.insert(orders).values({
        userId: ctx.user.id,
        projectId: input.projectId,
        stripeSessionId: session.id,
        amount: input.price,
        currency: "usd",
        status: "pending",
        productTitle: input.title,
        customerEmail: ctx.user.email || "",
      });

      return { url: session.url, sessionId: session.id };
    }),

  // Get user's orders
  myOrders: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(orders)
      .where(eq(orders.userId, ctx.user.id))
      .orderBy(orders.createdAt);
  }),

  // Get order stats for admin
  orderStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { total: 0, revenue: 0, paid: 0 };
    const allOrders = await db.select().from(orders).where(eq(orders.userId, ctx.user.id));
    const paid = allOrders.filter(o => o.status === "paid");
    return {
      total: allOrders.length,
      paid: paid.length,
      revenue: paid.reduce((sum, o) => sum + o.amount, 0),
    };
  }),
});
