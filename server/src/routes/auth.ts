import { loginInputSchema, registerInputSchema, type LoginInput, type RegisterInput } from "@sports-match/shared";
import bcrypt from "bcryptjs";
import { Router, type Request } from "express";
import { AppError } from "../errors";
import { requireAuth } from "../middleware/requireAuth";
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

authRouter.post("/login", validate(loginInputSchema), async (req, res) => {
  const { username, password } = req.body as LoginInput;
  const user = await User.findOne({ username });
  const valid = user !== null && (await bcrypt.compare(password, user.passwordHash));
  if (!valid || user === null) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid username or password");
  }
  await regenerateSession(req);
  req.session.userId = user.id as string;
  res.json({ user: toPublicUser(user) });
});

authRouter.post("/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      next(err);
      return;
    }
    res.clearCookie("connect.sid");
    res.status(204).end();
  });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.session.userId);
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "You must be logged in");
  }
  res.json({ user: toPublicUser(user) });
});
