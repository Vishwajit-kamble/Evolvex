// src/components/Blog.jsx
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Typography, CircularProgress, Box, Button, Alert } from "@mui/material";

const TOGETHER_API_KEY = import.meta.env.VITE_TOGETHER_API_KEY || "tgp_v1_ykDLFqDZq-VLfFEBoiILW0JtxeDmXsCATSI_UgK43NM";
const UNSPLASH_API_KEY = import.meta.env.VITE_UNSPLASH_API_KEY;

export const Blog = () => {
  const [blogContent, setBlogContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const location = useLocation();
  const { article, analysis } = location.state || {};

  const generateBlogContent = async (title, analysis) => {
    const prompt = `
      Write a concise, engaging blog post (200-300 words) based on the following news article title and analysis data. 
      
      Requirements:
      - Keep it short and punchy
      - Use bullet points for key insights
      - Include a brief introduction, main points in bullets, and a short conclusion
      - Use a professional yet conversational tone
      - Make it scannable and easy to read
      - Don't repeat analysis values verbatim - interpret them naturally

      Title: ${title}
      Analysis Data: ${JSON.stringify(analysis)}
      
      Format the response with clear sections and bullet points. Provide as plain text without JSON formatting.
    `;

    // Try Together API first
    try {
      console.log("Attempting to generate blog content with Together API...");
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
            max_tokens: 500,
            temperature: 0.7,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Together API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Together API response:", result);
      
      if (result.choices && result.choices[0] && result.choices[0].message) {
        return result.choices[0].message.content;
      } else {
        throw new Error("Invalid response structure from Together AI");
      }
    } catch (togetherError) {
      console.warn("Together API failed, trying Gemini:", togetherError);
      
      // Fallback to Gemini API
      const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!geminiApiKey) {
        console.error("No Gemini API key available for fallback");
        return generateFallbackContent(title, analysis);
      }

      try {
        console.log("Attempting to generate blog content with Gemini API...");
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: prompt
                }]
              }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 500,
              }
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log("Gemini API response:", result);
        
        if (result.candidates && result.candidates[0] && result.candidates[0].content) {
          return result.candidates[0].content.parts[0].text;
        } else {
          throw new Error("Invalid response structure from Gemini API");
        }
      } catch (geminiError) {
        console.error("Gemini API also failed:", geminiError);
        return generateFallbackContent(title, analysis);
      }
    }
  };

  const generateFallbackContent = (title, analysis) => {
    console.log("Generating fallback content...");
    return `
# ${title}

## Quick Take

Market analysis reveals key insights for the ${analysis?.Sector || 'general'} sector. Here's what you need to know:

## Key Findings

• **Market Sentiment**: ${analysis?.Overall_Sentiment || 'Neutral'} outlook - ${analysis?.Overall_Sentiment === 'Positive' ? 'optimistic signals' : analysis?.Overall_Sentiment === 'Negative' ? 'cautious approach needed' : 'balanced conditions'}

• **Revenue Impact**: ${analysis?.Revenue_Profit_Impact || 'Moderate'} effect on profit margins

• **Job Market**: ${analysis?.Employment_Opportunity || 'Stable'} employment opportunities

• **Supply Chain**: ${analysis?.Supply_Demand_Gaps || 'Balanced'} supply and demand dynamics

• **Emotion Detection**: ${analysis?.Emotion_Detection || 'Mixed'} market emotions detected

## Action Items

• Monitor sentiment changes closely
• Optimize operations for efficiency
• Plan strategically for market shifts
• Implement risk management protocols

## Bottom Line

The ${analysis?.Sector || 'market'} shows ${analysis?.Overall_Sentiment?.toLowerCase() || 'stable'} conditions. Stay informed, stay adaptable, and use data-driven insights for decision-making.

*Analysis based on current market data - consult additional sources for comprehensive planning.*
    `;
  };

  const fetchBlogImage = async (title, analysis) => {
    // Create a more relevant search query based on title and analysis
    let searchTerms = [];
    
    // Extract key terms from title
    const titleWords = title.toLowerCase().split(' ').filter(word => 
      word.length > 3 && !['the', 'and', 'for', 'with', 'from', 'this', 'that', 'they', 'have', 'been', 'will', 'were', 'said', 'each', 'which', 'their', 'time', 'would', 'there', 'could', 'other', 'after', 'first', 'well', 'also', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'].includes(word)
    );
    
    // Add analysis-based terms
    if (analysis?.Sector) {
      searchTerms.push(analysis.Sector.toLowerCase());
    }
    if (analysis?.Overall_Sentiment) {
      if (analysis.Overall_Sentiment === 'Positive') {
        searchTerms.push('success', 'growth', 'positive');
      } else if (analysis.Overall_Sentiment === 'Negative') {
        searchTerms.push('challenge', 'market', 'business');
      } else {
        searchTerms.push('analysis', 'data', 'trends');
      }
    }
    
    // Combine title words and analysis terms
    const allTerms = [...titleWords.slice(0, 2), ...searchTerms.slice(0, 2)];
    const query = encodeURIComponent(allTerms.join(' '));
    
    console.log("Searching for image with query:", query);

    // Try Unsplash first if API key is available
    if (UNSPLASH_API_KEY) {
      try {
        const url = `https://api.unsplash.com/search/photos?query=${query}&per_page=5&orientation=landscape&client_id=${UNSPLASH_API_KEY}`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            // Return the first relevant image
            const imageUrl = data.results[0]?.urls?.regular;
            if (imageUrl) {
              console.log("Found relevant image from Unsplash");
              return imageUrl;
            }
          }
        }
      } catch (error) {
        console.warn("Unsplash API failed:", error);
      }
    }

    // Fallback to category-based images
    return getCategoryBasedImage(analysis);
  };

  const getCategoryBasedImage = (analysis) => {
    const categoryImages = {
      'tech': 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=400&fit=crop&auto=format',
      'finance': 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=400&fit=crop&auto=format',
      'healthcare': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&h=400&fit=crop&auto=format',
      'energy': 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&h=400&fit=crop&auto=format',
      'business': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop&auto=format',
      'positive': 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=400&fit=crop&auto=format',
      'negative': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop&auto=format',
      'default': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop&auto=format'
    };

    const sector = analysis?.Sector?.toLowerCase() || 'default';
    const sentiment = analysis?.Overall_Sentiment?.toLowerCase() || 'default';
    
    // Try to match by sentiment first
    if (sentiment === 'positive' && categoryImages.positive) {
      console.log(`Using sentiment-based image for: ${sentiment}`);
      return categoryImages.positive;
    } else if (sentiment === 'negative' && categoryImages.negative) {
      console.log(`Using sentiment-based image for: ${sentiment}`);
      return categoryImages.negative;
    }
    
    // Then try to match by sector
    for (const [category, imageUrl] of Object.entries(categoryImages)) {
      if (sector.includes(category) && category !== 'default') {
        console.log(`Using sector-based image for: ${category}`);
        return imageUrl;
      }
    }
    
    // Final fallback
    console.log(`Using default image`);
    return categoryImages.default;
  };

  const formatBlogContent = (content) => {
    if (!content) return null;
    
    // Split content into lines
    const lines = content.split('\n');
    const elements = [];
    let currentList = [];
    let listType = null;
    
    const flushList = () => {
      if (currentList.length > 0) {
        const ListComponent = listType === 'ul' ? 'ul' : 'ol';
        elements.push(
          <ListComponent key={`list-${elements.length}`}>
            {currentList.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ListComponent>
        );
        currentList = [];
        listType = null;
      }
    };
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        flushList();
        return;
      }
      
      // Handle headers
      if (trimmedLine.startsWith('# ')) {
        flushList();
        elements.push(
          <h1 key={index}>{trimmedLine.substring(2)}</h1>
        );
      } else if (trimmedLine.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={index}>{trimmedLine.substring(3)}</h2>
        );
      } else if (trimmedLine.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={index}>{trimmedLine.substring(4)}</h3>
        );
      }
      // Handle bullet points
      else if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
        if (listType !== 'ul') {
          flushList();
          listType = 'ul';
        }
        currentList.push(trimmedLine.substring(2));
      }
      // Handle numbered lists
      else if (/^\d+\.\s/.test(trimmedLine)) {
        if (listType !== 'ol') {
          flushList();
          listType = 'ol';
        }
        currentList.push(trimmedLine.replace(/^\d+\.\s/, ''));
      }
      // Handle regular paragraphs
      else {
        flushList();
        // Process inline formatting
        let processedLine = trimmedLine;
        
        // Handle bold text
        processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Handle italic text
        processedLine = processedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        elements.push(
          <p 
            key={index} 
            dangerouslySetInnerHTML={{ __html: processedLine }}
          />
        );
      }
    });
    
    // Flush any remaining list
    flushList();
    
    return elements;
  };

  const retryGeneration = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    setLoading(true);
    fetchBlogData();
  };

  const fetchBlogData = async () => {
    if (!article || !analysis) {
      console.warn("No article or analysis data available");
      setBlogContent("No article data available. Please go back and select an article to view its blog post.");
      setImageUrl("https://picsum.photos/512");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log("Starting blog content generation...");
        const [content, image] = await Promise.all([
          generateBlogContent(article.title, analysis),
          fetchBlogImage(article.title, analysis)
        ]);
      
      setBlogContent(content);
      setImageUrl(image);
      console.log("Blog content generated successfully");
    } catch (error) {
      console.error("Error in fetchBlogData:", error);
      setError("An error occurred while generating the blog content. Please try again.");
      setBlogContent("Failed to generate blog content. Please try again later.");
      setImageUrl("https://picsum.photos/512");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogData();
  }, [article, analysis, retryCount]);

  if (loading) {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        alignItems="center" 
        justifyContent="center" 
        mt={5}
        p={3}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" mt={2} textAlign="center">
          Generating Blog Content...
        </Typography>
        <Typography variant="body2" mt={1} textAlign="center" color="text.secondary">
          This may take a few moments while we create your personalized blog post.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        padding: "2rem",
        maxWidth: "900px",
        margin: "0 auto",
        fontFamily: "Arial, sans-serif",
        background: "var(--w-c)",
        minHeight: "100vh",
        color: "var(--b-c)"
      }}
    >
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={retryGeneration}
              disabled={loading}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      
      <Box
        sx={{
          background: "white",
          padding: "2rem",
          borderRadius: "1rem",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          marginBottom: "2rem"
        }}
      >
        <Typography 
          variant="h3" 
          sx={{
            fontSize: "2.5rem",
            fontWeight: "700",
            color: "var(--b-c)",
            marginBottom: "1.5rem",
            lineHeight: 1.2
          }}
        >
          {article?.title || "Blog Post"}
        </Typography>
        
        <Box mb={3}>
          <img
            src={imageUrl}
            alt={article?.title || "Blog Image"}
            style={{ 
              maxWidth: "100%", 
              height: "auto", 
              borderRadius: "12px",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
              minHeight: "200px",
              objectFit: "cover"
            }}
            onError={(e) => {
              console.warn("Image failed to load, using fallback");
              e.target.src = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop&auto=format";
            }}
            onLoad={() => {
              console.log("Image loaded successfully");
            }}
          />
          <Typography 
            variant="caption" 
            display="block" 
            mt={1}
            sx={{ 
              color: "text.secondary",
              fontSize: "0.875rem"
            }}
          >
            {article?.title ? `Relevant image for: ${article.title}` : 'Featured image'}
          </Typography>
        </Box>
      </Box>
      <Box
        sx={{
          background: "white",
          padding: "2rem",
          borderRadius: "1rem",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          '& h1': {
            fontSize: '2rem',
            fontWeight: 'bold',
            color: 'var(--b-c)',
            marginBottom: '1rem',
            borderBottom: '2px solid var(--b-c)',
            paddingBottom: '0.5rem'
          },
          '& h2': {
            fontSize: '1.5rem',
            fontWeight: '600',
            color: 'var(--b-c)',
            marginTop: '1.5rem',
            marginBottom: '1rem',
            borderLeft: '4px solid var(--b-c)',
            paddingLeft: '1rem'
          },
          '& h3': {
            fontSize: '1.25rem',
            fontWeight: '600',
            color: 'var(--b-c)',
            marginTop: '1rem',
            marginBottom: '0.5rem'
          },
          '& p': {
            fontSize: '1.1rem',
            lineHeight: 1.7,
            color: 'var(--b-c)',
            marginBottom: '1.5rem',
            textAlign: 'justify'
          },
          '& ul': {
            marginLeft: '1.5rem',
            marginBottom: '1.5rem',
            paddingLeft: '1rem'
          },
          '& li': {
            fontSize: '1.1rem',
            lineHeight: 1.7,
            color: 'var(--b-c)',
            marginBottom: '0.75rem',
            '&::marker': {
              color: 'var(--b-c)',
              fontSize: '1.2rem'
            }
          },
          '& strong': {
            fontWeight: '600',
            color: 'var(--b-c)',
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            padding: '0.1rem 0.3rem',
            borderRadius: '0.25rem'
          },
          '& em': {
            fontStyle: 'italic',
            color: 'var(--b-c)'
          }
        }}
      >
        {formatBlogContent(blogContent)}
      </Box>
    </Box>
  );
};
