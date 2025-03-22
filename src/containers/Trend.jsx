import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, Pie, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from "chart.js";
import {
  TextField,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Box,
  Paper,
} from "@mui/material";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const NEWS_API_KEY = import.meta.env.VITE_NEWS_API_KEY;
const TOGETHER_API_KEY = import.meta.env.VITE_TOGETHER_API_KEY;
const TWELVE_DATA_API_KEY = import.meta.env.VITE_TWELVE_DATA_API_KEY;

// Fallback data in case APIs fail
const FALLBACK_NIFTY_DATA = [
  { datetime: "2025-03-18", close: "100" },
  { datetime: "2025-03-19", close: "101" },
  { datetime: "2025-03-20", close: "99" },
  { datetime: "2025-03-21", close: "102" },
  { datetime: "2025-03-22", close: "101.5" },
];

export const Trend = () => {
  const [analysisData, setAnalysisData] = useState([]);
  const [niftyData, setNiftyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState("business");
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState(null);
  const [jobSaturationData, setJobSaturationData] = useState({});
  const [aiGeneratedTitles, setAiGeneratedTitles] = useState([]);
  const navigate = useNavigate();

  // Improved fetch full content with better error handling and retries
  const fetchFullContent = async (url) => {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 200000); // Reduced timeout

    try {
      const response = await fetch(jinaUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) {
        console.warn(`Failed to fetch content for ${url}: ${response.status}`);
        return "";
      }
      return await response.text();
    } catch (error) {
      console.error("Error fetching content:", error);
      return "";
    }
  };

  // Improved JSON parsing from AI responses
  const parseJsonFromAIResponse = (text) => {
    try {
      // Try to find JSON in code blocks
      const jsonMatch =
        text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
        text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) return null;

      // Clean up the string before parsing
      const jsonStr = (jsonMatch[1] || jsonMatch[0])
        .trim()
        .replace(/^```json/, "")
        .replace(/```$/, "");

      return JSON.parse(jsonStr);
    } catch (error) {
      console.error("Error parsing JSON:", error);
      return null;
    }
  };

  // Improved analysis with retry logic and better error handling
  const analyzeWithTogether = async (content, title) => {
    const prompt = `
      Analyze the following news article content for these factors:
      1. Overall Sentiment (Positive, Negative, Neutral)
      2. Emotion Detection (Fear, Optimism, Uncertainty, Confidence)
      3. Polarity Score (-1 to +1)
      4. Search Volume (Simulated: High, Medium, Low interest)
      5. Revenue/Profit Impact (Increase or decrease)
      6. Recession Signals (Economic slowdowns, layoffs, declining investments)
      7. Supply & Demand Gaps (Shortages, production delays, increased demand)
      8. Employment Opportunity (Potential job creation or reduction)
      9. Sector (e.g., Tech, Finance, Healthcare, Energy, etc.)
      
      Title: ${title}
      Content: ${content.slice(0, 1500)}
      
      Provide the analysis in this exact JSON format:
      {
        "Overall_Sentiment": "value",
        "Emotion_Detection": "value",
        "Polarity_Score": value,
        "Search_Volume": "value",
        "Revenue_Profit_Impact": "value",
        "Recession_Signals": "value",
        "Supply_Demand_Gaps": "value",
        "Employment_Opportunity": "value",
        "Sector": "value"
      }
    `;

    // Default response in case of failure
    const defaultAnalysis = {
      Overall_Sentiment: "Neutral",
      Emotion_Detection: "Uncertainty",
      Polarity_Score: 0,
      Search_Volume: "Medium",
      Revenue_Profit_Impact: "Neutral",
      Recession_Signals: "None detected",
      Supply_Demand_Gaps: "None detected",
      Employment_Opportunity: "Neutral",
      Sector: content.includes("tech")
        ? "Tech"
        : content.includes("finance")
        ? "Finance"
        : content.includes("health")
        ? "Healthcare"
        : "General",
    };

    // Try up to 2 times with different models
    const models = [
      "mistralai/Mixtral-8x7B-Instruct-v0.1",
      "meta-llama/Llama-2-70b-chat-hf",
    ];

    for (const model of models) {
      try {
        const response = await fetch(
          "https://api.together.xyz/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${TOGETHER_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: model,
              messages: [{ role: "user", content: prompt }],
              max_tokens: 800,
              temperature: 0.2, // Lower temperature for more consistent responses
            }),
          }
        );

        if (!response.ok) {
          console.warn(
            `Together AI request failed with model ${model}: ${response.status}`
          );
          continue; // Try next model
        }

        const result = await response.json();
        if (!result.choices || !result.choices[0]) continue;

        const contentText = result.choices[0].message.content;
        const jsonData = parseJsonFromAIResponse(contentText);

        if (jsonData) return jsonData;
      } catch (error) {
        console.error(`Error analyzing with model ${model}:`, error.message);
      }

      // Add delay before trying next model to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Return default analysis if all attempts failed
    return defaultAnalysis;
  };

  // New function to predict job saturation levels
  const predictJobSaturation = async (analyses) => {
    if (!analyses || analyses.length === 0) {
      return {
        Tech: { level: "Medium", score: 50 },
        Finance: { level: "Medium", score: 50 },
        Healthcare: { level: "Medium", score: 50 },
        Energy: { level: "Medium", score: 50 },
        General: { level: "Medium", score: 50 },
      };
    }

    const sectorAnalyses = {};

    // Group analyses by sector
    analyses.forEach((analysis) => {
      const sector = analysis.Sector || "General";
      if (!sectorAnalyses[sector]) {
        sectorAnalyses[sector] = [];
      }
      sectorAnalyses[sector].push(analysis);
    });

    // Calculate job saturation for each sector
    const jobSaturation = {};

    Object.entries(sectorAnalyses).forEach(([sector, sectorData]) => {
      // Variables for job saturation calculation
      let employmentScore = 0;
      let recession = 0;
      let sentiment = 0;
      let supplyDemand = 0;

      sectorData.forEach((item) => {
        // Employment opportunity factor
        if (
          item.Employment_Opportunity.includes("creation") ||
          item.Employment_Opportunity.includes("increase") ||
          item.Employment_Opportunity.includes("growth")
        ) {
          employmentScore -= 10; // Lower saturation
        } else if (
          item.Employment_Opportunity.includes("reduction") ||
          item.Employment_Opportunity.includes("decrease") ||
          item.Employment_Opportunity.includes("layoff")
        ) {
          employmentScore += 15; // Higher saturation
        }

        // Recession signals factor
        if (
          item.Recession_Signals.includes("slowdown") ||
          item.Recession_Signals.includes("layoff") ||
          item.Recession_Signals.includes("declin")
        ) {
          recession += 10; // Higher saturation
        }

        // Sentiment factor
        if (item.Overall_Sentiment === "Positive") {
          sentiment -= 5; // Lower saturation
        } else if (item.Overall_Sentiment === "Negative") {
          sentiment += 5; // Higher saturation
        }

        // Supply & demand factor
        if (
          item.Supply_Demand_Gaps.includes("shortage") ||
          item.Supply_Demand_Gaps.includes("increased demand")
        ) {
          supplyDemand -= 8; // Lower saturation (more jobs needed)
        }
      });

      // Calculate total score (normalize to 0-100 range)
      // Higher score = more saturated job market = fewer opportunities
      const baseValue = 50; // Neutral starting point
      let totalScore =
        baseValue + employmentScore + recession + sentiment + supplyDemand;

      // Keep within bounds
      totalScore = Math.max(0, Math.min(100, totalScore));

      // Determine saturation level
      let level;
      if (totalScore < 30) {
        level = "Low"; // Low saturation = many job opportunities
      } else if (totalScore < 70) {
        level = "Medium";
      } else {
        level = "High"; // High saturation = few job opportunities
      }

      jobSaturation[sector] = {
        level: level,
        score: totalScore,
      };
    });

    return jobSaturation;
  };

  // Simplified title generation with better error handling
  const generateArticleTitle = async (content, originalTitle) => {
    if (!content || content.length < 100) return originalTitle;

    const prompt = `
      Generate a concise, meaningful headline (max 10 words) based on the following article:
      Title: ${originalTitle}
      Content: ${content.slice(0, 1000)}
      Provide ONLY the headline as plain text. No explanations.
    `;

    try {
      const response = await fetch(
        "https://api.together.xyz/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${TOGETHER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 30,
            temperature: 0.5,
          }),
        }
      );

      if (!response.ok) return originalTitle;

      const result = await response.json();
      const generatedTitle = result.choices[0].message.content
        .trim()
        .replace(/^["']|["']$/g, ""); // Remove quotes if present

      return generatedTitle || originalTitle;
    } catch (error) {
      console.error("Error generating title:", error.message);
      return originalTitle;
    }
  };

  // Improved Nifty data fetching with fallback
  const fetchNiftyData = async () => {
    try {
      const url = `https://api.twelvedata.com/time_series?symbol=AAPL&interval=1day&outputsize=5&apikey=${TWELVE_DATA_API_KEY}`;
      const response = await fetch(url);

      if (!response.ok)
        throw new Error(`Twelve Data API request failed: ${response.status}`);

      const data = await response.json();

      if (data.status === "error" || !data.values || data.values.length === 0) {
        throw new Error(
          data.message || "No data returned from Twelve Data API"
        );
      }

      setNiftyData(data.values);
    } catch (error) {
      console.error("Error fetching Nifty data:", error.message);
      setNiftyData(FALLBACK_NIFTY_DATA);
      setError("Using fallback market data due to API limitations.");
    }
  };

  // Completely rewritten news fetching function with better async handling
  const fetchBusinessNews = async (selectedTopic) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch news articles
      const NEWS_API_URL = `https://newsapi.org/v2/everything?q=${selectedTopic}&language=en&apiKey=${NEWS_API_KEY}`;
      const response = await fetch(NEWS_API_URL);

      if (!response.ok)
        throw new Error(`News API request failed: ${response.status}`);

      const newsData = await response.json();
      const articleList = newsData.articles.slice(0, 5);

      // Process articles in parallel with rate limiting
      const processArticle = async (article, index) => {
        await new Promise((resolve) => setTimeout(resolve, index * 1000)); // Stagger requests

        const title = article.title;
        const url = article.url;
        const fullContent = await fetchFullContent(url);
        const analysis = await analyzeWithTogether(fullContent || title, title);
        const aiTitle = await generateArticleTitle(fullContent, title);

        return { article, analysis, aiTitle };
      };

      const processedArticles = await Promise.all(
        articleList.map(processArticle)
      );

      // Extract data from processed articles
      const analyses = [];
      const titles = [];

      processedArticles.forEach(({ article, analysis, aiTitle }) => {
        analyses.push(analysis);
        titles.push(aiTitle);
      });

      // Generate job saturation data based on analyses
      const saturationData = await predictJobSaturation(analyses);

      setArticles(articleList);
      setAnalysisData(analyses);
      setAiGeneratedTitles(titles);
      setJobSaturationData(saturationData);
    } catch (error) {
      console.error("Error fetching news:", error.message);
      setError("Failed to fetch news data. Displaying fallback data.");

      // Set fallback data
      setAnalysisData(
        Array(5).fill({
          Overall_Sentiment: "Neutral",
          Emotion_Detection: "Uncertainty",
          Polarity_Score: 0,
          Search_Volume: "Medium",
          Revenue_Profit_Impact: "Neutral",
          Recession_Signals: "None detected",
          Supply_Demand_Gaps: "None detected",
          Employment_Opportunity: "Neutral",
          Sector: "General",
        })
      );

      setArticles(
        Array(5).fill({
          title: "Placeholder Article",
          url: "#",
          description: "No article data available at this time.",
        })
      );

      setAiGeneratedTitles(Array(5).fill("Market Update"));
      setJobSaturationData({
        Tech: { level: "Medium", score: 50 },
        Finance: { level: "Medium", score: 50 },
        Healthcare: { level: "Low", score: 30 },
        Energy: { level: "High", score: 75 },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTopicSubmit = (e) => {
    e.preventDefault();
    if (topic.trim()) {
      fetchBusinessNews(topic);
      fetchNiftyData();
    } else {
      setError("Please enter a topic to search.");
    }
  };

  useEffect(() => {
    // Initial data fetch
    fetchBusinessNews(topic);
    fetchNiftyData();

    // Set up polling with a longer interval to avoid rate limiting
    const interval = setInterval(() => {
      fetchBusinessNews(topic);
      fetchNiftyData();
    }, 600000); // 10 minutes instead of 5

    return () => clearInterval(interval);
  }, []); // Remove topic dependency to prevent multiple initial fetches

  // Improved chart data preparation
  const prepareSentimentData = () => {
    if (!analysisData.length) {
      return {
        labels: ["No Data"],
        datasets: [
          {
            label: "Sentiment Distribution",
            data: [1],
            backgroundColor: ["#CCCCCC"],
          },
        ],
      };
    }

    const sentimentCounts = analysisData.reduce((acc, item) => {
      const sentiment = item.Overall_Sentiment || "Neutral";
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {});

    return {
      labels: Object.keys(sentimentCounts),
      datasets: [
        {
          label: "Sentiment Distribution",
          data: Object.values(sentimentCounts),
          backgroundColor: [
            "#FF6384", // Negative
            "#36A2EB", // Neutral
            "#FFCE56", // Positive
            "#4BC0C0", // Other
          ],
        },
      ],
    };
  };

  // New function to prepare job saturation data for the bar chart
  const prepareJobSaturationData = () => {
    if (Object.keys(jobSaturationData).length === 0) {
      return {
        labels: ["No Data"],
        datasets: [
          {
            label: "Job Saturation Level",
            data: [0],
            backgroundColor: "#CCCCCC",
          },
        ],
      };
    }

    // Color mapping based on saturation level
    const getBarColor = (score) => {
      if (score < 30) return "#4CAF50"; // Green for low saturation (good job prospects)
      if (score < 70) return "#FFC107"; // Yellow for medium saturation
      return "#F44336"; // Red for high saturation (poor job prospects)
    };

    const sectors = Object.keys(jobSaturationData);
    const scores = sectors.map((sector) => jobSaturationData[sector].score);
    const colors = scores.map(getBarColor);

    return {
      labels: sectors,
      datasets: [
        {
          label: "Job Saturation Level (%)",
          data: scores,
          backgroundColor: colors,
        },
      ],
    };
  };

  const prepareNiftyData = () => {
    if (!niftyData.length) {
      return {
        labels: [
          "Day 1",
          "Day 2",
          "Day 3",
          "Day 4",
          "Day 5",
          "Day 6",
          "Day 7",
          "Day 8",
        ],
        datasets: [
          {
            label: "Market Trend (% Change)",
            data: [0, 0, 0, 0, 0, 0, 0, 0],
            borderColor: "#4CAF50",
            fill: false,
          },
        ],
      };
    }

    const percentChanges = niftyData.map((current, i, arr) => {
      if (i === 0) return 0;
      const prevClose = parseFloat(arr[i - 1].close);
      const currClose = parseFloat(current.close);
      const percentChange = ((currClose - prevClose) / prevClose) * 100;
      return Number(percentChange.toFixed(2));
    });

    return {
      labels: niftyData.map((item) => item.datetime.split(" ")[0]),
      datasets: [
        {
          label: "Market Trend (% Change)",
          data: percentChanges,
          borderColor: "#4CAF50",
          fill: false,
        },
      ],
    };
  };

  // Chart options with fixed y-axis for Nifty chart
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true },
    },
  };

  const jobSaturationChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        min: 0,
        max: 100,
        title: {
          display: true,
          text: "Job Saturation (higher the bad)",
        },
        ticks: {
          stepSize: 20,
        },
      },
    },
  };

  const niftyChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        min: -2.5,
        max: 2.5,
        ticks: {
          stepSize: 0.5,
        },
      },
    },
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress />
        <Typography variant="h6" style={{ marginLeft: "20px" }}>
          Loading market data...
        </Typography>
      </Box>
    );
  }

  return (
    <div
      style={{
        maxWidth: "1250px",
        fontFamily: "Poppins",
      }}
      className="moyai"
    >
      <Typography variant="h4" gutterBottom>
        Business News & Market Trends Dashboard
      </Typography>

      {error && (
        <Paper
          elevation={0}
          style={{
            padding: "10px",
            marginBottom: "15px",
            backgroundColor: "#fff9c4",
          }}
        >
          <Typography color="error">{error}</Typography>
        </Paper>
      )}

      <form className="formsk" onSubmit={handleTopicSubmit} >
        <TextField
          className="tfield"
          label="Enter Topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          variant="outlined"
          size="small"
          style={{ marginRight: "10px" }}
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading}
        >
          Analyze
        </Button>
      </form>

      <div className="row1">
        <div className="pie">
          <div className="pi">
            <Pie
              data={prepareSentimentData()}
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  title: { text: "Sentiment Distribution", display: true },
                },
              }}
            />
          </div>
        </div>
        <div className="bar">
          <div className="ba">
            <Bar
              data={prepareJobSaturationData()}
              options={{
                ...jobSaturationChartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  title: {
                    text: "Job Saturation Level by Sector",
                    display: true,
                  },
                  tooltip: {
                    callbacks: {
                      afterLabel: function (context) {
                        const sector = context.label;
                        const level =
                          jobSaturationData[sector]?.level || "Unknown";
                        return `Saturation: ${level} (${context.raw}%)`;
                      },
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      <div className="row2">
        <div className="nif">
          <div className="ni">
            <Line data={prepareNiftyData()} options={niftyChartOptions} />
          </div>
        </div>
        <div>
          <List>
            {articles.map((article, index) => (
              <ListItem
                key={index}
                onClick={() =>
                  navigate(`/blog/${index}`, {
                    state: { article, analysis: analysisData[index] },
                  })
                }
                sx={{ cursor: "pointer" }}
              >
                <ListItemText
                  primary={
                    <strong>
                      {aiGeneratedTitles[index] ||
                        article.title ||
                        `Article ${index + 1}`}
                    </strong>
                  }
                  secondary={
                    <>
                
                      {analysisData[index]?.Sector !== "Unknown" &&
                        `${analysisData[index]?.Sector}, `}
                      {analysisData[index]?.Employment_Opportunity !== "N/A" &&
                        `${analysisData[index]?.Employment_Opportunity}, `}
                      {analysisData[index]?.Revenue_Profit_Impact !== "N/A" &&
                        `${analysisData[index]?.Revenue_Profit_Impact}, `}
                      {analysisData[index]?.Supply_Demand_Gaps !== "N/A" &&
                        `${analysisData[index]?.Supply_Demand_Gaps}`}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        </div>
      </div>
    </div>
  );
};
