/**
 * Weather Plugin for Orbit Board
 * Fetches real weather data from OpenWeatherMap API with date-aware logic.
 */

window.OrbitPlugin_weather_plugin = {
    init: () => {
        console.log("Weather Plugin Initialized");

        const { React, Orbit } = window;
        const { Icons } = Orbit;

        // Shared cache for API results
        const weatherCache = new Map();
        const pendingRequests = new Map();

        const WeatherDayWidget = ({ date }) => {
            const settings = Orbit.getPluginSettings('weather-plugin');
            const [weather, setWeather] = React.useState(null);
            const [loading, setLoading] = React.useState(false);

            React.useEffect(() => {
                const fetchWeather = async () => {
                    const apiKey = settings.apiKey;
                    const location = settings.location || 'London';
                    const isCelsius = settings.showCelsius !== false;

                    if (!apiKey) return;

                    const now = new Date();
                    const diffTime = date.getTime() - now.getTime();
                    const diffDays = diffTime / (1000 * 60 * 60 * 24);

                    // OpenWeather Free API Constraints:
                    // 1. Current Weather: Works for 'today'
                    // 2. 5-Day Forecast: Works for today and the next 4 days.
                    // 3. Past days: NOT available in free tier.
                    // 4. Distant future (>5 days): NOT available in free tier.

                    const isToday = now.toDateString() === date.toDateString();
                    const isWithinForecast = diffDays > 0 && diffDays <= 5;

                    if (!isToday && !isWithinForecast) {
                        setWeather(null);
                        return;
                    }

                    const dateKey = date.toISOString().split('T')[0];
                    const cacheKey = `${location}-${dateKey}-${isCelsius}`;

                    if (weatherCache.has(cacheKey)) {
                        setWeather(weatherCache.get(cacheKey));
                        return;
                    }

                    if (pendingRequests.has(cacheKey)) {
                        const data = await pendingRequests.get(cacheKey);
                        setWeather(data);
                        return;
                    }

                    setLoading(true);

                    const fetchTask = (async () => {
                        try {
                            // 1. Get coordinates
                            const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`;
                            const geoRes = await fetch(geoUrl);
                            const geoData = await geoRes.json();
                            if (!geoData?.[0]) throw new Error("Location not found");
                            const { lat, lon } = geoData[0];

                            // 2. Fetch appropriate data
                            let weatherData;
                            if (isToday) {
                                const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${isCelsius ? 'metric' : 'imperial'}&appid=${apiKey}`;
                                const res = await fetch(url);
                                weatherData = await res.json();
                            } else {
                                const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${isCelsius ? 'metric' : 'imperial'}&appid=${apiKey}`;
                                const res = await fetch(url);
                                const forecast = await res.json();
                                // Find 12:00 PM forecast or closest to it for that day
                                weatherData = forecast.list?.find(item => item.dt_txt.includes(`${dateKey} 12:00:00`))
                                           || forecast.list?.find(item => item.dt_txt.startsWith(dateKey))
                                           || forecast.list?.[0];
                            }

                            if (!weatherData) return null;

                            const result = {
                                temp: Math.round(weatherData.main.temp),
                                condition: weatherData.weather[0].main,
                                icon: mapIcon(weatherData.weather[0].main),
                                unit: isCelsius ? '°C' : '°F'
                            };

                            weatherCache.set(cacheKey, result);
                            return result;
                        } catch (e) {
                            console.error("Weather Plugin Error:", e);
                            return null;
                        }
                    })();

                    pendingRequests.set(cacheKey, fetchTask);
                    const finalData = await fetchTask;
                    pendingRequests.delete(cacheKey);
                    setWeather(finalData);
                    setLoading(false);
                };

                fetchWeather();
            }, [date, settings.apiKey, settings.location, settings.showCelsius]);

            const mapIcon = (condition) => {
                const c = condition.toLowerCase();
                if (c.includes('cloud')) return 'Cloud';
                if (c.includes('rain')) return 'CloudRain';
                if (c.includes('snow')) return 'Snowflake';
                if (c.includes('storm')) return 'CloudLightning';
                if (c.includes('clear') || c.includes('sun')) return 'Sun';
                return 'Cloud';
            };

            if (!settings.apiKey) return null; // Hide if no key

            if (loading && !weather) {
                return React.createElement('div', { className: 'w-4 h-4 bg-gray-100 rounded-full animate-pulse' });
            }

            if (!weather) return null;

            const IconComponent = Icons[weather.icon] || Icons.Cloud;

            return React.createElement('div', {
                className: 'flex items-center gap-0.5 text-[9px] font-bold text-gray-500',
                title: `${weather.condition} in ${settings.location || 'London'} on ${date.toDateString()}`
            },
                React.createElement(IconComponent, { className: `h-3 w-3 ${weather.icon === 'Sun' ? 'text-yellow-500' : 'text-blue-400'}` }),
                React.createElement('span', null, `${weather.temp}${weather.unit}`)
            );
        };

        Orbit.registerComponent('calendar-day', WeatherDayWidget);
    }
};
