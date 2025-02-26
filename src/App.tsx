import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Chatbot from './chat';

const Home = () => <div>Home Page</div>;
const Services = () => <div>Services Page</div>;
const Contact = () => <div>Contact Page</div>;

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
      <ChatbotWrapper />
    </Router>
  );
};

// Wrapper to pass the current location to the Chatbot
const ChatbotWrapper: React.FC = () => {
  const location = useLocation();
  const currentPage = location.pathname.slice(1).replace(/\/$/, '').toLowerCase() || 'home';
  console.log('Normalized Current Page:', currentPage); // Log the normalized value
  return <Chatbot currentPage={currentPage} />;
};

export default App;