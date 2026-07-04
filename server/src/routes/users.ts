import { updateProfileInputSchema, type UpdateProfileInput } from "@sports-match/shared";
import { Router } from "express";
import { AppError } from "../errors";
import { requireAuth } from "../middleware/requireAuth";
import { validate } from "../middleware/validate";
import { toPublicUser, User } from "../models/User";

export const usersRouter = Router();

usersRouter.patch("/me", requireAuth, validate(updateProfileInputSchema), async (req, res) => {
  const updates = req.body as UpdateProfileInput;
  const user = await User.findByIdAndUpdate(req.session.userId, { $set: updates }, { new: true });
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "You must be logged in");
  }
  res.json({ user: toPublicUser(user) });
});
