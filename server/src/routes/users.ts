import { searchUsersQuerySchema, updateProfileInputSchema, type SearchUsersQuery, type UpdateProfileInput } from "@sports-match/shared";
import { Router } from "express";
import type { FilterQuery } from "mongoose";
import { AppError } from "../errors";
import { requireAuth } from "../middleware/requireAuth";
import { validate } from "../middleware/validate";
import { validateQuery } from "../middleware/validateQuery";
import { toPublicUser, User, type UserFields } from "../models/User";
import { escapeRegExp } from "../util/escapeRegExp";

export const usersRouter = Router();

// Documented cap (see phase 2 spec): no pagination yet at current scale.
const SEARCH_RESULT_CAP = 50;

usersRouter.patch("/me", requireAuth, validate(updateProfileInputSchema), async (req, res) => {
  const updates = req.body as UpdateProfileInput;
  const user = await User.findByIdAndUpdate(req.session.userId, { $set: updates }, { new: true });
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "You must be logged in");
  }
  res.json({ user: toPublicUser(user) });
});

usersRouter.get("/search", requireAuth, validateQuery(searchUsersQuerySchema), async (req, res) => {
  // Express 5's req.query is a read-only getter; validateQuery parks the parsed result here.
  const { activity, city } = res.locals.query as SearchUsersQuery;
  const filter: FilterQuery<UserFields> = { _id: { $ne: req.session.userId } };
  if (activity) {
    filter.activities = activity;
  }
  if (city) {
    filter.city = { $regex: `^${escapeRegExp(city)}$`, $options: "i" };
  }
  const users = await User.find(filter).sort({ username: 1 }).limit(SEARCH_RESULT_CAP);
  res.json({ users: users.map(toPublicUser) });
});
