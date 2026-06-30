import app from "./app.js";
import { config } from "./lib/config.js";

app.listen(config.port, () => {
  console.log(`API PMP in ascolto su http://localhost:${config.port}`);
});
