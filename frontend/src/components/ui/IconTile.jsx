import React from 'react';

export function IconTile({ Icon, tone = 'red' }) {
  return (
    <span className={'icon-tile ' + tone}>
      <Icon size={23} strokeWidth={1.8} />
    </span>
  );
}
