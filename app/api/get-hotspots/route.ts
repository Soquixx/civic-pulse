import { NextRequest } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export const dynamic = 'force-dynamic';

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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role') || 'national_india';
    const colorFilter = searchParams.get('color') || 'all';

    const filePath = path.join(process.cwd(), 'public', 'data', 'seed_data.json');
    let rawData: any[];
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      rawData = JSON.parse(fileContent);
    } catch (err) {
      console.error('Error reading seed_data.json:', err);
      return Response.json(
        { error: 'Seed data file not found or invalid on the server.' },
        { status: 500, headers: corsHeaders }
      );
    }

    // 1. Filter by role
    let filtered = [...rawData];
    if (role.startsWith('district_')) {
      const districtName = role.replace('district_', '').trim().toLowerCase();
      filtered = filtered.filter(h => h.district && h.district.toLowerCase() === districtName);
    } else if (role === 'national_india') {
      // Returns all Indian hotspots
    }

    // 2. Enrich each hotspot with priority_score and color
    const enriched = filtered.map(hotspot => {
      const complaint_count = Number(hotspot.complaint_count) || 0;
      const urgency_score = Number(hotspot.urgency_score) || 0;
      const pop_density_score = Number(hotspot.pop_density_score) || 0;
      const road_condition_index = Number(hotspot.road_condition_index) || 0;

      // Deterministic priority_score formula:
      // (0.35 * complaint_count) + (0.30 * urgency_score * 20) + (0.20 * pop_density_score) + (0.15 * (100 - road_condition_index))
      const priority_score_raw = (0.35 * complaint_count) + 
                                 (0.30 * urgency_score * 20) + 
                                 (0.20 * pop_density_score) + 
                                 (0.15 * (100 - road_condition_index));
      
      const priority_score = parseFloat(priority_score_raw.toFixed(2));

      // Color tag assignments:
      // priority_score >= 80 -> "red"
      // priority_score >= 50 and < 80 -> "yellow"
      // priority_score < 50 -> "green"
      let color = 'green';
      if (priority_score >= 80) {
        color = 'red';
      } else if (priority_score >= 50) {
        color = 'yellow';
      }

      return {
        ...hotspot,
        priority_score,
        color,
      };
    });

    // 3. Filter by color tag
    let result = enriched;
    if (colorFilter && colorFilter !== 'all') {
      result = enriched.filter(h => h.color === colorFilter);
    }

    return Response.json(result, {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error: any) {
    console.error('Error in get-hotspots route:', error);
    return Response.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
