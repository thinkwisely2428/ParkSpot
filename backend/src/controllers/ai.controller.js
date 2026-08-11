const { processChat } = require('../services/ai/ai.service');
const ChatSession = require('../models/ChatSession');
const crypto = require('crypto');

exports.chat = async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const chatId = conversationId || crypto.randomUUID();
    
    const response = await processChat(req.user, chatId, message);

    res.status(200).json({
      success: true,
      conversationId: chatId,
      reply: response.content
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const sessions = await ChatSession.find({ userId: req.user.id }).select('conversationId updatedAt').sort('-updatedAt');
    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
