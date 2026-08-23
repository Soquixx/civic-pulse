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

// Infer state from district name for legacy seed data
function inferStateFromDistrict(district: string): string {
  const districtLower = district.toLowerCase();
  const stateMap: Record<string, string> = {
    'varanasi': 'Uttar Pradesh', 'lucknow': 'Uttar Pradesh', 'agra': 'Uttar Pradesh',
    'prayagraj': 'Uttar Pradesh', 'ghaziabad': 'Uttar Pradesh',
    'patna': 'Bihar', 'gaya': 'Bihar', 'muzaffarpur': 'Bihar',
    'bengaluru': 'Karnataka', 'bengaluru urban': 'Karnataka', 'mysuru': 'Karnataka',
    'mumbai': 'Maharashtra', 'pune': 'Maharashtra', 'nagpur': 'Maharashtra',
    'chennai': 'Tamil Nadu', 'coimbatore': 'Tamil Nadu',
    'kolkata': 'West Bengal', 'howrah': 'West Bengal',
    'ahmedabad': 'Gujarat', 'surat': 'Gujarat',
    'jaipur': 'Rajasthan', 'jodhpur': 'Rajasthan',
    'bhopal': 'Madhya Pradesh', 'indore': 'Madhya Pradesh',
    'visakhapatnam': 'Andhra Pradesh', 'hyderabad': 'Telangana',
    'thiruvananthapuram': 'Kerala', 'kochi': 'Kerala',
    'ludhiana': 'Punjab', 'gurugram': 'Haryana',
    'bhubaneswar': 'Odisha', 'ranchi': 'Jharkhand',
    'guwahati': 'Assam', 'raipur': 'Chhattisgarh',
    'dehradun': 'Uttarakhand', 'shimla': 'Himachal Pradesh',
    'north goa': 'Goa', 'srinagar': 'Jammu and Kashmir',
    'chandigarh': 'Chandigarh', 'puducherry': 'Puducherry',
  };
  return stateMap[districtLower] || 'Unknown';
}

// Interface for state-level data structure
interface StateData {
  state: string;
  code: string;
  districts: string[];
  hotspots: any[];
}

// Interface for hotspot data
interface HotspotData {
  id: string;
  location_name: string;
  district: string;
  state?: string;
  latitude: number;
  longitude: number;
  hazard_type: string;
  complaint_count: number;
  urgency_score: number;
  pop_density_score: number;
  road_condition_index: number;
  population_impact: string;
  community_need: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role') || 'national_india';
    const colorFilter = searchParams.get('color') || 'all';
    const stateFilter = searchParams.get('state') || 'all';

    // Load both data sources
    let allHotspots: HotspotData[] = [];

    // 1. Load nationwide states data
    const statesFilePath = path.join(process.cwd(), 'public', 'data', 'states_data.json');
    try {
      const statesFileContent = await fs.readFile(statesFilePath, 'utf-8');
      const statesData: StateData[] = JSON.parse(statesFileContent);

      // Flatten state data into individual hotspots
      statesData.forEach(stateData => {
        stateData.hotspots.forEach(hotspot => {
          allHotspots.push({
            ...hotspot,
            state: stateData.state,
          });
        });
      });
    } catch (err) {
      console.error('Error reading states_data.json:', err);
      // Continue with legacy data if states data fails
    }

    // 2. Load legacy seed data for backward compatibility
    const legacyFilePath = path.join(process.cwd(), 'public', 'data', 'seed_data.json');
    try {
      const legacyFileContent = await fs.readFile(legacyFilePath, 'utf-8');
      const legacyData: HotspotData[] = JSON.parse(legacyFileContent);

      // Deduplicate by location_name + district (not just ID) to avoid duplicate markers
      const existingKeys = new Set(allHotspots.map(h => `${h.location_name}|${h.district}`.toLowerCase()));
      legacyData.forEach(hotspot => {
        const key = `${hotspot.location_name}|${hotspot.district}`.toLowerCase();
        if (!existingKeys.has(key)) {
          allHotspots.push({
            ...hotspot,
            state: hotspot.state || inferStateFromDistrict(hotspot.district),
          });
        }
      });
    } catch (err) {
      console.error('Error reading legacy seed_data.json:', err);
    }

    // 3. Filter by role (district or national)
    let filtered = [...allHotspots];
    if (role.startsWith('district_')) {
      const districtName = role.replace('district_', '').trim().toLowerCase();
      filtered = filtered.filter(h => h.district && h.district.toLowerCase() === districtName);
    } else if (role.startsWith('state_')) {
      const stateCode = role.replace('state_', '').trim().toUpperCase();
      filtered = filtered.filter(h => h.state && h.state.toLowerCase().includes(stateCode.toLowerCase()));
    } else if (role === 'national_india') {
      // Returns all Indian hotspots
    }

    // 4. Filter by state if specified
    if (stateFilter && stateFilter !== 'all') {
      filtered = filtered.filter(h => h.state && h.state.toLowerCase() === stateFilter.toLowerCase());
    }

    // 5. Enrich each hotspot with priority_score and color
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

    // 6. Filter by color tag
    let result = enriched;
    if (colorFilter && colorFilter !== 'all') {
      result = enriched.filter(h => h.color === colorFilter);
    }

    // 7. Return response with metadata
    return Response.json({
      hotspots: result,
      metadata: {
        total: result.length,
        totalNationwide: allHotspots.length,
        states: [...new Set(allHotspots.map(h => h.state).filter(Boolean))].sort(),
        districts: [...new Set(allHotspots.map(h => h.district).filter(Boolean))].sort(),
        hazardTypes: [...new Set(allHotspots.map(h => h.hazard_type).filter(Boolean))].sort(),
      }
    }, {
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
