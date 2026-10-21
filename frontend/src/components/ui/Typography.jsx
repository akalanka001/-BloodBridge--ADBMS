import React from 'react';

export function Badge({ children, className = '' }) {
  return <span className={'badge ' + className}>{children}</span>;
}

export function Heading({ tag, title, description }) {
  return (
    <div className="page-heading">
      <span className="eyebrow">{tag}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}

export function SectionTitle({ title, subtitle }) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}
