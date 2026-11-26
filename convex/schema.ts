import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // One row per verified mobile number. Edit `status` in the Convex dashboard to hide a profile.
  profiles: defineTable({
    name: v.string(),
    phone: v.string(), // E.164, e.g. +919876543210. Unique.
    email: v.optional(v.string()),
    state: v.string(),
    locationMode: v.union(v.literal("city"), v.literal("pincode")),
    city: v.optional(v.string()),
    pincode: v.optional(v.string()),
    trade: v.optional(v.string()),
    jobProfile: v.string(),
    experience: v.optional(v.string()),
    expectedSalary: v.optional(v.string()),
    specialisation: v.optional(v.string()),
    status: v.union(v.literal("published"), v.literal("hidden")),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Lower-cased copies used only for matching searches.
    search: v.object({
      state: v.string(),
      city: v.string(),
      trade: v.string(),
      job: v.string(),
    }),
  })
    .index("by_phone", ["phone"])
    .index("by_created_at", ["createdAt"])
    .index("by_state_city", ["search.state", "search.city"])
    .index("by_state_pincode", ["search.state", "pincode"]),

  // Complaints. Update `status` / `resolutionNote` in the dashboard; the tracking page shows them.
  grievances: defineTable({
    ticket: v.string(), // KAM-XXXXXXXXXXXX
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    category: v.string(),
    profileUrl: v.optional(v.string()),
    details: v.string(),
    status: v.union(
      v.literal("received"),
      v.literal("in_review"),
      v.literal("resolved"),
      v.literal("rejected"),
    ),
    resolutionNote: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_ticket", ["ticket"]),
});
