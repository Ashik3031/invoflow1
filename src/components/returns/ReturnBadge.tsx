import React from 'react';

interface ReturnBadgeProps {
  type: 'full_return' | 'partial_return' | 'exchange' | string;
}

export const ReturnBadge: React.FC<ReturnBadgeProps> = ({ type }) => {
  let text = '';
  let styles = '';

  switch (type) {
    case 'full_return':
      text = 'Full Return';
      styles = 'bg-rose-50 text-rose-700 border-rose-200';
      break;
    case 'partial_return':
      text = 'Partial Return';
      styles = 'bg-amber-50 text-amber-700 border-amber-200';
      break;
    case 'exchange':
      text = 'Exchange';
      styles = 'bg-sky-50 text-sky-700 border-sky-200';
      break;
    default:
      text = type || 'Return';
      styles = 'bg-slate-50 text-slate-700 border-slate-200';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles}`}>
      {text}
    </span>
  );
};
