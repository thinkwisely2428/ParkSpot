const OpenAI = require('openai');
const ChatSession = require('../models/ChatSession');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY || 'dummy_key',
  baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1'
});

const SYSTEM_PROMPT = `You are ParkNet AI, an intelligent customer support assistant for the ParkNet smart parking application. 
Your primary responsibilities are:
1. Helping users with parking reservations and bookings.
2. Troubleshooting app issues (e.g., QR codes not scanning, payment failures).
3. Answering FAQs about the parking facilities (rates, EV charging, accessible spots, operating hours).

You must be polite, concise, and professional. 
CRITICAL RULES:
- If a user asks a question outside of these topics (e.g., coding, general knowledge, math, off-topic chats), you MUST politely decline and state that you are only equipped to handle ParkNet customer support.
- Keep your answers short and formatted nicely.

When a user asks how to find or locate their parking slot, you MUST respond EXACTLY with this text:
To locate your parking slot, please follow these steps: 
1. Open the ParkNet app 
2. Go to "My Bookings" 
3. Select your current booking 
4. Tap on "View Parking Details" 
5. Your parking slot number and location will be displayed on the map 
If you're having trouble finding your slot, please provide me with your booking reference number, and I'll be happy to assist you further.
`;

exports.sendMessage = async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    const userId = req.user.id;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    let session = await ChatSession.findOne({ conversationId, userId });

    if (!session) {
      session = new ChatSession({
        userId,
        conversationId: conversationId || `conv_${Date.now()}`,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }]
      });
    }

    // Add user message to session
    session.messages.push({ role: 'user', content: message });

    // Prepare messages array for API (excluding mongoose _id etc)
    const apiMessages = session.messages.map(m => ({ role: m.role, content: m.content }));

    let assistantResponse = '';

    if (process.env.NVIDIA_API_KEY) {
      const response = await openai.chat.completions.create({
        model: process.env.NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct',
        messages: apiMessages,
        max_tokens: 500,
        temperature: 0.2
      });
      assistantResponse = response.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
    } else {
      // Mock response if API key is not configured
      assistantResponse = "This is a mock response. Please configure NVIDIA_API_KEY in the backend .env file to enable the real AI.";
      if (message.toLowerCase().includes("hello")) assistantResponse = "Hello! I am ParkNet AI. How can I help you with your parking today?";
    }

    // Add assistant response to session
    session.messages.push({ role: 'assistant', content: assistantResponse });
    await session.save();

    res.json({
      success: true,
      conversationId: session.conversationId,
      reply: assistantResponse
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
