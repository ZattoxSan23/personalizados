/**
 * Logo personalizado — dumbbell estilizado con "P" sutil adentro
 * Single-color (currentColor) para que tome el color del padre.
 */
export function Logo({
  size = 32,
  withWordmark = true,
  className = '',
}: {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Personalizados"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id="logoGradient" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="currentColor" stopOpacity="1" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        {/* Halo */}
        <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#logoGradient)" />
        {/* Halo interior */}
        <rect x="4" y="4" width="40" height="40" rx="10" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1" />
        {/* Dumbbell: pesa izquierda */}
        <rect x="11" y="20" width="3.5" height="8" rx="1.5" fill="white" fillOpacity="0.96" />
        <rect x="14.5" y="17.5" width="2" height="13" rx="0.8" fill="white" fillOpacity="0.96" />
        {/* Barra */}
        <rect x="16.5" y="23" width="15" height="2" rx="1" fill="white" fillOpacity="0.96" />
        {/* Pesa derecha */}
        <rect x="31.5" y="17.5" width="2" height="13" rx="0.8" fill="white" fillOpacity="0.96" />
        <rect x="33.5" y="20" width="3.5" height="8" rx="1.5" fill="white" fillOpacity="0.96" />
        {/* Acento: línea de progreso sutil (P) */}
        <path
          d="M22 14 L22 11 M22 14 L24 14"
          stroke="white"
          strokeOpacity="0.7"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {withWordmark && (
        <span className="font-extrabold tracking-tight text-[15px] leading-none">
          Personalizados
        </span>
      )}
    </span>
  );
}

/**
 * Versión full con color primario fijo (para landing/branding oscuro)
 */
export function LogoOnDark({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-white">
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <rect x="2" y="2" width="44" height="44" rx="12" fill="white" fillOpacity="0.15" />
        <rect x="11" y="20" width="3.5" height="8" rx="1.5" fill="white" fillOpacity="0.96" />
        <rect x="14.5" y="17.5" width="2" height="13" rx="0.8" fill="white" fillOpacity="0.96" />
        <rect x="16.5" y="23" width="15" height="2" rx="1" fill="white" fillOpacity="0.96" />
        <rect x="31.5" y="17.5" width="2" height="13" rx="0.8" fill="white" fillOpacity="0.96" />
        <rect x="33.5" y="20" width="3.5" height="8" rx="1.5" fill="white" fillOpacity="0.96" />
        <path
          d="M22 14 L22 11 M22 14 L24 14"
          stroke="white"
          strokeOpacity="0.6"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="font-extrabold tracking-tight text-[15px] leading-none">
        Personalizados
      </span>
    </span>
  );
}