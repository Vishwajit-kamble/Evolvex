// src/components/Trend.jsx
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

export const Trend = () => {
  const [analysisData, setAnalysisData] = useState([]);
  const [niftyData, setNiftyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState("business");
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchFullContent = async (url) => {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);

    try {
      const response = await fetch(jinaUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error("Failed to fetch content");
      return await response.text();
    } catch (error) {
      console.error("Error fetching content:", error);
      return "Failed to fetch content";
    }
  };

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
      
      Title: ${title}
      Content: ${content.slice(0, 2000)}
      Provide the analysis in JSON format:
      {
        "Overall_Sentiment": "value",
        "Emotion_Detection": "value",
        "Polarity_Score": value,
        "Search_Volume": "value",
        "Revenue_Profit_Impact": "value",
        "Recession_Signals": "value",
        "Supply_Demand_Gaps": "value",
        "Employment_Opportunity": "value"
      }
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
            max_tokens: 1000,
            temperature: 0.7,
          }),
        }
      );

      const result = await response.json();
      if (!result.choices || !result.choices[0]) {
        throw new Error("Invalid response from Together AI");
      }
      const contentText = result.choices[0].message.content;
      const jsonMatch =
        contentText.match(/```json\s*([\s\S]*?)\s*```/) ||
        contentText.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch (error) {
      console.error("Error analyzing with Together AI:", error);
      return {
        Overall_Sentiment: "N/A",
        Emotion_Detection: "N/A",
        Polarity_Score: 0,
        Search_Volume: "N/A",
        Revenue_Profit_Impact: "N/A",
        Recession_Signals: "N/A",
        Supply_Demand_Gaps: "N/A",
        Employment_Opportunity: "N/A",
      };
    }
  };

  const fetchNiftyData = async () => {
    const url = `https://api.twelvedata.com/time_series?symbol=NIFTY&interval=1day&outputsize=5&apikey=${TWELVE_DATA_API_KEY}`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Twelve Data API request failed");
      const data = await response.json();
      setNiftyData(data.values || []);
    } catch (error) {
      console.error("Error fetching Nifty data:", error);
      setNiftyData([]);
      setError("Failed to fetch Nifty data. Please try again later.");
    }
  };

  const fetchBusinessNews = async (selectedTopic) => {
    setLoading(true);
    setError(null);
    const NEWS_API_URL = `https://newsapi.org/v2/everything?q=${selectedTopic}&language=en&apiKey=${NEWS_API_KEY}`;
    try {
      const response = await fetch(NEWS_API_URL);
      if (!response.ok) throw new Error("News API request failed");
      const newsData = await response.json();

      const analysisList = [];
      const articleList = newsData.articles.slice(0, 5);
      for (const article of articleList) {
        const title = article.title;
        const url = article.url;
        const fullContent = await fetchFullContent(url);
        const analysis = fullContent.includes("Failed to fetch")
          ? await analyzeWithTogether("", title)
          : await analyzeWithTogether(fullContent, title);
        analysisList.push(analysis);
      }
      setArticles(articleList);
      setAnalysisData(analysisList);
    } catch (error) {
      console.error("Error fetching news:", error);
      setError("Failed to fetch news data. Displaying fallback data.");
      setAnalysisData([
        {
          Overall_Sentiment: "N/A",
          Emotion_Detection: "N/A",
          Polarity_Score: 0,
          Search_Volume: "N/A",
          Revenue_Profit_Impact: "N/A",
          Recession_Signals: "N/A",
          Supply_Demand_Gaps: "N/A",
          Employment_Opportunity: "N/A",
        },
      ]);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTopicSubmit = (e) => {
    e.preventDefault();
    fetchBusinessNews(topic);
    fetchNiftyData();
  };

  useEffect(() => {
    fetchBusinessNews(topic);
    fetchNiftyData();
    const interval = setInterval(() => {
      fetchBusinessNews(topic);
      fetchNiftyData();
    }, 300000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;

  const sentimentCounts = analysisData.length
    ? analysisData.reduce((acc, item) => {
        acc[item.Overall_Sentiment] = (acc[item.Overall_Sentiment] || 0) + 1;
        return acc;
      }, {})
    : { "N/A": 1 };

  const polarityScores = analysisData.length
    ? analysisData.map((item) => item.Polarity_Score)
    : [0];

  const niftyEffectData = niftyData.length
    ? niftyData.map((current, i, arr) => {
        if (i === 0) return 0;
        const prevClose = parseFloat(arr[i - 1].close);
        const currClose = parseFloat(current.close);
        return currClose > prevClose ? 1 : currClose < prevClose ? -1 : 0;
      })
    : [0, 0, 0, 0, 0];

  const pieData = {
    labels: Object.keys(sentimentCounts),
    datasets: [
      {
        label: "Sentiment Distribution",
        data: Object.values(sentimentCounts),
        backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56"],
      },
    ],
  };

  const barData = {
    labels: analysisData.length
      ? analysisData.map((_, i) => `Article ${i + 1}`)
      : ["No Data"],
    datasets: [
      {
        label: "Polarity Score",
        data: polarityScores,
        backgroundColor: "#42A5F5",
      },
    ],
  };

  const lineData = {
    labels: niftyData.length
      ? niftyData.map((item) => item.datetime.split(" ")[0])
      : ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"],
    datasets: [
      {
        label: "Nifty Effect (Rise/Fall)",
        data: niftyEffectData,
        borderColor: "#4CAF50",
        fill: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { position: "top" }, title: { display: true } },
  };

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "1200px",
        margin: "0 auto",
        fontFamily: "Poppins",
      }}
    >
      <Typography variant="h4" gutterBottom>
        Business News & Nifty Trends Dashboard
      </Typography>
      <form onSubmit={handleTopicSubmit} style={{ marginBottom: "20px" }}>
        <TextField
          label="Enter Topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          variant="outlined"
          size="small"
          style={{ marginRight: "10px" }}
        />
        <Button type="submit" variant="contained" color="primary">
          Analyze
        </Button>
      </form>
      <div style={{ marginBottom: "40px" }}>
        <Typography variant="h6">Sentiment Distribution</Typography>
        <Pie
          data={pieData}
          options={{
            ...chartOptions,
            plugins: {
              ...chartOptions.plugins,
              title: { text: "Sentiment Distribution" },
            },
          }}
        />
      </div>
      <div style={{ marginBottom: "40px" }}>
        <Typography variant="h6">Polarity Scores Across Articles</Typography>
        <Bar
          data={barData}
          options={{
            ...chartOptions,
            plugins: {
              ...chartOptions.plugins,
              title: { text: "Polarity Scores" },
            },
          }}
        />
      </div>
      <div style={{ marginBottom: "40px" }}>
        <Typography variant="h6">Nifty Effect Trend (Last 5 Days)</Typography>
        <Line
          data={lineData}
          options={{
            ...chartOptions,
            plugins: {
              ...chartOptions.plugins,
              title: { text: "Nifty Effect" },
            },
          }}
        />
      </div>
      <div>
        <Typography variant="h6">Opportunities & Insights</Typography>
        <List>
          {analysisData.map((item, index) => (
            <ListItem
              key={index}
              button={true} // Explicitly set button prop
              onClick={() =>
                navigate(`/blog/${index}`, {
                  state: { article: articles[index], analysis: item },
                })
              }
            >
              <ListItemText
                primary={
                  <strong>
                    {articles[index]?.title || `Article ${index + 1}`}
                  </strong>
                }
                secondary={
                  <>
                    {item.Employment_Opportunity !== "N/A" &&
                      `Employment: ${item.Employment_Opportunity}, `}
                    {item.Revenue_Profit_Impact !== "N/A" &&
                      `Profit Impact: ${item.Revenue_Profit_Impact}, `}
                    {item.Supply_Demand_Gaps !== "N/A" &&
                      `Supply/Demand: ${item.Supply_Demand_Gaps}`}
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      </div>
    </div>
  );
};
