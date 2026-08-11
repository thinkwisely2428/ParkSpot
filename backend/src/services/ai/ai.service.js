const ChatSession = require('../../models/ChatSession');
const { getSystemPrompt } = require('./prompt.service');
const { tools, executeTool } = require('./tool.service');
const { getChatCompletion } = require('./nim.service');

exports.processChat = async (user, conversationId, userMessage) => {
  let session = await ChatSession.findOne({ conversationId, userId: user.id });

  if (!session) {
    session = new ChatSession({
      userId: user.id,
      conversationId,
      messages: [{ role: 'system', content: getSystemPrompt(user) }]
    });
  }

  session.messages.push({ role: 'user', content: userMessage });

  const aiMessages = session.messages.map(m => {
    if (m.role === 'tool') return { role: 'tool', content: m.content, tool_call_id: m.tool_call_id };
    if (m.tool_calls && m.tool_calls.length > 0) return { role: 'assistant', tool_calls: m.tool_calls };
    return { role: m.role, content: m.content };
  });

  const response = await getChatCompletion(aiMessages, tools);
  let responseMessage = response.choices[0].message;

  session.messages.push({
    role: responseMessage.role,
    content: responseMessage.content || '',
    tool_calls: responseMessage.tool_calls || []
  });

  if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
    for (const toolCall of responseMessage.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments);
      const toolResult = await executeTool(toolCall.function.name, args, user);
      
      session.messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: toolResult
      });
      aiMessages.push(responseMessage);
      aiMessages.push({ role: 'tool', tool_call_id: toolCall.id, content: toolResult });
    }

    const finalResponse = await getChatCompletion(aiMessages, tools);
    responseMessage = finalResponse.choices[0].message;
    
    session.messages.push({
      role: responseMessage.role,
      content: responseMessage.content || ''
    });
  }

  await session.save();
  return responseMessage;
};
