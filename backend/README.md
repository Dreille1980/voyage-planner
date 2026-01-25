# Voyage Planner Backend

Backend API for the Voyage Planner mobile app, powered by OpenAI.

## 🚀 Features

- **AI-powered endpoints** using OpenAI GPT-4o-mini
- **3 main actions**:
  - `generate_checklist` - Generate personalized packing lists
  - `destination_info` - Get "Know before you go" travel info
  - `trip_qna` - Answer travel-related questions
- **Security**: CORS, rate limiting, Zod validation
- **TypeScript** with strict type checking

## 📦 Tech Stack

- Node.js + Express
- TypeScript
- OpenAI API
- Zod (validation)
- dotenv (environment variables)

## 🛠️ Local Development

### Prerequisites

- Node.js 18+
- npm
- OpenAI API key

### Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Create `.env` file:
```bash
OPENAI_API_KEY=sk-your-key-here
PORT=3000
```

3. Run development server:
```bash
npm run dev
```

Server runs on `http://localhost:3000`

### Build for production

```bash
npm run build
npm start
```

## 🧪 Testing the API

### Health check
```bash
curl http://localhost:3000/health
```

### Destination info
```bash
curl -X POST http://localhost:3000/ai \
  -H "Content-Type: application/json" \
  -d '{"action":"destination_info","tripProfile":{"destination":"Paris, France"}}'
```

### Generate checklist
```bash
curl -X POST http://localhost:3000/ai \
  -H "Content-Type: application/json" \
  -d '{"action":"generate_checklist","tripProfile":{"destination":"Tokyo, Japan","tripType":"family","travelers":[{"name":"Me","ageGroup":"adult"},{"name":"Kid","ageGroup":"kid"}]}}'
```

### Travel Q&A
```bash
curl -X POST http://localhost:3000/ai \
  -H "Content-Type: application/json" \
  -d '{"action":"trip_qna","tripProfile":{"destination":"Tokyo, Japan"},"question":"Do I need a power adapter?"}'
```

## 🌐 Deployment on Render.com

### Step 1: Push to GitHub

Make sure your code is committed and pushed to GitHub.

### Step 2: Create Render account

1. Go to [render.com](https://render.com)
2. Sign up with your GitHub account

### Step 3: Deploy

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Render will auto-detect the `render.yaml` configuration
4. Click **"Apply"**

### Step 4: Add environment variables

In the Render dashboard, go to **Environment** and add:

```
OPENAI_API_KEY = sk-your-openai-key-here
```

### Step 5: Deploy!

Click **"Manual Deploy"** → **"Deploy latest commit"**

Your API will be live at: `https://voyage-planner-backend.onrender.com`

## 🔄 Continuous Deployment

Once deployed, every push to your `main` branch will automatically redeploy your backend on Render.

## 📝 API Schema

### POST /ai

**Request Body:**
```typescript
{
  action: "generate_checklist" | "destination_info" | "trip_qna",
  tripProfile: {
    destination: string,
    startDate?: string,      // ISO format
    endDate?: string,
    tripType?: string,
    style?: string,
    budgetRange?: string,
    travelers?: Array<{
      name: string,
      ageGroup: "adult" | "teen" | "kid" | "baby",
      notes?: string
    }>
  },
  question?: string  // Required for trip_qna action
}
```

**Response:** JSON (varies by action)

## 🔐 Security

- ✅ CORS enabled (configure in production)
- ✅ Rate limiting: 60 requests/minute per IP
- ✅ Environment variables for sensitive data
- ✅ Zod validation on all inputs
- ✅ Error handling with proper status codes

## 🚧 Future Improvements

- [ ] Add database (PostgreSQL/SQLite) for trip persistence
- [ ] Add authentication (JWT)
- [ ] Add CRUD endpoints for trips, checklists, etc.
- [ ] Add caching for OpenAI responses
- [ ] Add request logging and monitoring
- [ ] Restrict CORS to specific origins in production

## 📄 License

ISC
