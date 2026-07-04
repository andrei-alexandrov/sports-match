import { registerInputSchema, type RegisterInput } from "@sports-match/shared";
import bcrypt from "bcryptjs";
import { Router, type Request } from "express";
import { AppError } from "../errors";
import { validate } from "../middleware/validate";
import { toPublicUser, User } from "../models/User";

export const authRouter = Router();

/** Session fixation defense: always mint a fresh session id at privilege change. */
export function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
}

authRouter.post("/register", validate(registerInputSchema), async (req, res) => {
  const { username, password } = req.body as RegisterInput;
  const existing = await User.findOne({ username });
  if (existing) {
    throw new AppError(409, "USERNAME_TAKEN", "Username already exists");
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, passwordHash });
  await regenerateSession(req);
  req.session.userId = user.id as string;
  res.status(201).json({ user: toPublicUser(user) });
});
