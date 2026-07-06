import React, { useState } from 'react';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: 'WHAT IS TREAT TOKEN?',
      answer: 'TREAT IS A COMMUNITY-DRIVEN SPL TOKEN ON THE SOLANA BLOCKCHAIN WITH A DEFLATIONARY BURN MECHANISM. IT AIMS TO PROVIDE UTILITY, GOVERNANCE, AND REWARDS TO ITS HOLDERS.'
    },
    {
      question: 'HOW DOES THE BURN WORK?',
      answer: '50% OF THE MAX SUPPLY (500,000,000 TREAT) WILL BE PERMANENTLY BURNED OVER 1 YEAR. APPROXIMATELY 1,369,863 TREAT ARE BURNED DAILY UNTIL THE TARGET IS REACHED.'
    },
    {
      question: 'WHERE CAN I BUY TREAT?',
      answer: 'TREAT WILL BE AVAILABLE ON RAYDIUM (DEX) AND MAJOR CENTRALIZED EXCHANGES. CHECK THE ROADMAP FOR LISTING DATES.'
    },
    {
      question: 'WHAT IS THE MAX SUPPLY?',
      answer: 'THE MAX SUPPLY IS 1,000,000,000 TREAT. AFTER THE 50% BURN, THE CIRCULATING SUPPLY WILL BE 500,000,000 TREAT.'
    },
    {
      question: 'HOW CAN I VERIFY THE BURN?',
      answer: 'ALL BURN TRANSACTIONS ARE RECORDED ON THE SOLANA BLOCKCHAIN. YOU CAN TRACK THEM USING SOLSCAN OR OTHER BLOCKCHAIN EXPLORERS.'
    },
  ];

  return (
    <div className="card">
      <div className="section-header">
        <span className="accent green"></span>
        FREQUENTLY ASKED QUESTIONS
      </div>

      {faqs.map((faq, idx) => (
        <div key={idx} className="faq-item">
          <div 
            className="question" 
            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
          >
            <span>{faq.question}</span>
            <span className={`arrow ${openIndex === idx ? 'open' : ''}`}>▼</span>
          </div>
          {openIndex === idx && (
            <div className="answer open">
              {faq.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
