import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import { fileURLToPath } from 'url';
import express from "express";
import cors from "cors";
import './src/jobs/email-reply-job.js';

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
