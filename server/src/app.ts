import express from "express";
import cors from "cors";
import documentsRouter from "./routes/documents";
import queryRouter from "./routes/query";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/documents", documentsRouter);
app.use("/api/query", queryRouter);

export default app;
