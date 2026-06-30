import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

const email = process.argv[2];
const password = process.argv[3] ?? process.env.ADMIN_PASSWORD;
const name = process.argv[4] ?? "Admin";

if (!email || !password) {
  console.error("Uso: npm run admin:create -- <email> <password> [nome]");
  console.error("Oppure imposta ADMIN_PASSWORD con email come primo argomento.");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const existing = await prisma.user.findUnique({ where: { email } });
  const passwordHash = await bcrypt.hash(password, 10);
  if (existing) {
    const updated = await prisma.user.update({
      where: { email },
      data: { passwordHash, role: "admin", status: "active", name },
    });
    console.log("USER_UPDATED", JSON.stringify({ id: updated.id, email: updated.email, role: updated.role }));
  } else {
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: "admin", status: "active" },
    });
    console.log("USER_CREATED", JSON.stringify({ id: user.id, email: user.email, role: user.role }));
  }
} catch (error) {
  console.error("ERROR", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
