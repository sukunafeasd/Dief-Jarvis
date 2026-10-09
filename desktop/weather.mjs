import { publicJson as json } from "./public-json.mjs";
async function locate(city, signal, fetcher) {
  if (typeof city !== "string" || !city.trim() || city.length > 100)
    throw Error("Informe uma cidade.");
  const geo = await json(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=pt&format=json`,
    signal,
    fetcher,
  );
  const place = geo.results?.[0];
  if (
    !place ||
    !Number.isFinite(place.latitude) ||
    !Number.isFinite(place.longitude)
  )
    throw Error("Cidade nao encontrada.");
  return place;
}
export async function currentWeather(city, signal, fetcher = fetch) {
  const place = await locate(city, signal, fetcher);
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,weather_code&timezone=auto`;
  const weather = await json(url, signal, fetcher);
  if (
    !Number.isFinite(weather.current?.temperature_2m) ||
    typeof weather.current.time !== "string"
  )
    throw Error("Servico nao retornou temperatura atual valida.");
  return {
    title: [place.name, place.admin1, place.country]
      .filter(Boolean)
      .join(", ")
      .slice(0, 100),
    value: String(weather.current.temperature_2m),
    unit: "C",
    source: url,
    measuredAt: weather.current.time,
    temperature: weather.current.temperature_2m,
  };
}
export async function weatherForecast(city, signal, fetcher = fetch) {
  const place = await locate(city, signal, fetcher);
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&forecast_days=7&timezone=auto`;
  const data = await json(url, signal, fetcher),
    daily = data.daily;
  if (
    !Array.isArray(daily?.time) ||
    !daily.time.length ||
    daily.time.length > 7
  )
    throw Error("Servico nao retornou uma previsao valida.");
  const days = daily.time.map((date, index) => {
    const max = daily.temperature_2m_max?.[index],
      min = daily.temperature_2m_min?.[index],
      rain = daily.precipitation_probability_max?.[index],
      code = daily.weather_code?.[index];
    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      ![max, min, rain, code].every(Number.isFinite) ||
      min > max ||
      rain < 0 ||
      rain > 100
    )
      throw Error(
        "Dados incompletos na previsao; nenhuma medida sera inventada.",
      );
    return {
      date,
      minC: min,
      maxC: max,
      precipitationChance: rain,
      weatherCode: code,
    };
  });
  return {
    title: [place.name, place.admin1, place.country]
      .filter(Boolean)
      .join(", ")
      .slice(0, 100),
    source: url,
    fetchedAt: new Date().toISOString(),
    timezone: data.timezone,
    days,
  };
}
