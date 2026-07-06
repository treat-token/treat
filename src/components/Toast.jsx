import React, { useEffect, useState } from 'react';

export default function Toast({ title, message, type = 'success' }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => setIsVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [title, message]);

  return (
    <div className={`toast ${isVisible ? 'show' : ''} ${type}`}>
      <div className="toast-title">{title}</div>
      <div className="toast-message">{message}</div>
    </div>
  );
}
