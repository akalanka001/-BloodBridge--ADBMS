import React, { useId } from 'react';

export function SectionTabs({ tabs, activeTab, onChange, label = 'Sections' }) {
  const id = useId();
  return <div className="bb-section-tabs" role="tablist" aria-label={label} onKeyDown={event => {
    const current = tabs.findIndex(tab => tab.id === activeTab);
    let next;
    if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next != null) { event.preventDefault(); onChange(tabs[next].id); event.currentTarget.querySelectorAll('[role="tab"]')[next]?.focus(); }
  }}>
    {tabs.map(tab => <button key={tab.id} id={`${id}-${tab.id}`} role="tab" type="button" aria-selected={tab.id === activeTab} tabIndex={tab.id === activeTab ? 0 : -1} onClick={() => onChange(tab.id)}>{tab.label}</button>)}
  </div>;
}
