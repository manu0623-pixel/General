// Íconos lineales simples al estilo de los símbolos de iOS.
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const Icon = {
  home: () => <svg viewBox="0 0 24 24" aria-hidden="true"><path {...P} d="M3.5 11 12 4l8.5 7M6 9.5V20h4.5v-5.5h3V20H18V9.5" /></svg>,
  test: () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect {...P} x="5" y="3.5" width="14" height="17" rx="2.5" /><path {...P} d="M8.5 9h7M8.5 12.5h7M8.5 16h4" /></svg>,
  chart: () => <svg viewBox="0 0 24 24" aria-hidden="true"><path {...P} d="M5 20V12M10 20V7M15 20v-9M20 20V4" /></svg>,
  cap: () => <svg viewBox="0 0 24 24" aria-hidden="true"><path {...P} d="M2.5 9 12 4.5 21.5 9 12 13.5zM6.5 11v5c1.5 1.6 3.5 2.4 5.5 2.4s4-.8 5.5-2.4v-5M21.5 9v5" /></svg>,
  more: () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="12" r="1.7" fill="currentColor" /><circle cx="12" cy="12" r="1.7" fill="currentColor" /><circle cx="18.5" cy="12" r="1.7" fill="currentColor" /></svg>,
  flask: () => <svg viewBox="0 0 24 24" aria-hidden="true"><path {...P} d="M9 3.5h6M10 3.5v6L4.8 18a1.8 1.8 0 0 0 1.6 2.6h11.2a1.8 1.8 0 0 0 1.6-2.6L14 9.5v-6M7.5 14.5h9" /></svg>,
  list: () => <svg viewBox="0 0 24 24" aria-hidden="true"><path {...P} d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1.2" fill="currentColor" /><circle cx="4.5" cy="12" r="1.2" fill="currentColor" /><circle cx="4.5" cy="18" r="1.2" fill="currentColor" /></svg>,
  search: () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle {...P} cx="10.5" cy="10.5" r="6" /><path {...P} d="m15 15 5 5" /></svg>,
  gear: () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle {...P} cx="12" cy="12" r="3" /><path {...P} d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" /></svg>,
  chevron: () => <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path {...P} strokeWidth={2.4} d="m9 5 7 7-7 7" /></svg>,
  back: () => <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path {...P} strokeWidth={2.4} d="m15 5-7 7 7 7" /></svg>,
};
