import React, { useState, useEffect } from "react";

export const Trend = () => {
  const [topic, setTopic] = useState("");
  const [analysis, setAnalysis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalysis = async (searchTopic) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        "https://falcons-algoforge.onrender.com/api/rag",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ topic: searchTopic }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch analysis");
      }
      const data = await response.json();
      setAnalysis(data.json); // Extract the "json" field from the response
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (topic) {
      fetchAnalysis(topic);
    }
  };

  return (
    <div>
      <h1>News Trend Analysis</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter news topic (e.g., business, SAAS)"
        />
        <button type="submit" disabled={loading}>
          {loading ? "Loading..." : "Analyze"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      {analysis.length > 0 && (
        <div>
          <h2>Analysis Results</h2>
          {analysis.map((result, index) => (
            <div
              key={index}
              style={{
                marginBottom: "20px",
                border: "1px solid #ccc",
                padding: "10px",
              }}
            >
              <p>
                <strong>Overall Sentiment:</strong> {result.Overall_Sentiment}
              </p>
              <p>
                <strong>Emotion Detection:</strong> {result.Emotion_Detection}
              </p>
              <p>
                <strong>Polarity Score:</strong> {result.Polarity_Score}
              </p>
              <p>
                <strong>Stock Market Effect:</strong>{" "}
                {result.Stock_Market_Effect}
              </p>
              <p>
                <strong>Search Volume:</strong> {result.Search_Volume}
              </p>
              <p>
                <strong>Revenue/Profit Impact:</strong>{" "}
                {result.Revenue_Profit_Impact}
              </p>
              <p>
                <strong>Recession Signals:</strong> {result.Recession_Signals}
              </p>
              <p>
                <strong>Supply & Demand Gaps:</strong>{" "}
                {result.Supply_Demand_Gaps}
              </p>
              <p>
                <strong>Employment Opportunity:</strong>{" "}
                {result.Employment_Opportunity}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
