import type { Request, Response } from "express";
import { OpenRouter } from "@openrouter/sdk";
import { getSystemPrompt } from "../prompts.js";

type Role = "user" | "assistant" | "system";

type ChatMessage = {
  role: Role;
  content: string;
};

export const chatMessages = async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: "Invalid messages format" });
    }

    const client = new OpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const formattedMessages: ChatMessage[] = [
      {
        role: "system",
        content: getSystemPrompt(),
      },
      ...messages.map(
        (msg: any): ChatMessage => ({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: String(msg.content),
        }),
      ),
    ];

    const response = await client.chat.send({
      chatRequest: {
        model: "poolside/laguna-m.1:free",
        messages: formattedMessages,
      },
    });

    const text = response?.choices?.[0]?.message?.content?.trim() || "";

    if (!text) {
      return res.status(500).json({ message: "Empty response from model" });
    }

    return res.json({ response: text });
  } catch (err: any) {
    console.error("Chat error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
