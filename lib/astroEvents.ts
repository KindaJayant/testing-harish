import "server-only";

import { fetchPageText } from "@/lib/exa";

// Planet ingress, retrograde and eclipse dates from Drik Panchang (New Delhi, IST) for the Monthly,
// Half-Yearly and Yearly plan windows, so long-horizon plans never guess an astronomical date.

interface Planet {
  name: string;
  slug: string;
  // Drik page heading word, e.g. "2026 Surya Gochar"
  heading: string;
  // Slow movers can sit in one sign for over a year, so their current sign needs the previous year too.
  slow?: boolean;
  retrograde?: boolean;
}

interface DatedEvent {
  day: string;
  time: string;
  text: string;
}

interface SignChange {
  planet: Planet;
  sign: string;
  day: string;
  time: string;
}

const DRIK = "https://www.drikpanchang.com";
const GEONAME_ID = "1273294";
const RASHIS = ["Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya", "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const PLANETS: Planet[] = [
  { name: "Sun", slug: "surya", heading: "Surya" },
  { name: "Mercury", slug: "budha", heading: "Budha", retrograde: true },
  { name: "Venus", slug: "shukra", heading: "Shukra", retrograde: true },
  { name: "Mars", slug: "mangal", heading: "Mangal", retrograde: true },
  { name: "Jupiter", slug: "guru", heading: "Guru", slow: true, retrograde: true },
  { name: "Saturn", slug: "shani", heading: "Shani", slow: true, retrograde: true },
  // Ketu always changes sign with Rahu, into the opposite sign.
  { name: "Rahu", slug: "rahu", heading: "Rahu", slow: true }
];

// Parashari dignities.
const DIGNITY: Record<string, { exalted: string; debilitated: string; own: string[] }> = {
  Sun: { exalted: "Mesha", debilitated: "Tula", own: ["Simha"] },
  Mercury: { exalted: "Kanya", debilitated: "Meena", own: ["Mithuna", "Kanya"] },
  Venus: { exalted: "Meena", debilitated: "Kanya", own: ["Vrishabha", "Tula"] },
  Mars: { exalted: "Makara", debilitated: "Karka", own: ["Mesha", "Vrishchika"] },
  Jupiter: { exalted: "Karka", debilitated: "Makara", own: ["Dhanu", "Meena"] },
  Saturn: { exalted: "Tula", debilitated: "Mesha", own: ["Makara", "Kumbha"] }
};

const DATE_AT_TIME = String.raw`([A-Z][a-z]+ \d{1,2}, \d{4}), \w+ at (\d{1,2}:\d{2} [AP]M)`;

// "February 17, 2026" -> "2026-02-17"
function toIsoDay(longDate: string): string {
  const [, month, day, year] = longDate.match(/([A-Z][a-z]+) (\d{1,2}), (\d{4})/) ?? [];
  return `${year}-${String(MONTHS.indexOf(month) + 1).padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function shiftDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Monthly: the calendar month; Half-Yearly: 6 months from that month; Yearly: 4 quarters from its quarter.
function planWindow(date: string, period: string): { start: string; end: string } | null {
  const months = { monthly: 1, half_yearly: 6, yearly: 12 }[period];
  if (!months) {
    return null;
  }
  const [year, month] = date.split("-").map(Number);
  const startMonth = period === "yearly" ? Math.floor((month - 1) / 3) * 3 : month - 1;
  return {
    start: new Date(Date.UTC(year, startMonth, 1)).toISOString().slice(0, 10),
    end: new Date(Date.UTC(year, startMonth + months, 0)).toISOString().slice(0, 10)
  };
}

// Drik throttles bursts of requests, so run at most `concurrency` page fetches at once.
function createLimiter(concurrency: number) {
  let active = 0;
  const waiting: Array<() => void> = [];
  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (active >= concurrency) {
      await new Promise<void>((resolve) => waiting.push(resolve));
    }
    active++;
    try {
      return await task();
    } finally {
      active--;
      waiting.shift()?.();
    }
  };
}

function yearsFrom(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

function describeSign(planet: string, sign: string): string {
  const dignity = DIGNITY[planet];
  if (planet === "Rahu") {
    return `${sign} (Ketu in ${RASHIS[(RASHIS.indexOf(sign) + 6) % 12]})`;
  }
  if (!dignity) {
    return sign;
  }
  const note =
    dignity.exalted === sign ? " (exalted)" : dignity.debilitated === sign ? " (debilitated)" : dignity.own.includes(sign) ? " (own sign)" : "";
  return `${sign}${note}`;
}

async function fetchSignChanges(planet: Planet, year: number): Promise<SignChange[] | null> {
  const text = await fetchPageText(
    `${DRIK}/planet/transit/${planet.slug}-transit-date-time.html?year=${year}&geoname-id=${GEONAME_ID}`,
    `${year} ${planet.heading} Gochar`
  );
  if (!text) {
    return null;
  }
  // "True Rahu" lines are the true node; the traditional mean-node date is the unprefixed one.
  const pattern = new RegExp(`(True )?(?:\\w+ transits to )?(${RASHIS.join("|")})\\s*\\n?\\s*${DATE_AT_TIME}`, "g");
  return [...text.matchAll(pattern)]
    .filter(([, truePrefix]) => !truePrefix)
    .map(([, , sign, longDate, time]) => ({ planet, sign, day: toIsoDay(longDate), time }));
}

async function fetchRetrogradeChanges(planet: Planet, year: number): Promise<DatedEvent[] | null> {
  const text = await fetchPageText(
    `${DRIK}/planet/retrograde/${planet.slug}-retrograde-date-time.html?year=${year}&geoname-id=${GEONAME_ID}`,
    `${year} ${planet.name} Retrograde`
  );
  if (!text) {
    return null;
  }
  const pattern = new RegExp(`becomes (Retrograde|Progressive) On\\s*\\n?\\s*${DATE_AT_TIME}`, "g");
  return [...text.matchAll(pattern)].map(([, motion, longDate, time]) => ({
    day: toIsoDay(longDate),
    time,
    text: motion === "Retrograde" ? `${planet.name} turns retrograde` : `${planet.name} turns direct`
  }));
}

async function fetchEclipses(year: number): Promise<DatedEvent[] | null> {
  const text = await fetchPageText(`${DRIK}/eclipse/eclipse-date-time.html?year=${year}&geoname-id=${GEONAME_ID}`, `${year} Eclipse List`);
  if (!text) {
    return null;
  }
  return [
    ...text.matchAll(/((?:Total|Partial|Annular|Penumbral|Hybrid) (?:Solar|Lunar) Eclipse)\s*\n?\s*([A-Z][a-z]+ \d{1,2}, \d{4}), \w+/g)
  ].map(([, kind, longDate]) => {
    const day = toIsoDay(longDate);
    return { day, time: "", text: `${kind} (cash preferred ${shiftDays(day, -3)} to ${shiftDays(day, 3)})` };
  });
}

export async function getAstroEventsContext(date: string, period: string): Promise<string> {
  const window = planWindow(date, period);
  if (!window) {
    return "";
  }
  const startYear = Number(window.start.slice(0, 4));
  const endYear = Number(window.end.slice(0, 4));
  const missing: string[] = [];
  const limit = createLimiter(6);

  const [signChanges, retrogrades, eclipses] = await Promise.all([
    Promise.all(
      PLANETS.flatMap((planet) =>
        yearsFrom(planet.slow ? startYear - 1 : startYear, endYear).map(async (year) => {
          const changes = await limit(() => fetchSignChanges(planet, year));
          if (!changes) {
            missing.push(`${planet.name} transits ${year}`);
          }
          return changes ?? [];
        })
      )
    ).then((lists) => lists.flat().sort((a, b) => (a.day < b.day ? -1 : 1))),
    Promise.all(
      PLANETS.filter((planet) => planet.retrograde).map(async (planet) => {
        const events = (
          await Promise.all(
            yearsFrom(startYear, endYear).map(async (year) => {
              const changes = await limit(() => fetchRetrogradeChanges(planet, year));
              if (!changes) {
                missing.push(`${planet.name} retrograde ${year}`);
              }
              return changes ?? [];
            })
          )
        ).flat();
        return { planet, events: events.sort((a, b) => (a.day < b.day ? -1 : 1)) };
      })
    ),
    Promise.all(
      yearsFrom(startYear, endYear).map(async (year) => {
        const events = await limit(() => fetchEclipses(year));
        if (!events) {
          missing.push(`eclipses ${year}`);
        }
        return events ?? [];
      })
    ).then((lists) => lists.flat())
  ]);

  const inWindow = (day: string) => day >= window.start && day <= window.end;

  const positions = PLANETS.map((planet) => {
    const current = signChanges.filter((change) => change.planet === planet && change.day < window.start).at(-1);
    return current ? `${planet.name} in ${describeSign(planet.name, current.sign)} since ${current.day}` : null;
  }).filter(Boolean);

  // A planet is retrograde at the window start if its last motion change before then was "turns retrograde";
  // if its first change inside the year is "turns direct", it was already retrograde coming into the year.
  const retrogradeAtStart = retrogrades
    .map(({ planet, events }) => {
      const before = events.filter((event) => event.day < window.start).at(-1);
      const firstAfter = events.find((event) => event.day >= window.start);
      if (before?.text.endsWith("retrograde")) {
        return `${planet.name} (since ${before.day})`;
      }
      if (!before && firstAfter?.text.endsWith("direct")) {
        return `${planet.name} (until ${firstAfter.day})`;
      }
      return null;
    })
    .filter(Boolean);

  const events: DatedEvent[] = [
    ...signChanges
      .filter((change) => inWindow(change.day))
      .map((change) => ({
        day: change.day,
        time: change.time,
        text: `${change.planet.name} enters ${describeSign(change.planet.name, change.sign)}`
      })),
    ...retrogrades.flatMap(({ events: motion }) => motion.filter((event) => inWindow(event.day))),
    ...eclipses.filter((event) => inWindow(event.day))
  ]
    // A retrograde spanning New Year appears on both years' pages.
    .filter((event, i, all) => all.findIndex((other) => other.day === event.day && other.text === event.text) === i)
    .sort((a, b) => (a.day === b.day ? 0 : a.day < b.day ? -1 : 1));

  const lines = [
    `### 1C. PLANETARY EVENTS ${window.start} to ${window.end} (Drik Panchang, New Delhi IST; this is the complete list for the window):`,
    `Positions on ${window.start}: ${positions.join(" | ") || "not listed"}`,
    `Retrograde on ${window.start}: ${retrogradeAtStart.join(", ") || "none"}`,
    "Events in window (chronological):",
    ...(events.length > 0
      ? events.map((event) => `- ${event.day}${event.time ? ` ${event.time}` : ""}: ${event.text}`)
      : ["- none"]),
    `Eclipses in window: ${eclipses.some((event) => inWindow(event.day)) ? "listed above" : "none"}`
  ];
  if (missing.length > 0) {
    console.warn(`Drik pages not fetched: ${missing.join(", ")}`);
  }
  return lines.join("\n");
}
