import express, { type Request, type Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import urlRoutes from "./routes/urlRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { pinoHttp } from "pino-http";
import { logger } from "./utils/logger.js";
import { errorHandler } from "./middleWare/errorHandler.js";

dotenv.config();
const app = express();

const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));

app.get("/health", (req: Request, res: Response) => {
  res.json({ message: "Hello World!" });
});

app.use("/api/url", urlRoutes);
app.use("/api/auth", authRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server's live on port ${PORT}`);
});
