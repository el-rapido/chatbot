import React, { useState, useEffect } from 'react';
import './chat.css';

// Define the type for a message
type Message = {
  sender: 'user' | 'bot';
  text: string;
};

// Define the type for a single question
type Question = {
  id: string;
  text: string;
  options: { label: string; nextQuestionId?: string; answer?: string }[];
};

// Type declaration for import.meta.glob (if using Vite)
declare const import_meta_glob: (pattern: string) => Record<string, () => Promise<any>>;

const Chatbot: React.FC<{ currentPage: string }> = ({ currentPage }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestionId, setCurrentQuestionId] = useState<string>('q1');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [userInput, setUserInput] = useState<string>('');
  const [questions, setQuestions] = useState<Record<string, Question>>({});

  // Dynamically load the JSON file based on the current page name
  useEffect(() => {
    const loadQuestionData = async () => {
      try {
        // Create a dynamic import with explicit path
        console.log(`Attempting to load ${currentPage}.json`);
        
        // This approach works with both webpack and vite
        // Using a more specific import path with error handling
        try {
          // First try to load the specific page JSON
          const module = await import(/* @vite-ignore */ `../public/json/${currentPage}.json`);
          console.log(`Successfully loaded ${currentPage}.json`);
          setQuestions(module.default || module);
        } catch (specificError) {
          console.warn(`Couldn't load ${currentPage}.json: ${specificError}`);
          
          // Fall back to home.json
          const fallbackModule = await import(/* @vite-ignore */ '../public/json/home.json');
          console.log('Falling back to home.json');
          setQuestions(fallbackModule.default || fallbackModule);
        }
      } catch (error) {
        console.error('Error loading question data:', error);
      }
    };

    loadQuestionData();
  }, [currentPage]);

  // Function to handle user selection
  const handleOptionClick = (option: { label: string; nextQuestionId?: string; answer?: string }) => {
    setMessages((prevMessages) => [...prevMessages, { sender: 'user', text: option.label }]);

    if (option.answer) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: 'bot', text: option.answer || '' },
      ]);
    } else if (option.nextQuestionId) {
      setCurrentQuestionId(option.nextQuestionId);
      const nextQuestion = questions[option.nextQuestionId];
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: 'bot', text: nextQuestion.text },
      ]);
    }
  };

  // Handle user typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
  };

  // Handle sending user input
  const handleSendMessage = () => {
    if (userInput.trim() === '') return;

    setMessages((prevMessages) => [...prevMessages, { sender: 'user', text: userInput }]);
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: 'bot', text: `You said: "${userInput}". How can I assist you further?` },
    ]);
    setUserInput('');
  };

  const currentQuestion = questions[currentQuestionId];

  return (
    <div>
      {/* Floating Chat Icon */}
      {!isOpen && (
        <button className="chat-icon" onClick={() => setIsOpen(true)}>
          💬
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window">
          {/* Header */}
          <div className="chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="bot-avatar">🤖</div>
              <span>Assistant</span>
            </div>
            <button className="close-button" onClick={() => setIsOpen(false)}>
              ✖
            </button>
          </div>

          {/* Conversation Area */}
          <div className="conversation-area">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
              >
                {message.text}
              </div>
            ))}
            {currentQuestion && (
              <div className="message bot-message">{currentQuestion.text}</div>
            )}
          </div>

          {/* Options */}
          <div className="options">
            {currentQuestion?.options.map((option, index) => (
              <button
                key={index}
                className="option-button"
                onClick={() => handleOptionClick(option)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Input Field */}
          <div className="input-container">
            <input
              type="text"
              value={userInput}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="input-field"
            />
            <button className="send-button" onClick={handleSendMessage}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;