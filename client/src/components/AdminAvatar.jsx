import React from 'react';

/**
 * Admin avatar – renders the blue lock/user SVG icon.
 * Pass `size` prop (e.g. "h-7 w-7") to override default sizing.
 */
export default function AdminAvatar({ className = '' }) {
  return (
    <svg
      viewBox="-2.4 -2.4 28.80 28.80"
      xmlns="http://www.w3.org/2000/svg"
      fill="#00b3ff"
      stroke="#00b3ff"
      strokeWidth="0.00024"
      className={`shrink-0 ${className || 'h-9 w-9'}`}
      aria-label="Admin"
    >
      <g>
        <path fill="none" d="M0 0h24v24H0z" />
        <path d="M12 14v8H4a8 8 0 0 1 8-8zm0-1c-3.315 0-6-2.685-6-6s2.685-6 6-6 6 2.685 6 6-2.685 6-6 6zm9 4h1v5h-8v-5h1v-1a3 3 0 0 1 6 0v1zm-2 0v-1a1 1 0 0 0-2 0v1h2z" />
      </g>
    </svg>
  );
}
