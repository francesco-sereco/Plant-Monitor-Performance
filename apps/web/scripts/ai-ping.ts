import "../server/lib/env.js";
import { pingAi } from "../server/modules/ai/ai.service.js";

const message = process.argv.slice(2).join(" ") || "Rispondi in una frase: cos'è il pH?";

pingAi(message)
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
