import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import AuthRoutes from "./routes/AuthRoutes.js";

dotenv.config();
const PORT = process.env.port;
const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", AuthRoutes);

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
