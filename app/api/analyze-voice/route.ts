import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// CORS Headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  try {
    const { user_text, language } = await request.json();

    if (!user_text || !language) {
      return Response.json(
        { error: 'Missing user_text or language in request body.' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!genAI) {
      return Response.json(
        { error: 'GEMINI_API_KEY is not configured on the server.' },
        { status: 500, headers: corsHeaders }
      );
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      systemInstruction: `You are an AI civic analyst for the Public Works Department (PWD).
Analyze the user text representing a voice transcript of a civic complaint.
Translate the text to English if it is in another language (like Hindi, Tamil, Telugu, etc.).
Identify and output the following details in a strict JSON format matching the schema below:
{
  "translated_text": "The English translation of the user's report",
  "location_name": "The specific street, neighborhood, district, or landmark mentioned",
  "hazard_type": "The category of hazard, e.g., 'Potholes / Washout', 'Bridge Damage', 'Waterlogging', 'Road Blockage', etc.",
  "urgency_score": 1-5 integer representing severity (1 is low, 5 is critical emergency)",
  "population_impact": "Estimated or described impact on residents, e.g., 'High / ~45,000 residents', 'Medium / local neighborhood'",
  "community_need": "The primary community need resulting from this hazard, e.g., 'Emergency Hospital Transit Re-paving', 'Drainage clearing'"
}
Return only the raw JSON. Do not include any extra markdown wrapper or text.`,
    });

    const prompt = `Language of original recording: ${language}\nVoice Transcript Text: "${user_text}"`;
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = result.response.text().trim();
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (e) {
      // Cleanup markdown codeblock markers if generated
      const cleanJson = responseText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      parsedData = JSON.parse(cleanJson);
    }

    return Response.json(parsedData, {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error: any) {
    console.error('Error in analyze-voice route:', error);
    return Response.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
