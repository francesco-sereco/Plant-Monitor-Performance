import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { config } from "../../lib/config.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { optionalAuth, requireAuth } from "../../middleware/auth.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRouter = Router();

authRouter.use(optionalAuth);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== "active") {
      return res.status(401).json({ error: "Credenziali non valide" });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Credenziali non valide" });
    }
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      config.jwtSecret,
      { expiresIn: "8h" }
    );
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);

authRouter.get(
  "/status",
  asyncHandler(async (_req, res) => {
    res.json({ authEnabled: config.authEnabled });
  })
);
