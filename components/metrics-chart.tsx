"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MetricsChartProps {
  data: Array<{
    timestamp: string;
    cls: number;
    lcp: number;
    inp: number;
  }>;
  selectedMetric: "cls" | "lcp" | "inp";
  getMetricStatus: (value: number, type: "cls" | "lcp" | "inp") => "good" | "needs-improvement" | "poor" | "unknown";
}

interface CustomizedDotProps {
  cx: number;
  cy: number;
  payload: {
    [key: string]: number | string;
  };
  dataKey: string;
}

export function MetricsChart({ data, selectedMetric, getMetricStatus }: MetricsChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    timestamp: new Date(item.timestamp).toLocaleDateString('tr-TR'),
  }));

  const getStrokeColor = (value: number) => {
    const status = getMetricStatus(value, selectedMetric);
    switch (status) {
      case "good":
        return "#22c55e";
      case "needs-improvement":
        return "#eab308";
      case "poor":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const CustomizedDot = ({ cx, cy, payload, dataKey }: CustomizedDotProps) => {
    const value = payload[dataKey];
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={getStrokeColor(value as number)}
        stroke="white"
        strokeWidth={2}
      />
    );
  };

  const renderMetricLine = () => {
    return (
      <Line
        type="monotone"
        dataKey={selectedMetric}
        stroke="#6b7280"
        dot={(props) => {
          const { key, ...rest } = props;
          return <CustomizedDot key={key} {...rest} dataKey={selectedMetric} />;
        }}
        name={selectedMetric.toUpperCase()}
      />
    );
  };

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formattedData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" />
          <YAxis />
          <Tooltip />
          <Legend />
          {renderMetricLine()}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 