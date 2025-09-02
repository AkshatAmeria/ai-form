import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import e from "express";
import { error } from "console";

dotenv.config();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  })
);

const prisma = new PrismaClient();


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/submit", async (req, res) => {
  try {
    const { name, rollno, address } = req.body || {};
    if (!name || !rollno || !address) {
      return res.status(400).json({ error: "All fields required" });
    }

    const student = await prisma.student.create({
      data: { name, rollno, address },
    });

    res.json({ success: true, message: "Data saved successfully", data: student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});




app.post("/ai", async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ error: "Text is required" });

   
    const prompt = `
You are an information extraction system. 
Extract student details from the text below and return ONLY valid JSON. 
No markdown, no explanations, no extra text — only the JSON object.

Rules:
- "rollno" must always be an integer (not a string).
- "name" must always be a string.
- "address" must always be a string.
- Do not include any keys other than { "name", "rollno", "address" }.

Text: "${text}"

Return strictly:
{ "name": "string", "rollno": 123, "address": "string" }
    `;

    const result = await model.generateContent(prompt, {
      responseMimeType: "application/json", 
    });

    const responseText = result.response.text();

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      return res.status(500).json({ error: "AI response invalid", raw: responseText });
    }


    const rollnoInt = parseInt(parsed.rollno, 10);
    if (!parsed.name || !parsed.address || isNaN(rollnoInt)) {
      return res.status(400).json({ error: "Incomplete or invalid data from AI", data: parsed });
    }

   
    const student = await prisma.student.create({
      data: {
        name: parsed.name.trim(),
        rollno: rollnoInt,
        address: parsed.address.trim(),
      },
    });

    return res.json({ success: true, message: "AI auto-submitted form", data: student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI request failed" });
  }
});


// app.post("/ai", async (req, res) => {
//   try {
//     const { text } = req.body || {};
//     if (!text) return res.status(400).json({ error: "Text is required" });

//     const prompt = `
// Extract student details from this text into JSON:
// { "name": "string", "rollno": 123, "address": "string" }

// Text: "${text}"
// `;

//     const result = await model.generateContent(prompt);
//     const responseText = result.response.text();

//     let parsed;
//     try {
//       parsed = JSON.parse(responseText);
//     } catch {
//       return res.status(500).json({ error: "AI response invalid", raw: responseText });
//     }

//     const rollnoInt = parseInt(parsed.rollno, 10);
//     if (!parsed.name || !parsed.address || isNaN(rollnoInt)) {
//       return res.status(400).json({ error: "Invalid AI data", data: parsed });
//     }

//     // ✅ Return JSON to frontend (no DB insert yet)
//     return res.json({
//       success: true,
//       message: "AI extracted details. Ask user for confirmation.",
//       data: { name: parsed.name.trim(), rollno: rollnoInt, address: parsed.address.trim() }
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "AI request failed" });
//   }
// });



app.listen(5000, () => console.log("✅ Server running on http://localhost:5000"));
