import {
  CloudOff,
  Compass,
  Droplets,
  MapPin,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Thermometer,
  Wind,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { ForecastChart } from '@/components/dashboard/ForecastChart';
import { AqiBadge } from '@/components/shared/AqiBadge';
import { DataStateWrapper } from '@/components/shared/DataStateWrapper';
import { FreshnessBanner } from '@/components/shared/FreshnessBanner';
import { MedicalDisclaimer } from '@/components/shared/MedicalDisclaimer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAqiToken } from '@/config/aqi-tokens';
import { APP_ROUTES } from '@/config/routes';
import { useAirQuality } from '@/hooks/useAirQuality';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import { formatMeasurement, formatWindDirection } from '@/lib/formatters';

export function DashboardPage() {
  const { selectedLocation, openPicker } = useSelectedLocation();
  const { data, isLoading, isRefreshing, error, refresh } = useAirQuality();

  const current = data?.current;
  const weather = data?.weather;
  const token = getAqiToken(current?.category ?? 'Unavailable');
  const pm25Reading = current?.readings.find((r) => r.pollutant === 'PM2.5');
  const pm10Reading = current?.readings.find((r) => r.pollutant === 'PM10');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-600">{selectedLocation.label}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={openPicker}>
            <MapPin className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
            Change City
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={isLoading || isRefreshing}
            onClick={() => refresh(true)}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </div>

      <DataStateWrapper isLoading={isLoading} error={error} onRetry={() => refresh(true)}>
        {data && current ? (
          <div className="space-y-5">
            <FreshnessBanner
              freshnessStatus={current.freshnessStatus}
              observedAt={current.observedAt}
              source={current.source}
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Hero CPCB NAQI Card */}
              <Card className={`lg:col-span-2 ${token.surfaceClass} ${token.borderClass}`}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Wind className={`h-5 w-5 ${token.accentTextClass}`} aria-hidden="true" />
                      Current Air Quality (CPCB NAQI)
                    </CardTitle>
                    <AqiBadge category={current.category} aqi={current.aqi} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-baseline gap-4">
                    {current.aqi !== null ? (
                      <p className={`text-5xl font-extrabold tracking-tight ${token.accentTextClass}`}>
                        {current.aqi}
                      </p>
                    ) : (
                      <p className="flex items-center gap-2 text-2xl font-bold text-slate-700">
                        <CloudOff className="h-6 w-6 text-slate-400" aria-hidden="true" />
                        Unavailable
                      </p>
                    )}

                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {current.category} ({token.rangeLabel})
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        {current.dominantPollutant ? (
                          <Badge variant="neutral">
                            Dominant: {current.dominantPollutant.toUpperCase()}
                          </Badge>
                        ) : null}
                        {data.fallbackProviderUsed ? (
                          <Badge variant="outline">Open-Meteo Fallback</Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <p className="rounded-xl bg-white/80 p-3.5 text-sm leading-relaxed text-slate-800">
                    {current.healthGuidance}
                  </p>

                  {/* PM2.5 & PM10 Pollutant Readings */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      { label: 'PM2.5', reading: pm25Reading, unit: 'µg/m³' },
                      { label: 'PM10', reading: pm10Reading, unit: 'µg/m³' },
                    ].map(({ label, reading, unit }) => (
                      <div
                        key={label}
                        className="rounded-xl border border-slate-200/80 bg-white/90 p-3.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-500">{label}</span>
                          <span className="text-[11px] capitalize text-slate-400">
                            {reading?.freshnessStatus ?? 'unavailable'}
                          </span>
                        </div>
                        <p className="mt-1 text-xl font-bold text-slate-900">
                          {formatMeasurement(reading?.value, unit)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Right Column: Weather + Quick Actions */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Local Weather</CardTitle>
                    <CardDescription>Source: {weather?.source ?? 'Open-Meteo'}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <Thermometer className="mx-auto h-4 w-4 text-teal-700" aria-hidden="true" />
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {formatMeasurement(weather?.tempC, '°C')}
                      </p>
                      <p className="text-[11px] text-slate-500">Temp</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <Droplets className="mx-auto h-4 w-4 text-sky-600" aria-hidden="true" />
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {formatMeasurement(weather?.humidityPct, '%')}
                      </p>
                      <p className="text-[11px] text-slate-500">Humidity</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <Compass className="mx-auto h-4 w-4 text-slate-600" aria-hidden="true" />
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {formatMeasurement(weather?.windSpeedKmh, 'km/h')}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Wind {formatWindDirection(weather?.windDirectionDeg)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <ShieldCheck className="h-4 w-4 text-teal-700" aria-hidden="true" />
                      Next Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <Link to={APP_ROUTES.PROFILE}>
                      <Button className="w-full justify-start" size="sm" variant="primary">
                        Personalize Family Profile
                      </Button>
                    </Link>
                    <Link to={APP_ROUTES.PLANNER}>
                      <Button className="w-full justify-start" size="sm" variant="outline">
                        Open Daily Plan
                      </Button>
                    </Link>
                    <Link to={APP_ROUTES.ASSISTANT}>
                      <Button className="w-full justify-start" size="sm" variant="secondary">
                        <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />
                        Ask BreatheWise AI
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>

            <ForecastChart forecasts={data.forecasts} />
          </div>
        ) : null}
      </DataStateWrapper>

      <MedicalDisclaimer />
    </div>
  );
}
