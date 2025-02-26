import React, { useState } from 'react';
import './chat.css';
import questionsJson from './questions.json'; // Import the JSON file

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

// Define the type for the entire questions JSON object
type QuestionsJson = {
  [key: string]: Record<string, Question>; // Each key maps to an object of questions
};

const questionsData: QuestionsJson = questionsJson; // Cast the imported JSON to the defined type
const defaultQuestions = questionsData.home; // Default to home questions if no match

const Chatbot: React.FC<{ currentPage: string }> = ({ currentPage }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestionId, setCurrentQuestionId] = useState<string>('q1');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [userInput, setUserInput] = useState<string>('');

  // Get the questions for the current page
  const questions = questionsData[currentPage] || defaultQuestions;

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
            <div className="message bot-message">{currentQuestion.text}</div>
          </div>

          {/* Options */}
          <div className="options">
            {currentQuestion.options.map((option, index) => (
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