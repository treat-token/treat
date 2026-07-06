import React from 'react';

export default function Toast({ title, message, type = 'success' }) {
  return (
    <div className={`toast show ${type}`}>
      <div className="toast-title">{title}</div>
      <div className="toast-message">{message}</div>
    </div>
  );
}
