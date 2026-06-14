interface P { size?: number; }
const s = (n = 18) => ({ width: n, height: n, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

export const IconGrid = ({ size }: P) => (<svg {...s(size)}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>);
export const IconCalendar = ({ size }: P) => (<svg {...s(size)}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>);
export const IconList = ({ size }: P) => (<svg {...s(size)}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>);
export const IconChart = ({ size }: P) => (<svg {...s(size)}><path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/></svg>);
export const IconReport = ({ size }: P) => (<svg {...s(size)}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg>);
export const IconSettings = ({ size }: P) => (<svg {...s(size)}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>);
export const IconPlus = ({ size }: P) => (<svg {...s(size)}><path d="M12 5v14M5 12h14"/></svg>);
export const IconSun = ({ size }: P) => (<svg {...s(size)}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>);
export const IconMoon = ({ size }: P) => (<svg {...s(size)}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>);
export const IconLogout = ({ size }: P) => (<svg {...s(size)}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>);
export const IconBack = ({ size }: P) => (<svg {...s(size)}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>);
export const IconClose = ({ size }: P) => (<svg {...s(size)}><path d="M18 6 6 18M6 6l12 12"/></svg>);
export const IconChevL = ({ size }: P) => (<svg {...s(size)}><path d="M15 18l-6-6 6-6"/></svg>);
export const IconChevR = ({ size }: P) => (<svg {...s(size)}><path d="M9 18l6-6-6-6"/></svg>);
export const IconMenu = ({ size }: P) => (<svg {...s(size)}><path d="M3 12h18M3 6h18M3 18h18"/></svg>);
export const IconTrash = ({ size }: P) => (<svg {...s(size)}><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>);
export const IconCopy = ({ size }: P) => (<svg {...s(size)}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>);
export const IconDownload = ({ size }: P) => (<svg {...s(size)}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>);
export const IconClock = ({ size }: P) => (<svg {...s(size)}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>);
export const IconMoney = ({ size }: P) => (<svg {...s(size)}><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>);
export const IconTarget = ({ size }: P) => (<svg {...s(size)}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>);
export const IconRepeat = ({ size }: P) => (<svg {...s(size)}><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>);
export const IconPercent = ({ size }: P) => (<svg {...s(size)}><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>);
export const IconCar = ({ size }: P) => (<svg {...s(size)}><path d="M5 11l1.4-4.2A2 2 0 0 1 8.3 5.4h7.4a2 2 0 0 1 1.9 1.4L19 11"/><path d="M4 11h16a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-1M4 17H3a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1"/><path d="M7 17h10"/><circle cx="7.5" cy="17" r="1.6"/><circle cx="16.5" cy="17" r="1.6"/></svg>);
