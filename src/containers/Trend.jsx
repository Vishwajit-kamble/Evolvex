import React, { useState, useEffect } from "react";
import axios from "axios";
import AnalysisChart from "./AnalysisChart"; // Import the new component

export const Trend = () => {
  const [topic, setTopic] = useState("business");
  const [analysisResult, setAnalysisResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const ENVIRONMENT = import.meta.env.REACT_APP_ENVIRONMENT || "production";
  const API_URL =
    ENVIRONMENT === "production"
      ? "https://your-backend-api.com/api/rag"
      : "http://localhost:5000/api/rag";

  const fetchBusinessNews = async (topic) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(API_URL, { params: { topic } });
      if (response.data.json) {
        setAnalysisResult(response.data.json);
      } else {
        throw new Error("No analysis data received");
      }
    } catch (err) {
      setError(`Failed to fetch news analysis: ${err.message}`);
      setAnalysisResult([
        {
          Overall_Sentiment: "N/A",
          Emotion_Detection: "N/A",
          Polarity_Score: 0,
          Stock_Market_Effect: "N/A",
          Search_Volume: "N/A",
          Revenue_Profit_Impact: "N/A",
          Recession_Signals: "N/A",
          Supply_Demand_Gaps: "N/A",
          Employment_Opportunity: "N/A",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinessNews(topic);
  }, [topic]);

  const handleTopicChange = (e) => {
    setTopic(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchBusinessNews(topic);
  };

  return (
    <div className="trend-component">
      <h1>Business News Trends</h1>

      <form onSubmit={handleSubmit}>
        <label htmlFor="topic">Topic: </label>
        <input
          type="text"
          id="topic"
          value={topic}
          onChange={handleTopicChange}
          placeholder="Enter topic (e.g., business)"
        />
        <button type="submit" disabled={loading}>
          {loading ? "Fetching..." : "Analyze"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Replace the old list with the chart */}
      <AnalysisChart analysisResult={analysisResult} />

      <style jsx>{`
        .trend-component {
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        form {
          margin-bottom: 20px;
        }
        input {
          padding: 5px;
          margin-right: 10px;
        }
        button {
          padding: 5px 10px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
        }
        button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};
