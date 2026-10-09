import { publicJson as json } from "./public-json.mjs";
export async function currentWeather(city, signal, fetcher = fetch) {
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
