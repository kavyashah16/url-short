import express, { type Request, type Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import urlRoutes from "./routes/urlRoutes.js";

dotenv.config();
const app = express();

const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());

app.get("/health", (req: Request, res: Response) => {
  res.json({ message: "Hello World!" });
});

app.use("/api/url", urlRoutes);

app.listen(PORT, () => {
  console.log(`Server's live on port ${PORT}`);
});
