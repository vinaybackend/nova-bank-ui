const iconPaths = {
  grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
  bank: <><path d="m3 9 9-5 9 5" /><path d="M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18M2 9h20" /></>,
  card: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3 10h18m-14 5h3" /></>,
  swap: <><path d="M16 3l4 4-4 4M4 7h16M8 21l-4-4 4-4m12 4H4" /></>,
  receipt: <><path d="M5 3h14v18l-3-2-4 2-4-2-3 2z" /><path d="M8 8h8m-8 4h8m-8 4h4" /></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9a2.5 2.5 0 1 1 4.5 1.5c-1.1 1.2-2.1 1.3-2.1 3m0 3h.01" /></>,
  logout: <><path d="M10 17l5-5-5-5m5 5H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
  arrowUp: <><path d="M12 19V5m-6 6 6-6 6 6" /></>,
  arrowDown: <><path d="M12 5v14m6-6-6 6-6-6" /></>,
  arrowRight: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
  plus: <><path d="M12 5v14m-7-7h14" /></>,
  bag: <><path d="M5 8h14l1 12H4L5 8Z" /><path d="M9 8a3 3 0 0 1 6 0" /></>,
  food: <><path d="M7 3v7m4-7v7M7 7h4m-2 3v11m8-18v18m0-18c2 2 3 4 3 7h-3" /></>,
  bolt: <><path d="m13 2-3 8h7l-6 12 2-9H6l7-11Z" /></>,
  cart: <><path d="M3 4h2l2.5 11h10L21 8H6" /><circle cx="9" cy="19" r="1" /><circle cx="17" cy="19" r="1" /></>,
  close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  phone: <><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M11 18h2" /></>,
  sparkle: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></>,
}

export default function Icon({ name, size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {iconPaths[name] || iconPaths.grid}
    </svg>
  )
}
