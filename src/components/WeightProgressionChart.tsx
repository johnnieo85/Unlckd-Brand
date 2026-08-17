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
    <Card className="p-4 sm:p-6 bg-[#111111] border border-[#292929] overflow-hidden rounded-[6px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#292929]">
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2 bg-[#00DFA2]/10 rounded-[4px] border border-[#00DFA2]/20">
            <TrendingUp className="w-4 h-4 text-brand-primary" />
          </div>
          <div>
            <h3 className="font-display font-bold text-white uppercase tracking-normal text-base sm:text-lg">Weight Progression</h3>
            <p className="text-[11px] text-[#A1A1A1] font-sans">Historical weight & body fat trends</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Metric Selector: Weight vs Body Fat */}
          <div className="flex items-center p-0.5 bg-[#080808] border border-[#292929] rounded-[4px] shrink-0">
            <button 
              type="button"
              onClick={() => setChartMetric('weight')}
              className={cn(
                "px-3 py-1 rounded-[3px] text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer",
                chartMetric === 'weight' 
                  ? "bg-brand-primary text-black font-extrabold" 
                  : "text-[#A1A1A1] hover:text-white"
              )}
            >
              Weight
            </button>
            <button 
              type="button"
              onClick={() => setChartMetric('bodyFat')}
              className={cn(
                "px-3 py-1 rounded-[3px] text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer",
                chartMetric === 'bodyFat' 
                  ? "bg-purple-500 text-white font-extrabold" 
                  : "text-[#A1A1A1] hover:text-white"
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
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171717] border border-[#292929] rounded-[4px] text-xs font-mono font-bold text-white shrink-0">
            <span className="text-[#6C6C6C] uppercase font-sans text-[10px] tracking-wider font-bold">Current:</span>
            <span className="text-brand-primary font-bold">
              {currentDisplayVal}
            </span>
          </div>

          {/* Collapse Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-[#A1A1A1] hover:text-white p-1.5 h-8 w-8 rounded-[4px] hover:bg-[#171717] shrink-0"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="h-64 sm:h-72 w-full pt-2">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs font-mono text-[#6C6C6C]">
              Loading progress history...
            </div>
          ) : chartData.length < 2 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 border border-dashed border-[#292929] rounded-[4px] bg-[#080808]/50">
              <TrendingUp className="w-6 h-6 text-[#6C6C6C]" />
              <p className="text-xs font-sans text-[#A1A1A1] font-bold uppercase tracking-wider">At least 2 entries required to display graph</p>
              <p className="text-[11px] text-[#6C6C6C]">Log body weight in measurements to track progression over time.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartMetric === 'weight' ? '#00DFA2' : '#A855F7'} stopOpacity={0.25}/>
                    <stop offset="95%" stopColor={chartMetric === 'weight' ? '#00DFA2' : '#A855F7'} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  stroke="#6C6C6C" 
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#292929' }}
                />
                <YAxis 
                  stroke="#6C6C6C" 
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#292929' }}
                  domain={['dataMin - 2', 'dataMax + 2']}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#080808] border border-[#292929] p-3 rounded-[4px] shadow-2xl">
                          <p className="text-[10px] font-bold text-[#6C6C6C] uppercase tracking-widest mb-1">{label}</p>
                          <p className="text-sm font-bold text-brand-primary">
                            {data.value} {chartMetric === 'weight' ? graphWeightUnit : '%'}
                          </p>
                          {chartMetric === 'weight' && data.originalUnit !== graphWeightUnit && (
                            <p className="text-[10px] text-[#A1A1A1] font-medium mt-1">
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
                  stroke={chartMetric === 'weight' ? '#00DFA2' : '#A855F7'} 
                  strokeWidth={2}
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
