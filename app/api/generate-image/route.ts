import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            text: 'A minimalist corporate infographic diagram showing "Before" and "After". "Before" on the left is a tangled ball of messy connections and chaos. "After" on the right is a single straight, clear, glowing line leading to a target. Use dark blue and emerald green colors, clean modern tech style.',
          },
        ],
      },
    });

    let base64Image = "";
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.data) {
        base64Image = part.inlineData.data;
        break;
      }
    }

    if (!base64Image) {
      throw new Error("No image generated");
    }

    return NextResponse.json({ image: `data:image/png;base64,${base64Image}` });
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 },
    );
  }
}
