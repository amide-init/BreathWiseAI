export type MetricKey =
  | 'aqi'
  | 'pm25'
  | 'pm10'
  | 'humidity'
  | 'wind'
  | 'indoor_risk'
  | 'co2_avoided';

export type MetricLevelTone = 'good' | 'caution' | 'unhealthy' | 'unknown';

export interface MetricLevelSummary {
  tone: MetricLevelTone;
  badge: string;
  plainMeaning: string;
}

export interface MetricExplainerConfig {
  key: MetricKey;
  title: string;
  friendlySubtitle: string;
  unit?: string;
  whatIsIt: string;
  whyItMatters: string[];
  whatYouCanDo: string[];
  sourceNote: string;
  askAiPrompt: (valueText: string, city: string) => string;
  evaluateValue: (value: number | string | null | undefined) => MetricLevelSummary;
}

export const METRIC_EXPLAINERS: Record<MetricKey, MetricExplainerConfig> = {
  aqi: {
    key: 'aqi',
    title: 'Air Quality Score (CPCB NAQI)',
    friendlySubtitle: 'One simple 0–500 score showing how clean or polluted the outside air is',
    whatIsIt:
      'Think of AQI like a daily traffic light for the air you breathe. India’s Central Pollution Control Board (CPCB) rolls major pollutants into one 0–500 score: lower numbers mean cleaner, easier-to-breathe air; higher numbers mean more smog and lung strain.',
    whyItMatters: [
      '0–100 (Good / Satisfactory): Clean enough for normal walks, runs, and open windows.',
      '101–200 (Moderate): Fine for most healthy adults, though kids, elders, or sensitive lungs may notice mild irritation.',
      '201–400 (Poor / Very Poor): Unhealthy haze — heavy outdoor exercise and open windows pull fine smoke deep into lungs.',
      '401–500 (Severe): Emergency-level smog that affects even healthy people; stay indoors and seek medical help for any symptoms.',
    ],
    whatYouCanDo: [
      'Use the 4 Quick Answers on your Dashboard to decide on walks, kids’ play, windows, and masks in seconds.',
      'Always check the “Last updated” timestamp so you know the reading is fresh.',
    ],
    sourceNote: 'India Central Pollution Control Board (CPCB) National Air Quality Index',
    askAiPrompt: (val, city) =>
      `The Air Quality Score in ${city} is ${val}. In simple terms, what should my family do or avoid right now?`,
    evaluateValue: (value) => {
      const n = typeof value === 'number' ? value : null;
      if (n === null) {
        return {
          tone: 'unknown',
          badge: 'Unavailable',
          plainMeaning: 'No live score from the station right now—avoid assuming the air is clean.',
        };
      }
      if (n <= 100) {
        return {
          tone: 'good',
          badge: n <= 50 ? 'Clean Air' : 'Acceptable',
          plainMeaning: `At ${n}, outside air is comfortable for normal everyday outdoor plans.`,
        };
      }
      if (n <= 200) {
        return {
          tone: 'caution',
          badge: 'Moderate Haze',
          plainMeaning: `At ${n}, sensitive family members (kids, elders, asthma) should take outdoor breaks.`,
        };
      }
      return {
        tone: 'unhealthy',
        badge: n > 400 ? 'Severe Smog' : 'Unhealthy Air',
        plainMeaning: `At ${n}, pollution is high enough to irritate lungs—keep heavy activity indoors and wear an N95 outdoors.`,
      };
    },
  },

  pm25: {
    key: 'pm25',
    title: 'PM2.5 — Tiny Invisible Dust',
    friendlySubtitle: 'Microscopic smoke & exhaust particles 30× thinner than a human hair',
    unit: 'µg/m³',
    whatIsIt:
      'PM2.5 stands for microscopic particles smaller than 2.5 microns—about 30 times thinner than a single strand of hair. They come from vehicle exhaust, cooking smoke, crop burning, and power plants. Because they are so tiny, your nose cannot filter them out.',
    whyItMatters: [
      'Reaches deep into your lungs and can trigger coughing, scratchy throat, watery eyes, or shortness of breath.',
      'Children breathe faster per body weight, so their growing lungs absorb more PM2.5 during outdoor play.',
      'Older adults and anyone with asthma or heart sensitivities feel the strain fastest.',
    ],
    whatYouCanDo: [
      'Close exterior windows and run a True-HEPA purifier when PM2.5 climbs above 60 µg/m³.',
      'Wear a snug N95/KN95 mask outdoors—cloth and surgical masks do not block PM2.5 well.',
    ],
    sourceNote: 'CPCB India 24-hour standard (60 µg/m³) & WHO Air Quality Guidelines',
    askAiPrompt: (val, city) =>
      `PM2.5 in ${city} is ${val}. How does that affect my family today and how can we cut our exposure?`,
    evaluateValue: (value) => {
      const n = typeof value === 'number' ? value : null;
      if (n === null) {
        return {
          tone: 'unknown',
          badge: 'Unavailable',
          plainMeaning: 'This station did not report a live PM2.5 reading right now.',
        };
      }
      if (n <= 60) {
        return {
          tone: 'good',
          badge: 'Within India Safe Limit',
          plainMeaning: `${n} µg/m³ is within India’s 24-hour guideline (≤60 µg/m³).`,
        };
      }
      if (n <= 120) {
        return {
          tone: 'caution',
          badge: 'Elevated Fine Dust',
          plainMeaning: `${n} µg/m³ is above safe limits—avoid brisk running near traffic and watch sensitive lungs.`,
        };
      }
      return {
        tone: 'unhealthy',
        badge: 'High Fine Dust',
        plainMeaning: `${n} µg/m³ is heavily elevated—move workouts indoors, shut windows, and use an N95 outside.`,
      };
    },
  },

  pm10: {
    key: 'pm10',
    title: 'PM10 — Coarse Road & Construction Dust',
    friendlySubtitle: 'Larger dust & pollen particles that irritate your nose, eyes, and throat',
    unit: 'µg/m³',
    whatIsIt:
      'PM10 are slightly larger airborne particles (still 5× thinner than a human hair) kicked up by road traffic, construction sites, dry sweeping, and windy dust storms. While your nose traps some of them, high levels quickly irritate your upper airways.',
    whyItMatters: [
      'Causes sneezing, dry cough, itchy eyes, and dusty buildup inside homes.',
      'Dry broom sweeping indoors kicks settled PM10 straight back into the air your family breathes.',
    ],
    whatYouCanDo: [
      'Use wet mopping or a damp cloth indoors instead of dry sweeping.',
      'Avoid walking right alongside active construction or unpaved dusty roads.',
    ],
    sourceNote: 'CPCB India 24-hour PM10 standard (100 µg/m³)',
    askAiPrompt: (val, city) =>
      `PM10 dust in ${city} is ${val}. What simple home or outdoor steps help reduce dust irritation today?`,
    evaluateValue: (value) => {
      const n = typeof value === 'number' ? value : null;
      if (n === null) {
        return {
          tone: 'unknown',
          badge: 'Unavailable',
          plainMeaning: 'This station did not report a live PM10 reading right now.',
        };
      }
      if (n <= 100) {
        return {
          tone: 'good',
          badge: 'Low Dust',
          plainMeaning: `${n} µg/m³ is within India’s 24-hour dust guideline (≤100 µg/m³).`,
        };
      }
      if (n <= 250) {
        return {
          tone: 'caution',
          badge: 'Dusty Air',
          plainMeaning: `${n} µg/m³ means noticeable road dust—keep windows shut near busy streets and wet-mop indoors.`,
        };
      }
      return {
        tone: 'unhealthy',
        badge: 'Very Dusty',
        plainMeaning: `${n} µg/m³ is heavy coarse dust—limit outdoor time and protect eyes and throat outdoors.`,
      };
    },
  },

  humidity: {
    key: 'humidity',
    title: 'Humidity (Air Moisture)',
    friendlySubtitle: 'How damp the air feels—and how easily smog lingers',
    unit: '%',
    whatIsIt:
      'Humidity measures how much moisture is floating in the air. In winter or monsoon months, high humidity makes fine dust swell into thick smog haze; indoors, overly damp air encourages dust mites and mold.',
    whyItMatters: [
      'High outdoor humidity + high PM2.5 creates thick, lingering smog that stays heavy near ground level.',
      'Very dry air (<30%) can dry out your nose and throat, making pollution feel harsher.',
      'Comfortable indoor humidity is roughly 40%–60%.',
    ],
    whatYouCanDo: [
      'Run exhaust fans in bathrooms and kitchens to prevent damp indoor air.',
      'Drink extra water on dry, dusty days to soothe throat irritation.',
    ],
    sourceNote: 'Open-Meteo Weather & US EPA Indoor Air Humidity Guidance',
    askAiPrompt: (val, city) =>
      `Humidity in ${city} is ${val}. How does that affect today’s air quality and my home comfort?`,
    evaluateValue: (value) => {
      const n = typeof value === 'number' ? value : null;
      if (n === null) {
        return {
          tone: 'unknown',
          badge: 'Unavailable',
          plainMeaning: 'Live humidity data is currently unavailable.',
        };
      }
      if (n >= 35 && n <= 65) {
        return {
          tone: 'good',
          badge: 'Comfortable',
          plainMeaning: `${n}% is right in the comfortable range for breathing and home comfort.`,
        };
      }
      return {
        tone: 'caution',
        badge: n > 65 ? 'High Moisture' : 'Dry Air',
        plainMeaning:
          n > 65
            ? `${n}% moisture makes smog feel heavier and slows haze from clearing.`
            : `${n}% is quite dry, which can make dusty air feel harsher on your throat.`,
      };
    },
  },

  wind: {
    key: 'wind',
    title: 'Wind Speed & Air Clearing',
    friendlySubtitle: 'Nature’s broom—higher breezes disperse smog; calm air traps it',
    unit: 'km/h',
    whatIsIt:
      'Wind acts like a giant fan over a city. When wind speed is very low (calm air), car exhaust and smoke sit trapped right at street level. A steady breeze blows pollutants away and usually brings cleaner air.',
    whyItMatters: [
      'Calm winds (<8 km/h), especially on cool mornings or evenings, trap smog close to the ground.',
      'Moderate breezes (>15 km/h) help disperse smoke—though very gusty dry wind can lift road dust.',
    ],
    whatYouCanDo: [
      'On calm, high-AQI evenings, avoid assuming the air will clear overnight—keep bedroom windows shut.',
      'Check the 24-hour forecast chart before planning outdoor walks.',
    ],
    sourceNote: 'Open-Meteo Surface Wind & Atmospheric Dispersion Principles',
    askAiPrompt: (val, city) =>
      `Wind speed in ${city} is ${val}. Will today’s wind help clear the pollution or trap it?`,
    evaluateValue: (value) => {
      const n = typeof value === 'number' ? value : null;
      if (n === null) {
        return {
          tone: 'unknown',
          badge: 'Unavailable',
          plainMeaning: 'Live wind speed data is currently unavailable.',
        };
      }
      if (n < 8) {
        return {
          tone: 'caution',
          badge: 'Calm / Trapped Air',
          plainMeaning: `At ${n} km/h, air is moving slowly—city smoke and dust tend to linger near the ground.`,
        };
      }
      return {
        tone: 'good',
        badge: 'Helping Disperse Air',
        plainMeaning: `At ${n} km/h, steady airflow helps push stagnant smoke away from streets.`,
      };
    },
  },

  indoor_risk: {
    key: 'indoor_risk',
    title: 'Estimated Home Air Risk',
    friendlySubtitle: 'Questionnaire-based estimate—not a physical indoor sensor reading',
    whatIsIt:
      'Because most homes do not have a dedicated indoor PM2.5 monitor, BreathWiseAI estimates indoor air risk by combining today’s outdoor pollution with your 7 home answers (cooking exhaust, incense, cleaning method, sealing, and HEPA purifier).',
    whyItMatters: [
      'Even with windows closed, cooking without an exhaust fan or burning incense can spike indoor smoke fast.',
      'Simple habits like wet-mopping and running a chimney cut everyday exposure significantly.',
    ],
    whatYouCanDo: [
      'Update your 7-question Home Air Assessment whenever you change habits or seasons.',
      'Treat this as practical prevention guidance—not a laboratory measurement.',
    ],
    sourceNote: 'WHO Household Air Pollution & US EPA Indoor Air Quality Guidelines',
    askAiPrompt: (val, city) =>
      `My estimated home air risk in ${city} is ${val}. What are the easiest zero-cost ways to make my home air cleaner tonight?`,
    evaluateValue: (value) => {
      const text = typeof value === 'string' ? value.toLowerCase() : '';
      if (!text) {
        return {
          tone: 'unknown',
          badge: 'Estimated',
          plainMeaning: 'Complete the 7-question check to see your estimated indoor air risk.',
        };
      }
      if (text === 'low') {
        return {
          tone: 'good',
          badge: 'Low (Estimated)',
          plainMeaning: 'Your home setup looks well protected against common indoor smoke sources.',
        };
      }
      if (text === 'moderate' || text === 'elevated') {
        return {
          tone: 'caution',
          badge: `${text.toUpperCase()} (Estimated)`,
          plainMeaning: 'A few everyday tweaks (kitchen exhaust, damp mopping) can noticeably improve indoor air.',
        };
      }
      return {
        tone: 'unhealthy',
        badge: 'HIGH (Estimated)',
        plainMeaning: 'Outdoor smog plus indoor smoke sources likely elevate home particles—prioritize ventilation & filtration.',
      };
    },
  },

  co2_avoided: {
    key: 'co2_avoided',
    title: 'Estimated CO₂ Avoided',
    friendlySubtitle: 'Transparent math showing how your cleaner commute cuts city pollution',
    unit: 'kg CO₂e',
    whatIsIt:
      'Every time you carpool, take the metro, walk, or save electricity instead of solo driving, you prevent tailpipe and grid carbon emissions. We calculate this deterministically using published DEFRA and India CEA emission factors—and never mix it with personal health protection.',
    whyItMatters: [
      'Fewer solo vehicle trips directly cut both greenhouse gases and street-level PM2.5 exhaust.',
      'Every logged action displays its exact formula, distance, vehicle type, and data source.',
    ],
    whatYouCanDo: [
      'Tap “How this is estimated” on any logged action in My Impact to inspect the exact numbers.',
      'Log even short 1–2 day/week carpools or metro rides to see how quickly savings add up.',
    ],
    sourceNote: 'UK DEFRA Conversion Factors & CEA India CO₂ Baseline Database',
    askAiPrompt: (_val, city) =>
      `What are the highest-impact commute or home swaps I can make in ${city} to reduce both emissions and my family’s pollution exposure?`,
    evaluateValue: (value) => {
      const n = typeof value === 'number' ? value : null;
      if (n === null || n <= 0) {
        return {
          tone: 'unknown',
          badge: 'Estimate',
          plainMeaning: 'Log a carpool, metro ride, walk, or energy swap to see your estimated CO₂ avoided.',
        };
      }
      return {
        tone: 'good',
        badge: 'Estimated Savings',
        plainMeaning: `You’ve avoided an estimated ${n.toFixed(2)} kg CO₂e over the last 14 days.`,
      };
    },
  },
};
