import type { AqiCategory } from '@/types';

/**
 * Playful 4-color Google RGB clean-air breeze emblem (Blue #4285F4, Red #EA4335,
 * Yellow #FBBC05, Green #34A853).
 */
export function BreatheWiseLogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="12" className="fill-[#4285F4]/12 dark:fill-white/[0.08]" />
      {/* Top wind ribbon - Google Blue */}
      <path
        d="M8 15.5H24.5C27.2 15.5 29 13.8 29 11.5C29 9.5 27.4 8 25.5 8C23.8 8 22.6 9.1 22.4 10.5"
        stroke="#4285F4"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Middle wind ribbon - Google Green */}
      <path
        d="M7 21H29.5C32 21 33.5 22.6 33.5 24.8C33.5 27 31.8 28.5 29.7 28.5C27.8 28.5 26.6 27.3 26.4 25.9"
        stroke="#34A853"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Lower breeze curve - Google Yellow */}
      <path
        d="M11 26.5H20.5"
        stroke="#FBBC05"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Sparkle / fresh dot - Google Red */}
      <circle cx="13" cy="11" r="2.2" fill="#EA4335" />
    </svg>
  );
}

/**
 * 4-color Google sparkle icon for AI copilot buttons & floating chat FAB.
 */
export function GoogleSparkleMark({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="#4285F4" />
      <path d="M12 2L14.5 9.5L22 12H12V2Z" fill="#EA4335" />
      <path d="M12 12H22L14.5 14.5L12 22V12Z" fill="#FBBC05" />
      <path d="M12 12V22L9.5 14.5L2 12H12Z" fill="#34A853" />
    </svg>
  );
}

/**
 * Dynamic Google-Weather-style flat illustration reflecting live city AQI severity.
 */
export function AirStatusIllustration({
  category,
  className = 'h-24 w-32',
}: {
  category: AqiCategory;
  className?: string;
}) {
  if (category === 'Good' || category === 'Satisfactory') {
    return (
      <svg
        viewBox="0 0 140 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        {/* Warm Google Yellow Sun */}
        <circle cx="96" cy="34" r="18" fill="#FBBC05" />
        <circle cx="96" cy="34" r="25" fill="#FBBC05" fillOpacity="0.18" />
        {/* Fluffy Google Blue Cloud */}
        <path
          d="M28 72H88C96.8 72 104 65 104 56.5C104 48.5 97.6 42 89.6 41.6C86.6 31.6 77.4 24.5 66.5 24.5C53.2 24.5 42.5 35 42.2 48.2C34 49 27.5 55.8 27.5 64C27.5 68.5 27.7 72 28 72Z"
          fill="#4285F4"
          fillOpacity="0.18"
          stroke="#4285F4"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Floating Google Green Leaf */}
        <path
          d="M112 66C112 56 122 50 130 50C130 58 124 68 112 66Z"
          fill="#34A853"
        />
        <path d="M110 68L121 58" stroke="#1E8E3E" strokeWidth="2" strokeLinecap="round" />
        {/* Clean Breeze Lines */}
        <path d="M18 82H62" stroke="#34A853" strokeWidth="3" strokeLinecap="round" />
        <path d="M72 82H96" stroke="#4285F4" strokeWidth="3" strokeLinecap="round" />
        <circle cx="24" cy="34" r="3" fill="#EA4335" />
      </svg>
    );
  }

  if (category === 'Moderate') {
    return (
      <svg
        viewBox="0 0 140 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        {/* Soft Sun behind cloud */}
        <circle cx="92" cy="32" r="16" fill="#FBBC05" />
        <circle cx="92" cy="32" r="23" fill="#FBBC05" fillOpacity="0.16" />
        {/* Cloud with subtle amber haze */}
        <path
          d="M26 70H90C98.2 70 105 63.4 105 55.2C105 47.4 98.8 41 91 40.6C88 31 79 24 68.5 24C55.5 24 45 34.4 44.6 47.2C36.6 48 30 54.6 30 62.6C30 66.8 26 70 26 70Z"
          fill="#FBBC05"
          fillOpacity="0.16"
          stroke="#FBBC05"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Haze & breeze dots */}
        <path d="M22 80H78" stroke="#4285F4" strokeWidth="3" strokeLinecap="round" />
        <path d="M88 80H112" stroke="#FBBC05" strokeWidth="3" strokeLinecap="round" />
        <circle cx="116" cy="56" r="3.5" fill="#EA4335" fillOpacity="0.7" />
        <circle cx="124" cy="46" r="2.5" fill="#34A853" />
      </svg>
    );
  }

  // Poor / Very Poor / Severe / Unavailable — Protective Sanctuary Illustration
  return (
    <svg
      viewBox="0 0 140 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Coral-Red Haze Cloud */}
      <path
        d="M20 56H82C89.5 56 95.5 50 95.5 42.5C95.5 35.5 90 29.8 83 29.4C80.5 21 72.8 15 63.6 15C52.4 15 43.4 23.8 43 34.8C36 35.6 30.5 41.2 30.5 48.2"
        fill="#EA4335"
        fillOpacity="0.14"
        stroke="#EA4335"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Protective Home Shield - Google Blue & Green */}
      <path
        d="M96 42L120 52V68C120 80 110 88 96 92C82 88 72 80 72 68V52L96 42Z"
        fill="#4285F4"
        fillOpacity="0.18"
        stroke="#4285F4"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M87 67L93 73L106 60"
        stroke="#34A853"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Floating dust particles */}
      <circle cx="28" cy="70" r="3.5" fill="#FBBC05" />
      <circle cx="44" cy="78" r="2.5" fill="#EA4335" />
      <circle cx="58" cy="68" r="2.5" fill="#FBBC05" />
    </svg>
  );
}

/**
 * Playful Google 4-color illustrated home + greenery banner for Onboarding & Family Setup.
 */
export function FamilyHomeIllustration({ className = 'h-20 w-28' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Yellow Sun */}
      <circle cx="96" cy="20" r="10" fill="#FBBC05" />
      <circle cx="96" cy="20" r="15" fill="#FBBC05" fillOpacity="0.2" />
      {/* Green Tree */}
      <circle cx="24" cy="48" r="13" fill="#34A853" fillOpacity="0.22" stroke="#34A853" strokeWidth="2.2" />
      <path d="M24 55V72" stroke="#34A853" strokeWidth="2.5" strokeLinecap="round" />
      {/* House Body */}
      <rect
        x="42"
        y="38"
        width="44"
        height="34"
        rx="6"
        fill="#4285F4"
        fillOpacity="0.14"
        stroke="#4285F4"
        strokeWidth="2.5"
      />
      {/* House Roof - Google Red */}
      <path
        d="M36 42L64 20L92 42"
        stroke="#EA4335"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Door - Google Yellow */}
      <rect x="58" y="54" width="12" height="18" rx="3" fill="#FBBC05" />
      {/* Ground line */}
      <path d="M12 72H108" stroke="#DADCE0" strokeWidth="2.5" strokeLinecap="round" className="dark:stroke-white/20" />
    </svg>
  );
}

/**
 * Subtle corner breeze, cloud, and leaf vector watermarks framing the app canvas
 * without interfering with readability or clicks.
 */
export function GoogleAmbientBackdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Top-right floating breeze & sun accent */}
      <svg
        viewBox="0 0 260 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute -top-6 -right-8 h-52 w-64 opacity-[0.22] dark:opacity-[0.14]"
      >
        <circle cx="195" cy="54" r="28" fill="#FBBC05" fillOpacity="0.28" />
        <path
          d="M52 72H154C167 72 176 63 176 52C176 41 167 33 156 33C147 33 140 39 138 46"
          stroke="#4285F4"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M90 98H198C210 98 218 106 218 117C218 128 209 136 198 136"
          stroke="#34A853"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <circle cx="72" cy="48" r="5" fill="#EA4335" fillOpacity="0.65" />
        <circle cx="222" cy="82" r="4" fill="#FBBC05" />
      </svg>

      {/* Bottom-left soft cloud & leaf sketch */}
      <svg
        viewBox="0 0 260 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute -bottom-8 left-4 hidden h-44 w-64 opacity-[0.2] md:left-64 md:block dark:opacity-[0.12]"
      >
        <path
          d="M24 128H126C140 128 151 117 151 103C151 90 141 79 128 78C123 62 108 51 91 51C70 51 53 68 52 89C39 90 29 101 29 114C29 120 24 128 24 128Z"
          stroke="#4285F4"
          strokeWidth="3"
          fill="#4285F4"
          fillOpacity="0.1"
        />
        <path d="M168 118C168 104 182 94 196 94C196 108 186 122 168 118Z" fill="#34A853" fillOpacity="0.45" />
        <circle cx="152" cy="64" r="4.5" fill="#FBBC05" fillOpacity="0.7" />
        <circle cx="42" cy="56" r="3.5" fill="#EA4335" fillOpacity="0.55" />
      </svg>
    </div>
  );
}

/**
 * Google 4-color illustrated Plan checklist + sun emblem for `/planner`.
 */
export function PlanCalendarIllustration({ className = 'h-14 w-20' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 110 78"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="88" cy="20" r="10" fill="#FBBC05" />
      <circle cx="88" cy="20" r="15" fill="#FBBC05" fillOpacity="0.18" />
      <rect
        x="16"
        y="16"
        width="58"
        height="50"
        rx="12"
        fill="#34A853"
        fillOpacity="0.12"
        stroke="#34A853"
        strokeWidth="2.5"
      />
      <path d="M16 30H74" stroke="#34A853" strokeWidth="2.2" />
      <circle cx="30" cy="23" r="2.5" fill="#4285F4" />
      <circle cx="40" cy="23" r="2.5" fill="#EA4335" />
      <circle cx="50" cy="23" r="2.5" fill="#FBBC05" />
      <path d="M27 42L31 46L39 38" stroke="#34A853" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M46 42H62" stroke="#4285F4" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M27 54L31 58L39 50" stroke="#4285F4" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M46 54H58" stroke="#EA4335" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Google 4-color illustrated AI copilot chat bubble for `/assistant`.
 */
export function CopilotChatIllustration({ className = 'h-14 w-20' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 112 78"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="14"
        y="14"
        width="64"
        height="44"
        rx="16"
        fill="#4285F4"
        fillOpacity="0.14"
        stroke="#4285F4"
        strokeWidth="2.5"
      />
      <path d="M28 58L22 68L38 58" fill="#4285F4" fillOpacity="0.14" stroke="#4285F4" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M28 31H60" stroke="#4285F4" strokeWidth="3" strokeLinecap="round" />
      <path d="M28 42H50" stroke="#34A853" strokeWidth="3" strokeLinecap="round" />
      {/* 4-color Sparkle */}
      <path d="M90 14L93.5 23.5L103 27L93.5 30.5L90 40L86.5 30.5L77 27L86.5 23.5L90 14Z" fill="#FBBC05" />
      <circle cx="94" cy="52" r="5" fill="#EA4335" fillOpacity="0.8" />
    </svg>
  );
}

/**
 * Google 4-color illustrated leaf + globe emblem for `/impact`.
 */
export function ImpactGlobeIllustration({ className = 'h-14 w-20' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 112 78"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle
        cx="48"
        cy="42"
        r="24"
        fill="#4285F4"
        fillOpacity="0.14"
        stroke="#4285F4"
        strokeWidth="2.5"
      />
      <path d="M28 36C36 32 46 34 52 40C58 46 64 46 70 42" stroke="#34A853" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 52C40 48 52 50 62 54" stroke="#4285F4" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M68 26C68 15 80 8 92 8C92 20 84 30 68 26Z" fill="#34A853" />
      <path d="M66 28L79 18" stroke="#1E8E3E" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="92" cy="50" r="6" fill="#FBBC05" />
      <circle cx="20" cy="22" r="4" fill="#EA4335" />
    </svg>
  );
}
