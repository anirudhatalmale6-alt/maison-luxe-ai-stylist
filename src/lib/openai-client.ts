export async function generateAssistantResponse(
  message: string,
  context: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Set it in your environment to use the OpenAI assistant path."
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let OpenAIConstructor: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const openaiModule = (await import(/* webpackIgnore: true */ "openai")) as any;
    OpenAIConstructor = openaiModule.default ?? openaiModule.OpenAI;
  } catch {
    throw new Error(
      'The optional "openai" package is not installed. Install it to use the OpenAI assistant path.'
    );
  }

  const openai = new OpenAIConstructor({ apiKey });
  const model = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

  const systemPrompt = `You are the AI personal stylist for MAISON LUXE, a high-end designer fashion house.
Answer the client's question using ONLY the provided catalog context.
Do not hallucinate products, prices, materials, or availability.
The house sells women's and men's ready-to-wear, outerwear, shoes, handbags, and accessories/fine jewellery.
When a client asks about a piece, help them style a complete look (shoes, bag, outerwear, jewellery) using only retrieved products.
If an item has stockCount === 0 or isInStock is false, say the piece is currently unavailable.

LAYER 2/3 CONTEXT RULES:
- Layer 3 (purchase history) is the BUYER'S own order history. Use it ONLY when the shopper asks about their own account or personal recommendations.
- When the shopper mentions a gift, friend, family member, or uses words like "their", do NOT assume the recipient wants what the buyer purchased. Ask about the recipient and base recommendations on what the shopper tells you.
- Do not reframe the shopper's message as being about themselves when they are asking about someone else.
- If purchase history is empty, missing, or says "none on file", NEVER state or imply the shopper has made recent purchases. Do not say "Considering your recent purchases", "Since you purchased...", or anything similar.
- If you lack enough information, ask a clarifying question instead of guessing.`;

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Catalog context:\n${context}\n\nShopper message:\n${message}`,
      },
    ],
  });

  const content = completion.choices?.[0]?.message?.content?.trim();
  if (!content) {
    return "I'm sorry, I couldn't generate a response based on the available catalog information.";
  }

  return content;
}
