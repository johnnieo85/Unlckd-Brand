import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { UnitToggle } from './UnitToggle';
import { Measurement } from '../types';
import { gymService } from '../services/gymService';
import { cn } from '../lib/utils';

interface WeightProgressionChartProps {
  initialMeasurements?: Measurement[];
  defaultCollapsed?: boolean;
}

export function WeightProgressionChart({
  initialMeasurements,
  defaultCollapsed = false
}: WeightProgressionChartProps) {
  const [measurements, setMeasurements] = useState<Measurement[]>(initialMeasurements || []);
  const [chartMetric, setChartMetric] = useState<'weight' | 'bodyFat'>('weight');
  const [graphWeightUnit, setGraphWeightUnit] = useState<'lbs' | 'kg'>('lbs');
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [loading, setLoading] = useState(!initialMeasurements || initialMeasurements.length === 0);

  useEffect(() => {
    if (initialMeasurements && initialMeasurements.length > 0) {
      setMeasurements(initialMeasurements);
      setLoading(false);
    } else {
      gymService.getLatestMeasurements(50).then((data) => {
        setMeasurements(data || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [initialMeasurements]);

  const latestMeasurement = measurements.length > 0 
    ? [...measurements].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;

  const currentDisplayVal = (() => {
    if (!latestMeasurement) return '--';
    if (chartMetric === 'bodyFat') {
      return latestMeasurement.bodyFat ? `${latestMeasurement.bodyFat}%` : '--';
    }
    let w = Number(latestMeasurement.weight);
    if (!w) return '--';
    const loggedUnit = latestMeasurement.units?.weight || 'lbs';
    if (loggedUnit !== graphWeightUnit) {
      if (graphWeightUnit === 'kg' && loggedUnit === 'lbs') w = w * 0.453592;
      else if (graphWeightUnit === 'lbs' && loggedUnit === 'kg') w = w / 0.453592;
    }
    return `${w.toFixed(1)} ${graphWeightUnit}`;
  })();

  const chartData = [...measurements]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(m => {
      const val = chartMetric === 'weight' ? Number(m.weight) : Number(m.bodyFat);
      let displayVal = val;
      const loggedUnit = m.units?.weight || 'lbs';
      
      if (chartMetric === 'weight' && loggedUnit !== graphWeightUnit) {
        if (graphWeightUnit === 'kg' && loggedUnit === 'lbs') {
          displayVal = val * 0.453592;
        } else if (graphWeightUnit === 'lbs' && loggedUnit === 'kg') {
          displayVal = val / 0.453592;
        }
      }

      const dateObj = new Date(m.date + 'T00:00:00');
      return {
        date: dateObj.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
        value: parseFloat(displayVal.toFixed(1)),
        originalValue: val,
        originalUnit: chartMetric === 'weight' ? loggedUnit : '%',
        rawDate: m.date
      };
    })
    .filter(d => !isNaN(d.value) && d.value > 0);

  return (
    <Card className="p-4 sm:p-6 lg:p-8 bg-brand-surface border-white/5 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-extrabold text-gray-100 uppercase tracking-wider text-sm sm:text-base">Weight Progression</h3>
            <p className="text-[10px] text-gray-400 font-medium">Historical weight & body fat trends</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Metric Selector: Weight vs Body Fat */}
          <div className="flex items-center p-1 bg-black/50 border border-white/10 rounded-xl shadow-inner shrink-0">
            <button 
              type="button"
              onClick={() => setChartMetric('weight')}
              className={cn(
                "px-3 py-1 rounded-lg text-[10px] uppercase font-black transition-all cursor-pointer",
                chartMetric === 'weight' 
                  ? "bg-emerald-500 text-brand-dark shadow-md shadow-emerald-500/20 font-black" 
                  : "text-gray-400 hover:text-gray-200"
              )}
            >
              Weight
            </button>
            <button 
              type="button"
              onClick={() => setChartMetric('bodyFat')}
              className={cn(
                "px-3 py-1 rounded-lg text-[10px] uppercase font-black transition-all cursor-pointer",
                chartMetric === 'bodyFat' 
                  ? "bg-purple-500 text-white shadow-md shadow-purple-500/20 font-black" 
                  : "text-gray-400 hover:text-gray-200"
              )}
            >
              Body Fat
            </button>
          </div>

          {/* Unit Toggle */}
          {chartMetric === 'weight' && (
            <UnitToggle<'lbs' | 'kg'>
              unitA="lbs"
              unitB="kg"
              value={graphWeightUnit}
              onChange={(unit) => setGraphWeightUnit(unit)}
              size="sm"
              className="shrink-0"
            />
          )}

          {/* Current Value Display */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-mono font-bold text-gray-300 shrink-0">
            <span className="text-gray-400 uppercase font-sans text-[9px] tracking-wider font-extrabold">Current:</span>
            <span className="text-brand-primary font-black">
              {currentDisplayVal}
            </span>
          </div>

          {/* Collapse Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-400 hover:text-white p-1.5 h-8 w-8 rounded-lg hover:bg-white/5 shrink-0"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="h-64 sm:h-72 w-full pt-4">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs font-mono text-gray-500">
              Loading progress history...
            </div>
          ) : chartData.length < 2 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
              <TrendingUp className="w-8 h-8 text-gray-600" />
              <p className="text-xs font-mono text-gray-400 font-bold">At least 2 entries required to display graph</p>
              <p className="text-[10px] text-gray-500">Log body weight in measurements to track progression over time.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartMetric === 'weight' ? '#10B981' : '#A855F7'} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={chartMetric === 'weight' ? '#10B981' : '#A855F7'} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  stroke="#6B7280" 
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                />
                <YAxis 
                  stroke="#6B7280" 
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                  domain={['dataMin - 2', 'dataMax + 2']}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#0A0A0A] border border-white/10 p-3 rounded-xl shadow-2xl">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{label}</p>
                          <p className="text-sm font-black text-brand-primary">
                            {data.value} {chartMetric === 'weight' ? graphWeightUnit : '%'}
                          </p>
                          {chartMetric === 'weight' && data.originalUnit !== graphWeightUnit && (
                            <p className="text-[10px] text-gray-400 font-bold mt-1">
                              Logged as: {data.originalValue} {data.originalUnit}
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={chartMetric === 'weight' ? '#10B981' : '#A855F7'} 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#weightGrad)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </Card>
  );
}
