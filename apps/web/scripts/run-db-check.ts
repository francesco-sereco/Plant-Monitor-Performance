import "../server/lib/env.js";
import { runDatabaseKeepaliveCheck } from "../server/modules/system-checks/db-check.service.js";

const force = process.argv.includes("--force");

runDatabaseKeepaliveCheck({ force })
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    if (!result.skipped && result.check.status === "error") {
      process.exitCode = 1;
    }
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("../server/lib/prisma.js");
    await prisma.$disconnect();
  });
