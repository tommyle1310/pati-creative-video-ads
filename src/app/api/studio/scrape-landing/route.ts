/**
 * POST /api/studio/scrape-landing
 * Scrapes landing page URLs and uses Gemini to extract product info.
 *
 * Body: { urls: string[] }
 * Returns: { bigIdea, productInfo, targetAudience }
 */
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 300;

function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  return new GoogleGenAI({ apiKey: key });
}

async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    // Strip HTML tags, scripts, styles — keep text content
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000); // cap to avoid token explosion
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const { urls } = await req.json();
    if (!urls?.length) {
      return NextResponse.json(
        { error: "No URLs provided" },
        { status: 400 }
      );
    }

    // Scrape all URLs in parallel
    const texts = await Promise.all(
      (urls as string[])
        .filter((u: string) => u.trim())
        .map(async (url: string) => {
          const text = await fetchPageText(url);
          return text ? `--- Page: ${url} ---\n${text}` : "";
        })
    );

    const combined = texts.filter(Boolean).join("\n\n");
    if (!combined) {
      return NextResponse.json(
        { error: "Could not fetch any of the provided URLs" },
        { status: 400 }
      );
    }

    const ai = getClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [
            {
              text: `You are a product research assistant. From the landing page text below, extract:

1. **name**: The product name exactly as shown
2. **bigIdea**: The core value proposition / main hook of the product (1-2 sentences)
3. **productInfo**: Key product details — ingredients, benefits, pricing, USPs, format (gummy/capsule/powder), serving size, flavors, etc. Be comprehensive.
4. **targetAudience**: Who this product is marketed to based on the messaging, imagery descriptions, and language used.
5. **price**: The main product price as a number (no currency symbol). If multiple prices, use the most common/default one. null if not found.
6. **currency**: The currency code (USD, GBP, AUD, etc.) based on the page. Default "USD".
7. **variants**: An array of product variants/options found, each with: { name: string, price: number, sku?: string }. Empty array if no variants found.

Landing page content:
${combined}

Return a JSON object with keys: name, bigIdea, productInfo, targetAudience, price, currency, variants`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT" as const,
          properties: {
            name: { type: "STRING" as const },
            bigIdea: { type: "STRING" as const },
            productInfo: { type: "STRING" as const },
            targetAudience: { type: "STRING" as const },
            price: { type: "NUMBER" as const, nullable: true },
            currency: { type: "STRING" as const },
            variants: {
              type: "ARRAY" as const,
              items: {
                type: "OBJECT" as const,
                properties: {
                  name: { type: "STRING" as const },
                  price: { type: "NUMBER" as const },
                },
                required: ["name", "price"] as const,
              },
            },
          },
          required: ["name", "bigIdea", "productInfo", "targetAudience"] as const,
        },
      },
    });

    const result = JSON.parse(response.text!.trim());
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Scrape failed";
    console.error("[studio/scrape-landing]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
