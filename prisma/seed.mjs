import { PrismaClient } from "../src/generated/prisma/client.js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const dianaPassword = await bcrypt.hash("diana2026", 10);
  await prisma.user.upsert({
    where: { email: "diana@emberstone.ai" },
    update: {},
    create: {
      email: "diana@emberstone.ai",
      name: "Diana",
      hashedPassword: dianaPassword,
      role: "ADMIN",
    },
  });

  const danielPassword = await bcrypt.hash("daniel2026", 10);
  await prisma.user.upsert({
    where: { email: "daniel@emberstone.ai" },
    update: {},
    create: {
      email: "daniel@emberstone.ai",
      name: "Daniel",
      hashedPassword: danielPassword,
      role: "OWNER",
    },
  });

  console.log("Seeded: Diana (admin) + Daniel (owner)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
