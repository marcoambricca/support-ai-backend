import dotenv from "dotenv";
dotenv.config();

import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
// import "./src/jobs/email-reply-job.js";
import emailRouter from "./src/routes/email-clients-routes.js";
import userRouter from "./src/routes/user-routes.js";
import webhookRouter from "./src/routes/webhook-routes.js";
import whatsappRouter from "./src/routes/whatsapp-routes.js";
import tiendanubeRouter from "./src/routes/tiendanube-routes.js";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(cors());
app.use(helmet());

app.use(express.static(path.join(__dirname, "public")));

app.use('/email', emailRouter);
app.use('/user', userRouter);
app.use('/webhook', webhookRouter);
app.use('/whatsapp', whatsappRouter);
app.use('/tiendanube', tiendanubeRouter);

app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
