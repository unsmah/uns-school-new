/**
 * UNS SCHOOL — Weather Service for Algerian Middle Schools
 * Fetches real-time weather using Open-Meteo API (free, no API key required)
 * with offline caching and Algerian Wilaya coordinates fallback.
 */

export interface WeatherData {
  city: string;
  temperature: number; // °C
  humidity: number; // %
  windSpeed: number; // km/h
  weatherCode: number;
  conditionLabel: {
    en: string;
    ar: string;
    fr: string;
  };
  iconType: 'sunny' | 'partly-cloudy' | 'cloudy' | 'rain' | 'thunder' | 'snow' | 'fog';
  lastUpdated: string;
}

// Preset coordinates for Algerian Wilayas / Cities
const ALGERIAN_CITIES: Record<string, { lat: number; lon: number; name: string; nameAr: string }> = {
  alger: { lat: 36.7538, lon: 3.0588, name: 'Algiers', nameAr: 'الجزائر العاصمة' },
  algiers: { lat: 36.7538, lon: 3.0588, name: 'Algiers', nameAr: 'الجزائر العاصمة' },
  oran: { lat: 35.6971, lon: -0.6308, name: 'Oran', nameAr: 'وهران' },
  constantine: { lat: 36.365, lon: 6.6147, name: 'Constantine', nameAr: 'قسنطينة' },
  annaba: { lat: 36.9, lon: 7.7667, name: 'Annaba', nameAr: 'عنابة' },
  blida: { lat: 36.47, lon: 2.83, name: 'Blida', nameAr: 'البليدة' },
  setif: { lat: 36.19, lon: 5.41, name: 'Sétif', nameAr: 'سطيف' },
  batna: { lat: 35.55, lon: 6.17, name: 'Batna', nameAr: 'باتنة' },
  tlemcen: { lat: 34.88, lon: -1.32, name: 'Tlemcen', nameAr: 'تلمسان' },
  bejaia: { lat: 36.75, lon: 5.08, name: 'Béjaïa', nameAr: 'بجاية' },
  tizi: { lat: 36.71, lon: 4.05, name: 'Tizi Ouzou', nameAr: 'تيزي وزو' },
  'tizi ouzou': { lat: 36.71, lon: 4.05, name: 'Tizi Ouzou', nameAr: 'تيزي وزو' },
  biskra: { lat: 34.85, lon: 5.73, name: 'Biskra', nameAr: 'بسكرة' },
  djelfa: { lat: 34.67, lon: 3.25, name: 'Djelfa', nameAr: 'الجلفة' },
  medea: { lat: 36.26, lon: 2.75, name: 'Médéa', nameAr: 'المدية' },
  mostaganem: { lat: 35.93, lon: 0.09, name: 'Mostaganem', nameAr: 'مستغانم' },
  msila: { lat: 35.7, lon: 4.54, name: "M'Sila", nameAr: 'المسيلة' },
  mascara: { lat: 35.4, lon: 0.14, name: 'Mascara', nameAr: 'معسكر' },
  ouargla: { lat: 31.95, lon: 5.32, name: 'Ouargla', nameAr: 'ورقلة' },
  tiaret: { lat: 35.37, lon: 1.32, name: 'Tiaret', nameAr: 'تيارت' },
  chlef: { lat: 36.16, lon: 1.33, name: 'Chlef', nameAr: 'الشلف' },
  skikda: { lat: 36.87, lon: 6.9, name: 'Skikda', nameAr: 'سكيكدة' },
  sidi: { lat: 35.2, lon: -0.63, name: 'Sidi Bel Abbès', nameAr: 'سيدي بلعباس' },
  'sidi bel abbes': { lat: 35.2, lon: -0.63, name: 'Sidi Bel Abbès', nameAr: 'سيدي بلعباس' },
  boumerdes: { lat: 36.76, lon: 3.47, name: 'Boumerdès', nameAr: 'بومرداس' },
  bouira: { lat: 36.37, lon: 3.9, name: 'Bouira', nameAr: 'البويرة' },
  tipaza: { lat: 36.59, lon: 2.44, name: 'Tipaza', nameAr: 'تيبازة' },
  jijel: { lat: 36.82, lon: 5.77, name: 'Jijel', nameAr: 'جيجل' },
  guelma: { lat: 36.46, lon: 7.43, name: 'Guelma', nameAr: 'قالمة' },
  tebessa: { lat: 35.4, lon: 8.12, name: 'Tébessa', nameAr: 'تبسة' },
  bordj: { lat: 36.07, lon: 4.76, name: 'Bordj Bou Arréridj', nameAr: 'برج بوعريريج' },
  eloued: { lat: 33.37, lon: 6.86, name: 'El Oued', nameAr: 'الوادي' },
  ghardaia: { lat: 32.49, lon: 3.67, name: 'Ghardaïa', nameAr: 'غرداية' },
  bechar: { lat: 31.62, lon: -2.22, name: 'Béchar', nameAr: 'بشار' },
  adrar: { lat: 27.87, lon: -0.29, name: 'Adrar', nameAr: 'أدرار' },
  tamanrasset: { lat: 22.79, lon: 5.52, name: 'Tamanrasset', nameAr: 'تمنراست' },
};

function getWeatherCondition(code: number): {
  label: { en: string; ar: string; fr: string };
  iconType: WeatherData['iconType'];
} {
  // WMO Weather interpretation codes (WW)
  if (code === 0) {
    return {
      label: { en: 'Clear sky', ar: 'سماء صافية', fr: 'Ciel dégagé' },
      iconType: 'sunny',
    };
  }
  if (code === 1 || code === 2) {
    return {
      label: { en: 'Mainly clear / Partly cloudy', ar: 'قليل الغيوم', fr: 'Partiellement nuageux' },
      iconType: 'partly-cloudy',
    };
  }
  if (code === 3) {
    return {
      label: { en: 'Overcast', ar: 'غائم كلياً', fr: 'Couvert' },
      iconType: 'cloudy',
    };
  }
  if (code >= 45 && code <= 48) {
    return {
      label: { en: 'Foggy', ar: 'ضبابي', fr: 'Brouillard' },
      iconType: 'fog',
    };
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return {
      label: { en: 'Rain / Showers', ar: 'ممطر / زخات مطر', fr: 'Pluie / Averses' },
      iconType: 'rain',
    };
  }
  if (code >= 71 && code <= 77) {
    return {
      label: { en: 'Snow', ar: 'ثلوج', fr: 'Neige' },
      iconType: 'snow',
    };
  }
  if (code >= 95 && code <= 99) {
    return {
      label: { en: 'Thunderstorm', ar: 'عواصف رعدية', fr: 'Orageux' },
      iconType: 'thunder',
    };
  }
  return {
    label: { en: 'Pleasant', ar: 'معتدل', fr: 'Agréable' },
    iconType: 'partly-cloudy',
  };
}

export async function fetchCityWeather(cityQuery?: string | null): Promise<WeatherData> {
  const defaultCity = ALGERIAN_CITIES['alger'];
  let targetLat = defaultCity.lat;
  let targetLon = defaultCity.lon;
  let targetName = defaultCity.name;
  let targetNameAr = defaultCity.nameAr;

  if (cityQuery && cityQuery.trim()) {
    const cleanQuery = cityQuery.toLowerCase().trim();
    // Check in Algerian cities dictionary
    const foundKey = Object.keys(ALGERIAN_CITIES).find(
      (k) => cleanQuery.includes(k) || k.includes(cleanQuery)
    );

    if (foundKey) {
      const match = ALGERIAN_CITIES[foundKey];
      targetLat = match.lat;
      targetLon = match.lon;
      targetName = match.name;
      targetNameAr = match.nameAr;
    } else {
      targetName = cityQuery.trim();
      targetNameAr = cityQuery.trim();
    }
  }

  // Check localStorage cache (valid for 30 minutes)
  const cacheKey = `uns_weather_${targetLat.toFixed(2)}_${targetLon.toFixed(2)}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      const cacheTime = new Date(parsed.timestamp).getTime();
      if (Date.now() - cacheTime < 30 * 60 * 1000) {
        return parsed.data;
      }
    } catch {
      // Ignore cache parse error
    }
  }

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${targetLat}&longitude=${targetLon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Africa%2FAlgiers`,
      { signal: AbortSignal.timeout(4000) }
    );

    if (res.ok) {
      const json = await res.json();
      const current = json.current;
      const condition = getWeatherCondition(current.weather_code);

      const data: WeatherData = {
        city: targetName,
        temperature: Math.round(current.temperature_2m),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        weatherCode: current.weather_code,
        conditionLabel: condition.label,
        iconType: condition.iconType,
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      localStorage.setItem(
        cacheKey,
        JSON.stringify({ timestamp: new Date().toISOString(), data })
      );
      return data;
    }
  } catch (err) {
    console.warn('Could not fetch live weather, using fallback:', err);
  }

  // Fallback default pleasant Algerian climate
  return {
    city: targetName,
    temperature: 22,
    humidity: 55,
    windSpeed: 14,
    weatherCode: 1,
    conditionLabel: { en: 'Clear & Sunny', ar: 'مشمس ومعتدل', fr: 'Ensoleillé' },
    iconType: 'sunny',
    lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}
