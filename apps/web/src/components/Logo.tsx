/**
 * The driver app's mark (roof light over Sant Martí's bell tower), recoloured
 * for the website: ink on taxi yellow instead of cream on terracotta.
 */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`block overflow-hidden rounded-[22%] ${className}`}>
      <svg viewBox="0 0 1024 1024" className="block w-full h-full" aria-hidden="true">
        <rect width="1024" height="1024" fill="#FFC72C" />
        <path d="M-20 850 Q200 700 420 790 Q600 720 760 770 Q900 720 1044 820 V1044 H-20 Z" fill="#E5A800" />
        <rect x="437" y="381" width="150" height="520" fill="#1F1B16" />
        <rect x="423" y="389" width="178" height="22" rx="4" fill="#1F1B16" />
        <path d="M482 560 v-78 a30 30 0 0 1 60 0 v78 Z" fill="#FFC72C" />
        <rect x="494" y="660" width="36" height="52" rx="18" fill="#FFC72C" opacity=".6" />
        <path d="M293.6 215 H730.4 Q772.9 215 792 385 H232 Q251.1 215 293.6 215 Z" fill="#1F1B16" />
        <text x="512" y="334" fontFamily="Georgia, serif" fontWeight="bold" fontSize="98.6" letterSpacing="10.2" textAnchor="middle" fill="#FFC72C">TAXI</text>
        <path d="M-20 900 Q260 790 512 860 Q780 800 1044 880 V1044 H-20 Z" fill="#1F1B16" />
      </svg>
    </span>
  )
}
