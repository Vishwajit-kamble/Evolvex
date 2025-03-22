import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const AnalysisChart = ({ analysisResult }) => {
  // Prepare data for Recharts
  const chartData = analysisResult.map((analysis, index) => ({
    name: `Article ${index + 1}`,
    Polarity_Score: analysis.Polarity_Score,
    // You can add more metrics here if desired, e.g.:
    // Sentiment: analysis.Overall_Sentiment === 'Positive' ? 1 : analysis.Overall_Sentiment === 'Negative' ? -1 : 0,
  }));

  return (
    <div className="analysis-results">
      {analysisResult.length > 0 ? (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[-1, 1]} />{" "}
            {/* Polarity Score ranges from -1 to 1 */}
            <Tooltip />
            <Legend />
            <Bar dataKey="Polarity_Score" fill="#8884d8" />
            {/* Add more Bars for additional metrics if needed */}
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p>No analysis data available.</p>
      )}
      <style jsx>{`
        .analysis-results {
          padding: 20px;
          font-family: Arial, sans-serif;
        }
      `}</style>
    </div>
  );
};

export default AnalysisChart;
