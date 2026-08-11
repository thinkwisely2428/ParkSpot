const OpenAI = require('openai');

const getClient = () => {
  if (!process.env.NVIDIA_API_KEY) {
    throw new Error('NVIDIA_API_KEY is not set in environment variables');
  }
  return new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
  });
};

exports.getChatCompletion = async (messages, tools) => {
  const openai = getClient();
  const model = process.env.NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct';

  const response = await openai.chat.completions.create({
    model,
    messages,
    tools,
    tool_choice: "auto",
    max_tokens: 1024,
  });

  return response;
};
