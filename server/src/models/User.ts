import type { PublicUser } from "@sports-match/shared";
import mongoose, { type HydratedDocument } from "mongoose";

export interface UserFields {
  username: string;
  passwordHash: string;
  age: number | null;
  city: string;
  gender: "male" | "female" | "other" | "";
  image: string;
  activities: string[];
  trainer: boolean;
  trainerBio: string;
}

const userSchema = new mongoose.Schema<UserFields>({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  age: { type: Number, default: null },
  city: { type: String, default: "" },
  gender: { type: String, default: "" },
  image: { type: String, default: "" },
  activities: { type: [String], default: [] },
  trainer: { type: Boolean, default: false },
  trainerBio: { type: String, default: "" },
});

export const User = mongoose.model<UserFields>("User", userSchema);
export type UserDoc = HydratedDocument<UserFields>;

export function toPublicUser(user: UserDoc): PublicUser {
  return {
    id: user.id as string,
    username: user.username,
    age: user.age,
    city: user.city,
    gender: user.gender,
    image: user.image,
    activities: user.activities,
    trainer: user.trainer,
    trainerBio: user.trainerBio,
  };
}
