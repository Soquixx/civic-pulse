# CivicPulse - Backend & AI API Routes
This document covers the backend and AI API routes implemented for **CivicPulse** using **Next.js App Router**, **TypeScript**, and Google's **Gemini AI SDK**.

The backend provides three core capabilities:

- 🎙️ Analyze citizen voice/transcript reports using Gemini AI
- 📍 Retrieve and prioritize civic issue hotspots
- 📄 Generate AI-powered executive funding proposals

---

## 1. Tech Stack

- **Next.js** — App Router
- **TypeScript**
- **Google Gemini**
- **`@google/generative-ai`** — Gemini API SDK
- Local JSON seed data for hotspot information

---

## 2. Setup

Install dependencies:

```bash
npm install

```

The project requires a Gemini API key.

Create a `.env.local` file:

```env
GEMINI_API_KEY=your_gemini_api_key

```

Then start the development server:

```bash
npm run dev

```

The API will be available at:

```text
http://localhost:3000

```

---

# 3. Seed Data

Hotspot seed data is located at:

```text
public/data/seed_data.json

```

The dataset currently contains **8 realistic civic hotspots** across:

- Varanasi
- Lucknow
- Patna
- Bengaluru

The frontend can use the hotspot API instead of accessing this JSON file directly.

---

# 4. API Routes

## 4.1 POST `/api/analyze-voice`

Analyzes a citizen's voice transcript and converts it into structured civic-issue data using Gemini.

### Request

```http
POST /api/analyze-voice
Content-Type: application/json

```

### Body

```json
{
  "transcript": "अस्सी घाट रोड पर बहुत बड़े गड्ढे हो गए हैं...",
  "language": "Hindi"
}

```

### AI Processing

Gemini is instructed to identify and return:

- Translated text
- Location
- Hazard type
- Urgency score
- Population impact
- Community need

The response is requested using:

```text
responseMimeType: application/json

```

so the frontend receives structured JSON rather than free-form AI text.

### Example Response

```json
{
  "translated_text": "There are very large potholes on Assi Ghat Road, which is causing many accidents here. Vehicles going to the hospital are also facing difficulties. Immediate repair is needed.",
  "location_name": "Assi Ghat Road",
  "hazard_type": "Potholes / Washout",
  "urgency_score": 5,
  "population_impact": "High / Local commuters and emergency hospital traffic",
  "community_need": "Emergency Hospital Transit Re-paving"
}

```

### CORS

The endpoint supports CORS and handles preflight `OPTIONS` requests.

---

# 5. GET `/api/get-hotspots`

Returns civic hotspots from the local seed data with calculated priority scores and color classifications.

## Basic Request

```http
GET /api/get-hotspots

```

---

## Role-Based Filtering

The API supports two role types.

### District User

Use:

```text
?role=district_varanasi

```

The API extracts the district name from:

```text
district_[name]

```

and performs a **case-insensitive district match**.

Example:

```http
GET /api/get-hotspots?role=district_varanasi

```

returns only Varanasi hotspots.

### National User

Use:

```text
?role=national_india

```

This returns hotspots across all supported districts.

---

## Color Filtering

Hotspots can optionally be filtered by priority color.

```http
GET /api/get-hotspots?role=national_india&color=red

```

Supported colors:

```text
red
yellow
green
all

```

---

## Priority Score

Each hotspot receives a deterministic `priority_score` based on the designated project formula.

The API also assigns a color tag based on the resulting score:

| PriorityColor |          |
| ------------- | -------- |
| High          | `red`    |
| Medium        | `yellow` |
| Low           | `green`  |

This means the frontend does **not** need to calculate priority or color itself.

Simply consume:

```json
{
  "priority_score": 83.5,
  "color": "red"
}

```

---

# 6. GET `/api/get-hotspots` — Example

### Request

```http
GET /api/get-hotspots?role=district_varanasi&color=all

```

### Expected Result

```text
Status: 200
CORS: Access-Control-Allow-Origin: *
Count: 3

```

Verified Varanasi hotspots:

| HotspotPriority ScoreColor      |       |           |
| ------------------------------- | ----- | --------- |
| Assi Ghat Main Road             | 83.5  | 🔴 red    |
| Sigra Crossing                  | 50.0  | 🟡 yellow |
| Sarnath Archeological Link Road | 19.45 | 🟢 green  |

---

## National Red Hotspots

### Request

```http
GET /api/get-hotspots?role=national_india&color=red

```

### Verified Result

```text
Status: 200
Count: 4

```

The returned red hotspots span:

- Varanasi
- Lucknow
- Patna
- Bengaluru

---

# 7. POST `/api/generate-brief`

Generates a **1-page Executive Funding Proposal** from hotspot information using Gemini.

### Request

```http
POST /api/generate-brief
Content-Type: application/json

```

The endpoint accepts hotspot data in the request body.

### AI Output

Gemini generates a Markdown proposal containing:

1. **Problem Summary**
2. **Policy Compliance**
3. **Population Impact**
4. **Budget Allocation**

The generated content is intended to be suitable for an executive/government funding context.

### Verified Output

The endpoint successfully generated a proposal containing:

- PMGSY/MoRTH policy compliance
- Expected population impact
- Approximately **60,000 daily residents**
- Detailed budget allocation
- Total proposed budget of **₹62,00,000**

---

# 8. CORS Support

All three API routes support CORS.

They also handle browser preflight requests using `OPTIONS`.

The verified response includes:

```http
Access-Control-Allow-Origin: *

```

This allows the frontend application to consume the APIs during development and integration.

---

# 9. Validation & Testing

All three endpoints were tested locally using the Next.js development server.

### `/api/get-hotspots`

- ✅ HTTP `200`
- ✅ CORS headers verified
- ✅ District filtering verified
- ✅ National filtering verified
- ✅ Color filtering verified
- ✅ Priority score calculation verified
- ✅ Color assignment verified

### `/api/analyze-voice`

- ✅ Hindi transcript tested
- ✅ Gemini response verified
- ✅ Structured JSON response verified
- ✅ Location extraction verified
- ✅ Hazard classification verified
- ✅ Urgency scoring verified
- ✅ Community need generation verified

### `/api/generate-brief`

- ✅ Hotspot data accepted
- ✅ Gemini proposal generation verified
- ✅ Markdown output verified
- ✅ Required proposal sections verified
- ✅ Budget calculation/output verified

---

# 10. Production Build

The project was also validated with:

```bash
npm run build

```

Build verification:

- ✅ TypeScript type checking passed
- ✅ No compilation errors
- ✅ Next.js optimization completed successfully
- ✅ API routes bundled successfully
- ✅ API routes correctly identified as dynamic server routes (`ƒ`)

---

# 11. Frontend Integration

The frontend can consume the APIs directly.

### Fetch Hotspots

```typescript
const response = await fetch(
  "/api/get-hotspots?role=district_varanasi&color=all"
);

const data = await response.json();

```

### Analyze a Voice Transcript

```typescript
const response = await fetch("/api/analyze-voice", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    transcript: "Citizen transcript here",
    language: "Hindi"
  })
});

const data = await response.json();

```

### Generate Executive Brief

```typescript
const response = await fetch("/api/generate-brief", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(hotspotData)
});

const markdown = await response.text();

```

> If the frontend is deployed separately from the Next.js backend, replace the relative `/api/...` URLs with the deployed backend base URL.

---

# 12. API Summary

| MethodEndpointPurpose |                       |                                         |
| --------------------- | --------------------- | --------------------------------------- |
| `POST`                | `/api/analyze-voice`  | Analyze citizen transcript using Gemini |
| `GET`                 | `/api/get-hotspots`   | Retrieve and prioritize civic hotspots  |
| `POST`                | `/api/generate-brief` | Generate an executive funding proposal  |

---

# 13. Frontend Responsibilities

The backend is responsible for:

- AI analysis
- Translation
- Hazard classification
- Urgency scoring
- Hotspot filtering
- Priority calculation
- Color classification
- Executive proposal generation
- CORS handling

The frontend can therefore focus on:

- Dashboard UI
- Maps/hotspot visualization
- Voice input
- Displaying AI analysis
- District/national role selection
- Priority color filters
- Executive brief presentation/download

---

## 14. Current Status

**Backend & AI API implementation: COMPLETE ✅**

All three API routes have been implemented, tested locally, and successfully passed the production build.

The backend is ready for frontend integration.