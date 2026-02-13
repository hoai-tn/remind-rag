import app from "./app";
import dotenv from "dotenv";
import { initDb } from "./db/pool";
import { ai } from "./services/embedder";

dotenv.config();

const PORT = process.env.PORT || 3001;

initDb()
  .then(() => {
    console.log("Database initialized successfully.");
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
