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
    const { hotspot_data } = await request.json();

    if (!hotspot_data || typeof hotspot_data !== 'object') {
      return Response.json(
        { error: 'Missing or invalid hotspot_data in request body.' },
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
      systemInstruction: `You are an AI civic planning specialist working with the Public Works Department (PWD).
Your task is to write an official, professional, 1-page Executive Funding Proposal based on the provided hotspot data.
The response must be formatted in clean Markdown.
It must include:
1. Executive Summary / Problem Summary: Detailing the hazard type, specific location, severity, and urgency.
2. Real-Time Policy Compliance: Explicitly reference alignment with government standards such as the Pradhan Mantri Gram Sadak Yojana (PMGSY) or the Ministry of Road Transport and Highways (MoRTH) guidelines.
3. Expected Population Impact: Detail the estimated community impact and benefits of addressing the issue, referencing population density or impact descriptions.
4. Estimated Budget Allocation Recommendation: Recommend a breakdown of funding needed to resolve the hazard based on the urgency, complaint count, and scale.
Maintain an official, formal, and authoritative tone suitable for presentation to government treasury officers and senior engineers.`,
    });

    const prompt = `Generate a PWD Executive Funding Proposal for the following hotspot data:
${JSON.stringify(hotspot_data, null, 2)}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const responseText = result.response.text();

    return Response.json(
      { proposal: responseText },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in generate-brief route:', error);
    return Response.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
