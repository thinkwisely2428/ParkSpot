const mongoose = require('mongoose');

const ChatSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  conversationId: {
    type: String,
    required: true,
    unique: true
  },
  messages: [{
    role: { type: String, enum: ['system', 'user', 'assistant', 'tool'], required: true },
    content: { type: String, default: '' },
    name: { type: String },
    tool_calls: { type: Array, default: [] },
    tool_call_id: { type: String }
  }]
}, { timestamps: true });

module.exports = mongoose.model('ChatSession', ChatSessionSchema);
