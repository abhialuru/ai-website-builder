import dotenv from "dotenv";
import express from "express";
import { templateReturn } from "./services/template.service.js";
import { chatMessages } from "./services/chat.service.js";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/template", templateReturn);
app.post("/chat", chatMessages);

app.listen(5000);
