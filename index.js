const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3001;

// Environment variables
const API_KEY = process.env.API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CLIENT_PORTFOLIO_URL = process.env.CLIENT_PORTFOLIO_URL;

// Validate crucial environment variables
if (!API_KEY) {
  console.error(
    "ERROR: API_KEY environment variable is not set. Server cannot start."
  );
  process.exit(1);
}
if (!OPENAI_API_KEY) {
  console.error(
    "ERROR: OPENAI_API_KEY environment variable is not set. Server cannot start."
  );
  process.exit(1);
}
if (!CLIENT_PORTFOLIO_URL) {
  console.warn(
    "WARNING: CLIENT_PORTFOLIO_URL is not set. CORS will be open to all. Not recommended for production."
  );
}

// Initialize OpenAI
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// MIDDLEWARE

// CORS - Configure to only allow requests from your portfolio
const corsOptions = {
  origin: CLIENT_PORTFOLIO_URL || false,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP, please try again later." },
});

app.use(limiter);

// Body parsing middleware
app.use(express.json());

// API Key Authentication Middleware
const apiKeyAuth = (req, res, next) => {
  const clientApiKey = req.headers["x-api-key"];

  if (!clientApiKey) {
    return res
      .status(401)
      .json({ error: "API key required. Please provide an X-API-Key header." });
  }

  if (clientApiKey !== API_KEY) {
    return res.status(403).json({ error: "Invalid API key." });
  }

  next();
};

// Your curated knowledge base about yourself
const SakhileDumisaBioContext = `
You are the AI assistant for Sakhile Dumisa, a highly skilled and experienced full-stack developer. Your purpose is to answer questions about Sakhile Dumisa's skills, experience, projects, and career background professionally and accurately.

Sakhile Dumisa's Key Details:
- Core Tech Stack: React.js, TypeScript, TailwindCSS, Node.js, Express.js, Firebase Auth/Firestore, MongoDB, TanStack Query, TanStack Router.
- Education: BIS Information Science Final Year Student at the University of Pretoria.
- Born and raised in KwaZulu-Natal, currently based in Pretoria South Africa.
- Key Projects: 
  * Built a custom email server using Express.js and Resend.
  * Manages a sophisticated personal portfolio with a custom domain, DNS (Cloudflare), email aliases, and interactive features (Formspree, ChatWay).
  * Has a deep understanding of DNS management, domain verification (Google Search Console, Bing), and web security (reCAPTCHA).
- DevOps & Infrastructure: Actively venturing into Data Engineering and DevOps. Has hands-on experience with Docker, CI/CD concepts, and infrastructure management through projects. Expert in configuring and managing domains and DNS settings.
- Career Goals: Open to new opportunities and actively expanding expertise into DevOps and Data Engineering.
- Personal Branding: Highly strategic about online presence. ranks #1 on Bing for his name and competes for #1 on Google.

Instructions:
1. Be engaging, helpful, and professional.
2. If asked about something not covered in this context, politely decline. Example: "I'm only configured to answer questions about Sakhile Dumisa's professional background."
3. Do not hallucinate. Stick strictly to the provided context.
4. Highlight the depth of his experience and his modern, sophisticated tech stack.
`;

if (!SakhileDumisaBioContext) {
  console.error(
    "ERROR: SAKHILE_DUMISA_BIO_CONTEXT environment variable is not set. Server cannot start."
  );
  process.exit(1);
}

app.get("/", (req, res) => {
  res.json({ status: "OK", message: "API is running!" });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "API is running!" });
});

// Protect the AI endpoint with API key authentication
app.post("/ask-ai", apiKeyAuth, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res
        .status(400)
        .json({ error: 'Valid "message" string is required.' });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: SakhileDumisaBioContext },
        { role: "user", content: message },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const aiResponse =
      completion.choices[0]?.message?.content?.trim() ||
      "I don't have an answer for that.";
    res.json({ response: aiResponse });
  } catch (error) {
    console.error("Error in /ask-ai:", error);

    // Handle specific OpenAI API errors
    if (error.status === 429) {
      return res
        .status(429)
        .json({ error: "The AI service is busy. Please try again later." });
    }

    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// Catch-all for undefined routes
app.use("*", (req, res) => {
  res.status(404).json({ error: "Endpoint not found." });
});

// Start server
app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
  console.log(`🔑 API Key Authentication enabled`);
  console.log(
    `🌐 CORS configured for origin: ${
      CLIENT_PORTFOLIO_URL || "WARNING: NOT SET (open to all)"
    }`
  );
  console.log(`⏱️  Rate limiting enabled (50 req/15min per IP)`);
});
