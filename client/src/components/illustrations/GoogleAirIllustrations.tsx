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
 * Full-viewport Google 4-color illustrated clean-air scenic backdrop featuring:
 * - Sky & weather: warm Google Yellow sun, fluffy clouds, breeze swirls, birds & kite
 * - Cozy family home with red roof, glowing windows, trees & garden fence
 * - Parent holding a child's hand strolling along a park path
 * - Child playing outdoors & eco-commuter cycling near park trees & wind turbines
 *
 * Uses `variant="hero"` on Login & Onboarding (richer vibrancy) and `variant="ambient"`
 * across all authenticated portal screens (soft backdrop preserving crisp readability).
 */
export function GoogleAmbientBackdrop({
  variant = 'ambient',
}: {
  variant?: 'hero' | 'ambient';
}) {
  const isHero = variant === 'hero';
  const sceneOpacity = isHero
    ? 'opacity-[0.86] dark:opacity-[0.52]'
    : 'opacity-[0.38] dark:opacity-[0.22]';
  const skyOpacity = isHero
    ? 'opacity-[0.82] dark:opacity-[0.48]'
    : 'opacity-[0.36] dark:opacity-[0.2]';

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* ── TOP-LEFT SKY: Fluffy clouds, breeze ribbons & drifting birds ── */}
      <svg
        viewBox="0 0 380 210"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`bw-drift-slow absolute -top-2 -left-6 h-40 w-72 sm:h-48 sm:w-96 ${
          isHero ? '' : 'md:left-56'
        } ${skyOpacity}`}
      >
        {/* Main fluffy cloud */}
        <path
          d="M36 96H152C167 96 179 84 179 70C179 56.5 168.5 45.5 155 44.5C150 28 134.5 16 116 16C94 16 76 33.5 75.5 55.5C61 56.5 49.5 68.5 49.5 83C49.5 88 36 96 36 96Z"
          fill="#4285F4"
          fillOpacity="0.14"
          stroke="#4285F4"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Smaller companion cloud */}
        <path
          d="M210 132H296C306 132 314 124 314 114C314 104.5 306.5 96.8 297 96.2C293.5 85 283 77 270.5 77C255 77 242.5 89 242 104.5C232 105.5 224 113.5 224 123.5"
          fill="#34A853"
          fillOpacity="0.1"
          stroke="#4285F4"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Flowing clean-air breeze swirls */}
        <path
          d="M42 134H138C150 134 158 126 158 116C158 107 150.5 100 142 100"
          stroke="#34A853"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M68 152H172"
          stroke="#4285F4"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="10 8"
        />
        {/* Gentle birds in sky */}
        <path
          d="M206 48C211 41 217 41 221 48C225 41 231 41 236 48"
          stroke="#5F6368"
          strokeOpacity="0.6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M254 34C258 29 262 29 265 34C268 29 272 29 276 34"
          stroke="#5F6368"
          strokeOpacity="0.5"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Drifting colorful clean-air kite */}
        <g className="bw-float-slow">
          <path d="M312 36L328 54L312 72L296 54L312 36Z" fill="#FBBC05" fillOpacity="0.85" />
          <path d="M312 36L328 54L312 54V36Z" fill="#EA4335" fillOpacity="0.85" />
          <path d="M312 54L328 54L312 72V54Z" fill="#4285F4" fillOpacity="0.85" />
          <path d="M312 54V72L296 54H312Z" fill="#34A853" fillOpacity="0.85" />
          <path
            d="M312 72C308 90 322 102 316 122C312 136 322 148 318 164"
            stroke="#EA4335"
            strokeOpacity="0.55"
            strokeWidth="1.6"
            strokeDasharray="4 4"
            strokeLinecap="round"
          />
        </g>
      </svg>

      {/* ── TOP-RIGHT SKY: Warm Google Yellow Sun, cloud, breeze & floating leaf ── */}
      <svg
        viewBox="0 0 360 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`absolute -top-4 -right-6 h-44 w-72 sm:h-56 sm:w-96 ${skyOpacity}`}
      >
        {/* Warm Google Yellow Sun with halo & rays */}
        <circle cx="256" cy="72" r="54" fill="#FBBC05" fillOpacity="0.12" />
        <circle cx="256" cy="72" r="36" fill="#FBBC05" fillOpacity="0.24" />
        <circle cx="256" cy="72" r="24" fill="#FBBC05" />
        <g stroke="#FBBC05" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.8">
          <path d="M256 26V14" />
          <path d="M256 130V118" />
          <path d="M210 72H198" />
          <path d="M314 72H302" />
          <path d="M223 39L215 31" />
          <path d="M297 113L289 105" />
          <path d="M289 39L297 31" />
          <path d="M215 113L223 105" />
        </g>
        {/* Fluffy sun-kissed cloud */}
        <g className="bw-float-slow">
          <path
            d="M116 126H226C239 126 249 116 249 103.5C249 91.5 239.5 82 227.5 81.2C223 66.5 209.5 56 193 56C173.5 56 157.5 71.5 157 91C144.5 92 134.5 102.5 134.5 115"
            fill="#4285F4"
            fillOpacity="0.16"
            stroke="#4285F4"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        {/* Clean-air breeze & floating green leaf */}
        <path
          d="M52 74H132C142 74 149 67 149 58C149 50 142 44 134 44"
          stroke="#4285F4"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M84 152H176C188 152 196 160 196 170C196 180 188 188 178 188"
          stroke="#34A853"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M278 154C278 140 292 132 304 132C304 144 294 158 278 154Z"
          fill="#34A853"
          fillOpacity="0.8"
        />
        <path d="M274 158L290 144" stroke="#1E8E3E" strokeWidth="2" strokeLinecap="round" />
        <circle cx="88" cy="48" r="4" fill="#EA4335" fillOpacity="0.7" />
        <circle cx="316" cy="116" r="3.5" fill="#4285F4" fillOpacity="0.7" />
      </svg>

      {/* ── BOTTOM PANORAMA: Cozy Home, Parent & Child, Kids Playing, Cyclist, Trees & Clean City ── */}
      <svg
        viewBox="0 0 1440 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMax slice"
        className={`absolute inset-x-0 bottom-0 h-56 w-full sm:h-64 md:h-72 lg:h-80 ${
          isHero ? '' : 'md:left-60 md:w-[calc(100%-15rem)]'
        } ${sceneOpacity}`}
      >
        {/* Distant clean-air city skyline silhouette (soft & airy) */}
        <g fill="#4285F4" fillOpacity="0.1" stroke="#4285F4" strokeOpacity="0.22" strokeWidth="1.5">
          <rect x="460" y="148" width="44" height="120" rx="6" />
          <rect x="512" y="120" width="52" height="148" rx="6" />
          <rect x="572" y="162" width="38" height="106" rx="6" />
          <rect x="860" y="134" width="48" height="134" rx="6" />
          <rect x="916" y="106" width="58" height="162" rx="6" />
          <rect x="982" y="146" width="42" height="122" rx="6" />
        </g>

        {/* Clean-energy wind turbines on distant hills */}
        <g stroke="#4285F4" strokeOpacity="0.45" strokeWidth="2.4" strokeLinecap="round">
          {/* Left-hill turbine */}
          <path d="M358 214V146" />
          <path d="M358 146L340 124" />
          <path d="M358 146L384 142" />
          <path d="M358 146L348 172" />
          <circle cx="358" cy="146" r="3.5" fill="#4285F4" />
          {/* Right-hill turbine */}
          <path d="M1078 216V140" />
          <path d="M1078 140L1060 116" />
          <path d="M1078 140L1106 138" />
          <path d="M1078 140L1068 168" />
          <circle cx="1078" cy="140" r="3.5" fill="#34A853" />
        </g>

        {/* Soft layered rolling hills */}
        <path
          d="M0 248C140 202 290 204 440 236C610 272 790 264 960 226C1140 186 1300 200 1440 234V360H0V248Z"
          fill="#34A853"
          fillOpacity="0.14"
        />
        <path
          d="M0 284C190 244 380 256 590 282C800 308 1030 294 1230 256C1320 238 1390 242 1440 254V360H0V284Z"
          fill="#34A853"
          fillOpacity="0.22"
        />

        {/* Winding clean-air park pathway */}
        <path
          d="M210 360C310 318 440 312 610 326C800 342 970 316 1160 288C1270 272 1365 276 1440 288V316C1350 304 1260 302 1150 318C965 344 795 366 600 352C445 340 335 342 260 360H210Z"
          fill="#FBBC05"
          fillOpacity="0.18"
        />

        {/* ── LEFT SCENE: Cozy Illustrated Family Home & Lush Trees ── */}
        <g>
          {/* Left tall garden tree */}
          <path d="M62 248V304" stroke="#5F6368" strokeOpacity="0.55" strokeWidth="6" strokeLinecap="round" />
          <circle cx="62" cy="224" r="34" fill="#34A853" fillOpacity="0.28" stroke="#34A853" strokeWidth="2.5" />
          <circle cx="44" cy="240" r="22" fill="#34A853" fillOpacity="0.22" />
          <circle cx="82" cy="238" r="20" fill="#34A853" fillOpacity="0.22" />

          {/* Main Home Body */}
          <rect
            x="108"
            y="196"
            width="156"
            height="108"
            rx="10"
            fill="#4285F4"
            fillOpacity="0.16"
            stroke="#4285F4"
            strokeWidth="3"
          />
          {/* Chimney with gentle clean puff */}
          <rect x="218" y="134" width="22" height="44" rx="4" fill="#EA4335" fillOpacity="0.75" />
          <circle cx="234" cy="120" r="7" fill="#4285F4" fillOpacity="0.22" />
          <circle cx="246" cy="108" r="9" fill="#4285F4" fillOpacity="0.16" />

          {/* Google Red Gabled Roof */}
          <path
            d="M92 204L186 128L280 204Z"
            fill="#EA4335"
            fillOpacity="0.24"
            stroke="#EA4335"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
          {/* Solar panel accent on roof */}
          <path
            d="M144 166L176 144L194 158L162 180Z"
            fill="#4285F4"
            fillOpacity="0.55"
            stroke="#4285F4"
            strokeWidth="1.6"
          />

          {/* Warm Google Yellow Front Door */}
          <rect
            x="166"
            y="246"
            width="38"
            height="58"
            rx="8"
            fill="#FBBC05"
            fillOpacity="0.85"
            stroke="#EA4335"
            strokeWidth="2"
          />
          <circle cx="195" cy="276" r="2.8" fill="#EA4335" />

          {/* Glowing Cozy Windows (with indoor plant silhouette) */}
          <rect
            x="124"
            y="218"
            width="30"
            height="32"
            rx="6"
            fill="#FBBC05"
            fillOpacity="0.32"
            stroke="#4285F4"
            strokeWidth="2.2"
          />
          <path d="M139 218V250M124 234H154" stroke="#4285F4" strokeWidth="1.6" />
          <rect
            x="218"
            y="218"
            width="30"
            height="32"
            rx="6"
            fill="#FBBC05"
            fillOpacity="0.32"
            stroke="#4285F4"
            strokeWidth="2.2"
          />
          <path d="M233 218V250M218 234H248" stroke="#4285F4" strokeWidth="1.6" />
          {/* Attic round window */}
          <circle cx="186" cy="172" r="11" fill="#FBBC05" fillOpacity="0.45" stroke="#EA4335" strokeWidth="2" />

          {/* Garden Bushes & Picket Fence */}
          <circle cx="110" cy="298" r="16" fill="#34A853" fillOpacity="0.45" />
          <circle cx="268" cy="296" r="18" fill="#34A853" fillOpacity="0.45" />
          <path
            d="M276 286H332M284 278V304M298 278V304M312 278V304M326 278V304"
            stroke="#5F6368"
            strokeOpacity="0.45"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </g>

        {/* ── LEFT-CENTER SCENE: Parent Holding Child's Hand + Friendly Dog ── */}
        <g>
          {/* Parent figure */}
          <circle cx="404" cy="230" r="12" fill="#FBBC05" />
          {/* Parent torso (Google Blue sweater) */}
          <path
            d="M390 248C390 243 395 240 404 240C413 240 418 243 418 248L422 282H386L390 248Z"
            fill="#4285F4"
          />
          {/* Parent legs */}
          <path d="M396 282L392 316M412 282L418 316" stroke="#1A73E8" strokeWidth="5.5" strokeLinecap="round" />
          {/* Parent arm holding child's hand */}
          <path d="M416 254L436 274" stroke="#4285F4" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M392 254L382 272" stroke="#4285F4" strokeWidth="4.5" strokeLinecap="round" />

          {/* Child figure holding parent's hand */}
          <circle cx="452" cy="256" r="9.5" fill="#EA4335" fillOpacity="0.85" />
          {/* Child torso (Google Yellow shirt) */}
          <path
            d="M442 269C442 266 446 264 452 264C458 264 462 266 462 269L464 294H440L442 269Z"
            fill="#FBBC05"
          />
          {/* Child legs */}
          <path d="M446 294L444 316M458 294L462 316" stroke="#34A853" strokeWidth="4.5" strokeLinecap="round" />
          {/* Child arms (left holding parent, right holding floating balloon) */}
          <path d="M444 274L436 274" stroke="#FBBC05" strokeWidth="3.8" strokeLinecap="round" />
          <path d="M460 274L474 264" stroke="#FBBC05" strokeWidth="3.8" strokeLinecap="round" />

          {/* Floating Google Red Balloon held by child */}
          <g className="bw-float-slow">
            <path d="M474 264C478 246 482 232 484 218" stroke="#5F6368" strokeOpacity="0.55" strokeWidth="1.5" />
            <ellipse cx="486" cy="204" rx="11" ry="13.5" fill="#EA4335" fillOpacity="0.82" />
            <circle cx="482" cy="199" r="2.5" fill="#FFFFFF" fillOpacity="0.55" />
          </g>

          {/* Cute little dog trotting beside family */}
          <ellipse cx="502" cy="306" rx="12" ry="7" fill="#FBBC05" fillOpacity="0.85" />
          <circle cx="514" cy="299" r="5.5" fill="#FBBC05" />
          <path d="M494 312V320M508 312V320M490 304L484 298" stroke="#B06000" strokeWidth="2.4" strokeLinecap="round" />
        </g>

        {/* ── RIGHT-CENTER SCENE: Happy Child Playing With Ball & Eco Cyclist ── */}
        <g>
          {/* Child running & playing outdoors */}
          <circle cx="944" cy="260" r="9" fill="#4285F4" />
          <path
            d="M934 273C935 270 939 268 944 268C949 268 953 270 954 273L956 296H934L934 273Z"
            fill="#34A853"
          />
          <path d="M938 296L928 316M950 296L960 314" stroke="#1E8E3E" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M935 276L922 266M953 276L968 270" stroke="#34A853" strokeWidth="3.8" strokeLinecap="round" />
          {/* Colorful beach/play ball */}
          <circle cx="984" cy="308" r="9.5" fill="#FBBC05" stroke="#EA4335" strokeWidth="2" />
          <path d="M976 304C982 308 986 308 992 304" stroke="#4285F4" strokeWidth="2" />

          {/* Clean-Commute Cyclist */}
          <g>
            {/* Wheels */}
            <circle cx="1072" cy="300" r="17" stroke="#4285F4" strokeWidth="3" />
            <circle cx="1126" cy="300" r="17" stroke="#4285F4" strokeWidth="3" />
            {/* Bike Frame (Google Red) */}
            <path
              d="M1072 300L1096 276H1118L1126 300M1096 276L1104 300H1072M1116 268L1122 268"
              stroke="#EA4335"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Cyclist Rider */}
            <circle cx="1096" cy="242" r="9.5" fill="#FBBC05" />
            <path d="M1094 252L1088 274L1102 288" stroke="#4285F4" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M1094 258L1114 268" stroke="#4285F4" strokeWidth="4" strokeLinecap="round" />
          </g>
        </g>

        {/* ── RIGHT SCENE: Park Bench, Lush Trees & Second Cozy House Silhouette ── */}
        <g>
          {/* Park Trees */}
          <path d="M1214 244V304" stroke="#5F6368" strokeOpacity="0.55" strokeWidth="6" strokeLinecap="round" />
          <circle cx="1214" cy="222" r="32" fill="#34A853" fillOpacity="0.3" stroke="#34A853" strokeWidth="2.5" />
          <circle cx="1238" cy="238" r="22" fill="#34A853" fillOpacity="0.22" />

          {/* Second cozy neighborhood house */}
          <rect
            x="1272"
            y="214"
            width="112"
            height="88"
            rx="8"
            fill="#FBBC05"
            fillOpacity="0.15"
            stroke="#FBBC05"
            strokeWidth="2.6"
          />
          <path
            d="M1260 220L1328 164L1396 220Z"
            fill="#4285F4"
            fillOpacity="0.22"
            stroke="#4285F4"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          <rect x="1316" y="256" width="26" height="46" rx="5" fill="#EA4335" fillOpacity="0.7" />
          <rect x="1286" y="232" width="20" height="22" rx="4" fill="#4285F4" fillOpacity="0.3" />
          <rect x="1352" y="232" width="20" height="22" rx="4" fill="#4285F4" fillOpacity="0.3" />

          {/* Rightmost soft tree */}
          <path d="M1408 258V306" stroke="#5F6368" strokeOpacity="0.5" strokeWidth="5" strokeLinecap="round" />
          <circle cx="1408" cy="240" r="24" fill="#34A853" fillOpacity="0.28" stroke="#34A853" strokeWidth="2.2" />
        </g>

        {/* Subtle foreground clean-air grass tufts & wildflowers */}
        <g strokeLinecap="round">
          <circle cx="348" cy="316" r="3" fill="#EA4335" fillOpacity="0.65" />
          <circle cx="566" cy="306" r="3" fill="#FBBC05" fillOpacity="0.75" />
          <circle cx="878" cy="314" r="3.5" fill="#4285F4" fillOpacity="0.65" />
          <circle cx="1174" cy="310" r="3" fill="#EA4335" fillOpacity="0.65" />
          <path d="M558 314L562 304L566 314" stroke="#34A853" strokeWidth="2" />
          <path d="M868 320L872 310L876 320" stroke="#34A853" strokeWidth="2" />
        </g>
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
