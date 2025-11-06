'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface WeeklyDataPoint {
  weekLabel: string;
  weekEndDate: string;
  neverUsedCount: number;
  totalBooks: number;
  percentage: number;
}

interface NeverUsedChartProps {
  data: WeeklyDataPoint[];
  loading?: boolean;
}

export default function NeverUsedChart({ data, loading }: NeverUsedChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Never Used Books Over Time</h2>
        <div className="h-64 flex items-center justify-center text-gray-500">
          Loading chart data...
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Never Used Books Over Time</h2>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h2 className="text-xl font-bold mb-4 text-gray-900">Never Used Books Over Time</h2>
      <div className="text-sm text-gray-600 mb-4">
        Percentage of books that have never been read or checked out, tracked weekly
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="weekLabel"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '8px 12px'
            }}
            formatter={(value: number, name: string, props: any) => {
              if (name === 'percentage') {
                return [
                  <>
                    <div><strong>{value}%</strong> never used</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {props.payload.neverUsedCount} of {props.payload.totalBooks} books
                    </div>
                  </>,
                  ''
                ];
              }
              return [value, name];
            }}
            labelStyle={{ color: '#111827', fontWeight: 'bold' }}
          />
          <Bar dataKey="percentage" fill="#f97316" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
