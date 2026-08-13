import React, { useState, useEffect, useRef } from 'react';
import { sendChatMessage } from './api';

const T = {
  bg0: "#000000", bg1: "#080808", bg2: "#111111", bg3: "#1a1a1a",
  border: "#222222", border2: "#333333",
  accent: "#ffe135", accentDim: "#ffe13522", accentHover: "#ffeb73",
  green: "#00e676", text0: "#ffffff", text1: "#cccccc", text2: "#888888",
  font: "'Inter', sans-serif"
};

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{
    sender: 'bot',
    text: "Hi there! I'm ParkNet AI. How can I assist you with your parking today?"
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await sendChatMessage(userMessage, conversationId);
      if (res.success) {
        setConversationId(res.conversationId);
        setMessages(prev => [...prev, { sender: 'bot', text: res.reply }]);
      } else {
        setMessages(prev => [...prev, { sender: 'bot', text: "Sorry, I ran into an error processing that request." }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'bot', text: "Error connecting to server. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed', bottom: 30, right: 30, zIndex: 9999,
          width: 60, height: 60, borderRadius: '50%',
          background: `linear-gradient(135deg, ${T.accent}, ${T.accentHover})`,
          border: `2px solid ${T.bg0}`,
          boxShadow: `0 8px 24px rgba(255, 225, 53, 0.4)`,
          color: T.bg0, fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'transform 0.2s',
          transform: isOpen ? 'scale(0.9)' : 'scale(1)'
        }}
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: 100, right: 30, zIndex: 9998,
          width: 350, height: 500, borderRadius: 16,
          background: T.bg1, border: `1px solid ${T.border2}`,
          boxShadow: `0 12px 40px rgba(0,0,0,0.8)`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          fontFamily: T.font
        }}>
          {/* Header */}
          <div style={{
            background: T.bg2, padding: '16px 20px',
            borderBottom: `1px solid ${T.border2}`,
            display: 'flex', alignItems: 'center', gap: 12
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%', background: T.green,
              boxShadow: `0 0 10px ${T.green}`
            }} />
            <div style={{ color: T.text0, fontWeight: 700, letterSpacing: 0.5 }}>ParkNet AI Support</div>
          </div>

          {/* Messages Area */}
          <div style={{
            flex: 1, padding: 20, overflowY: 'auto',
            display: 'flex', flexDirection: 'column', gap: 12,
            background: `linear-gradient(to bottom, ${T.bg1}, ${T.bg2})`
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%', padding: '10px 14px', borderRadius: 12,
                background: m.sender === 'user' ? T.accentDim : T.bg3,
                border: `1px solid ${m.sender === 'user' ? `${T.accent}55` : T.border2}`,
                color: m.sender === 'user' ? T.accentHover : T.text1,
                fontSize: 13, lineHeight: 1.5, wordWrap: 'break-word', whiteSpace: 'pre-wrap'
              }}>
                {m.text}
              </div>
            ))}
            {isLoading && (
              <div style={{
                alignSelf: 'flex-start', padding: '10px 14px', borderRadius: 12,
                background: T.bg3, border: `1px solid ${T.border2}`, color: T.text2, fontSize: 13
              }}>
                Typing...
              </div>
            )}
            <div ref={endOfMessagesRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} style={{
            padding: 14, background: T.bg1, borderTop: `1px solid ${T.border2}`,
            display: 'flex', gap: 8
          }}>
            <input 
              value={input} onChange={e => setInput(e.target.value)}
              placeholder="Ask me about parking..."
              style={{
                flex: 1, background: T.bg2, border: `1px solid ${T.border}`,
                borderRadius: 20, padding: '10px 16px', color: T.text0,
                outline: 'none', fontSize: 13, fontFamily: T.font
              }}
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              style={{
                background: (isLoading || !input.trim()) ? T.bg3 : T.accent,
                color: (isLoading || !input.trim()) ? T.text2 : '#000',
                border: 'none', borderRadius: '50%', width: 40, height: 40,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: (isLoading || !input.trim()) ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s'
              }}
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}
