import React from 'react';

export default function Roadmap() {
  const roadmapItems = [
    { title: 'TOKEN LAUNCH', status: 'COMPLETED', statusClass: 'live' },
    { title: 'BURN BEGINS', status: 'COMPLETED', statusClass: 'live' },
    { title: 'DEX LISTING', status: 'COMPLETED', statusClass: 'upcoming' },
    { title: 'GOVERNANCE', status: 'UPCOMING', statusClass: 'upcoming' },
    { title: 'CEX LISTING', status: 'UPCOMING', statusClass: 'upcoming' },
    { title: 'BURN COMPLETE', status: 'Q4 2027', statusClass: 'upcoming' },
  ];

  return (
    <div className="card">
      <div className="section-header">
        <span className="accent green"></span>
        ROADMAP
      </div>
      <div className="roadmap-grid">
        {roadmapItems.map((item, idx) => (
          <div key={idx} className="roadmap-item">
            <div className="phase"></div>
            <div className="title">{item.title}</div>
            <span className={`status ${item.statusClass}`}>{item.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
