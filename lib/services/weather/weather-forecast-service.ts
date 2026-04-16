import type { WeatherDayPayload } from "@/lib/weather/types";
import { daySummarySentence, formatSlotLabel } from "@/lib/weather/wmo-weather";

const SLOT_HOURS = [0, 4, 8, 12, 16, 20] as const;

interface OpenMeteoHourly {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  precipitation_probability: number[];
  weather_code: number[];
}

interface OpenMeteoDaily {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  apparent_temperature_max: number[];
  apparent_temperature_min: number[];
  precipitation_probability_max: number[];
}

function parseHourFromIsoLocal(t: string): { date: string; hour: number } | null {
  if (t.length < 13) return null;
  const date = t.slice(0, 10);
  const h = parseInt(t.slice(11, 13), 10);
  if (!Number.isFinite(h)) return null;
  return { date, hour: h };
}

function buildDayPayload(isoDate: string, hourly: OpenMeteoHourly, daily: OpenMeteoDaily): WeatherDayPayload | null {
  const di = daily.time.indexOf(isoDate);
  if (di < 0) return null;

  const weatherCode = daily.weather_code[di] ?? 0;
  const high = daily.temperature_2m_max[di] ?? 0;
  const low = daily.temperature_2m_min[di] ?? 0;
  const feelsHigh = daily.apparent_temperature_max[di] ?? high;
  const feelsLow = daily.apparent_temperature_min[di] ?? low;
  const maxPrecipProb = Math.round(daily.precipitation_probability_max[di] ?? 0);

  const slots: WeatherDayPayload["slots"] = [];
  const times = hourly.time;
  const temp = hourly.temperature_2m;
  const feels = hourly.apparent_temperature;
  const precip = hourly.precipitation_probability;

  for (const wantH of SLOT_HOURS) {
    let idx = -1;
    for (let i = 0; i < times.length; i++) {
      const parsed = parseHourFromIsoLocal(times[i]!);
      if (!parsed || parsed.date !== isoDate || parsed.hour !== wantH) continue;
      idx = i;
      break;
    }
    if (idx < 0) continue;
    slots.push({
      label: formatSlotLabel(wantH),
      hour: wantH,
      temp: Math.round((temp[idx] ?? 0) * 10) / 10,
      precipProb: Math.round(precip[idx] ?? 0),
      feels: Math.round((feels[idx] ?? temp[idx] ?? 0) * 10) / 10,
    });
  }

  return {
    date: isoDate,
    summary: daySummarySentence(weatherCode, maxPrecipProb),
    weatherCode,
    high: Math.round(high * 10) / 10,
    low: Math.round(low * 10) / 10,
    feelsHigh: Math.round(feelsHigh * 10) / 10,
    feelsLow: Math.round(feelsLow * 10) / 10,
    maxPrecipProb,
    slots,
  };
}

export class WeatherForecastService {
  async getForecast(input: { lat: number; lng: number; start: string; end: string }) {
    const { lat, lng, start, end } = input;

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !start || !end) {
      return { status: 400, data: { error: "Query params lat, lng, start, end (YYYY-MM-DD) are required" } };
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return { status: 400, data: { error: "Invalid coordinates" } };
    }

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("start_date", start);
    url.searchParams.set("end_date", end);
    url.searchParams.set("hourly", "temperature_2m,apparent_temperature,precipitation_probability,weather_code");
    url.searchParams.set(
      "daily",
      "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max",
    );

    let res: Response;
    try {
      res = await fetch(url.toString(), { cache: "no-store" });
    } catch {
      return { status: 502, data: { error: "Weather request failed" } };
    }

    const rawText = await res.text();
    let body: { error?: boolean; reason?: string; hourly?: OpenMeteoHourly; daily?: OpenMeteoDaily };
    try {
      body = JSON.parse(rawText) as typeof body;
    } catch {
      return { status: 502, data: { error: "Invalid JSON from weather service" } };
    }

    if (!res.ok) {
      const msg = typeof body.reason === "string" ? body.reason : `Weather service HTTP ${res.status}`;
      return { status: 502, data: { error: msg } };
    }

    if (body.error || !body.hourly || !body.daily) {
      return { status: 502, data: { error: body.reason || "Invalid Open-Meteo response" } };
    }

    const days: Record<string, WeatherDayPayload> = {};
    for (const isoDate of body.daily.time) {
      const payload = buildDayPayload(isoDate, body.hourly, body.daily);
      if (payload) days[isoDate] = payload;
    }

    return { status: 200, data: { days } };
  }
}

export const weatherForecastService = new WeatherForecastService();

