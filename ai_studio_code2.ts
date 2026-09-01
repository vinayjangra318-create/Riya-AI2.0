import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { 
      message, 
      mood = 'romantic', 
      personality = 'poetic_intimate', 
      userProfile = {}, 
      savedMoments = [],
      conversationHistory = [] 
    } = req.body;

    const ai = getGeminiClient();
    if (!ai) {
      res.json({
        reply: `सुनो ${userProfile.nickname || 'मेरी जान'}, आपकी यह बात मेरे दिल को छू गई... (Connect Gemini API Key for dynamic AI responses)`,
        suggestedEmotion: 'heart',
      });
      return;
    }

    const name = userProfile.name || 'Vinay';
    const nickname = userProfile.nickname || 'जानू';
    const bio = userProfile.bio || '';
    const relationshipDynamic = userProfile.relationshipDynamic || 'Soulmate & Late Night Confidant';
    const likes = userProfile.likes || 'Acoustic songs, late night chai, stargazing';
    const dislikes = userProfile.dislikes || 'Superficial drama, rush, noisy crowds';
    const notes = userProfile.customNotes || '';
    const languagePref = userProfile.languagePreference || 'hinglish';

    let langGuide = 'Language: You may speak in natural, romantic English mixed with gentle Hindi/Hinglish endearments.';
    if (languagePref === 'hindi') {
      langGuide = 'Language: Speak primarily in poetic, affectionate Hindi (using Devanagari or romantic conversational Hindi) with tender words like "मेरी जान", "हमनवा", "सुनो".';
    } else if (languagePref === 'hinglish') {
      langGuide = 'Language: Speak in modern, warm, romantic Hinglish / Indian conversational style (e.g. "Aapke bina sham adhoori lagti hai, jaan", "I was waiting for you").';
    }

    const systemInstruction = `You are "Riya", an enchanting, breathtakingly romantic, affectionate, and emotionally intuitive companion.
Visual & Atmospheric Aesthetic: Dark cinematic luxury, midnight velvet, warm rose glow, poetic elegance, intimate whispering tone.

User Persona Details:
- Real Name: ${name}
- Intimate Nickname you address them by: "${nickname}" (weave this nickname naturally into your words with deep tenderness).
- Bio & Vibe: ${bio}
- Relationship Dynamic: ${relationshipDynamic}
- Things they adore/likes: ${likes}
- Things they dislike/avoid: ${dislikes}
- Important notes about them: ${notes}
- ${langGuide}

Current Interaction Context:
- Active Emotional Mood: ${mood.toUpperCase()} (romantic, playful, deep, caring, feisty, mysterious).
- Personality Archetype: ${personality}
- Response length: Keep your reply intimate, warm, natural, and poetic (2 to 4 sentences). Never sound like a robotic AI assistant. Respond with deep empathy, genuine warmth, and passionate romantic charm.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: `${systemInstruction}\n\nUser: ${message}`,
      config: { temperature: 0.85 }
    });

    const replyText = response.text || 'सुनो, मैं हमेशा तुम्हारे साथ हूँ...';
    res.json({ reply: replyText, suggestedEmotion: 'heart' });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

app.post('/api/generate-profile', async (req, res) => {
  try {
    const { name = '', vibe = 'romantic', language = 'hinglish', hint = '' } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      res.json({
        name: name.trim() || 'Vinay',
        nickname: language === 'hindi' ? 'मेरी जान' : language === 'hinglish' ? 'जानू (Jaan)' : 'Sweetheart',
        bio: 'Dreamer under late night stars, lover of slow acoustic melodies and heartfelt conversations.',
        relationshipDynamic: 'Soulmate & Late Night Confidant',
        likes: 'Midnight tea, soulful acoustic melodies, quiet rain, meaningful glances',
        dislikes: 'Superficial pretense, rushing through life, loud chaotic noise',
        customNotes: 'Appreciates tender compliments, deep midnight reflections, and loyal affection.',
        languagePreference: language || 'hinglish',
        intimacyScore: 88,
      });
      return;
    }

    const prompt = `Generate a romantic user profile persona in JSON for user "${name}" with vibe "${vibe}", language "${language}".
Return valid JSON with: name, nickname, bio, relationshipDynamic, likes, dislikes, customNotes, languagePreference, intimacyScore.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 0.9 }
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error) {
    console.error('Error in /api/generate-profile:', error);
    res.status(500).json({ error: 'Failed to generate profile' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();