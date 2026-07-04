import { z } from "zod";
import { activityKeySchema } from "./activities";

export const registerInputSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters long")
    .max(30, "Username must be at most 30 characters long")
    .regex(/^[a-zA-Z]/, "Username must start with a letter"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long")
    .max(72, "Password must be at most 72 characters long")
    .regex(/\d/, "Password must contain at least one number")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter"),
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const genderSchema = z.enum(["male", "female", "other"]).or(z.literal(""));
export type Gender = z.infer<typeof genderSchema>;

export const updateProfileInputSchema = z.object({
  age: z.number().int().min(0).max(100).nullable().optional(),
  city: z.string().max(100).optional(),
  gender: genderSchema.optional(),
  // Profile pictures travel as data URLs for now (prototype parity); real upload is a follow-up.
  image: z.string().max(2_000_000).optional(),
  activities: z
    .array(activityKeySchema)
    .transform((keys) => [...new Set(keys)])
    .optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

export const publicUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  age: z.number().int().nullable(),
  city: z.string(),
  gender: genderSchema,
  image: z.string(),
  activities: z.array(z.string()),
});
export type PublicUser = z.infer<typeof publicUserSchema>;

export const searchUsersQuerySchema = z.object({
  activity: activityKeySchema.optional(),
  city: z.string().trim().max(100).optional(),
});
export type SearchUsersQuery = z.infer<typeof searchUsersQuerySchema>;

export interface ApiErrorBody {
  error: { code: string; message: string };
}
