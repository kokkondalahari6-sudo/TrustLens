import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { LoginBody, LoginResponse, RegisterBody, RegisterResponse } from "@workspace/api-zod";
import { createToken } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const email = parsed.data.email.toLowerCase();
  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing[0]) {
    res.status(409).json({ error: "An account with that email already exists" });
    return;
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const [user] = await db.insert(usersTable).values({ email, passwordHash }).returning({ id: usersTable.id, email: usersTable.email });
  res.status(201).json(RegisterResponse.parse({ token: createToken(user.id), user }));
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email.toLowerCase())).limit(1);
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  res.json(LoginResponse.parse({ token: createToken(user.id), user: { id: user.id, email: user.email } }));
});

export default router;