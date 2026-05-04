import type { Request, Response } from "express";
import { OpenRouter } from "@openrouter/sdk";
import { BASE_PROMPT } from "../prompts.js";
import { reactBasePrompt } from "../defaults/reactPrompt.js";
import { nodeBasePrompt } from "../defaults/nodePrompt.js";

export const templateReturn = async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;

    const client = new OpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const response = await client.chat.send({
      chatRequest: {
        model: "tencent/hy3-preview:free",
        messages: [
          {
            role: "system",
            content:
              "You are a classifier. Based on the user's prompt, decide whether the project is primarily frontend or backend. Respond with exactly one word: 'react' or 'node'.",
          },
          { role: "user", content: prompt },
        ],
      },
    });

    const answer = response?.choices[0]?.message?.content?.trim();

    if (answer !== "react" && answer !== "node") {
      return res.status(403).json({ message: "you can't access" });
    }

    if (answer === "react") {
      res.json({
        prompts: [
          BASE_PROMPT,
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [reactBasePrompt],
      });
      return;
    }

    if (answer === "node") {
      res.json({
        prompts: [
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodeBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [nodeBasePrompt],
      });
      return;
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
