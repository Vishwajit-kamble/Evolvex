import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Typography, CircularProgress, Box, Button, Alert } from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

export const BlogDebug = () => {
  const [blogContent, setBlogContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const location = useLocation();
  const { article, analysis } = location.state || {};

  const testMarkdown = `# Test Blog Post

## Introduction
This is a **test** blog post to verify React Markdown is working.

### Key Points
- Point 1: This is important
- Point 2: This is also important
- Point 3: Final point

## Code Example
\`\`\`javascript
const example = "React Markdown test";
console.log(example);
\`\`\`

## Conclusion
This should render properly with React Markdown!`;

  const formatBlogContent = (content) => {
    if (!content) {
      console.log("No content to format");
      return (
        <Typography variant="body1" color="text.secondary">
          No content available. Please try generating the blog again.
        </Typography>
      );
    }
    
    console.log("Formatting blog content:", content);
    
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ children }) => (
            <Typography 
              variant="h4" 
              component="h1" 
              sx={{ 
                fontSize: '2rem',
                fontWeight: 'bold',
                color: 'var(--b-c)',
                marginBottom: '1rem',
                borderBottom: '2px solid var(--b-c)',
                paddingBottom: '0.5rem'
              }}
            >
              {children}
            </Typography>
          ),
          h2: ({ children }) => (
            <Typography 
              variant="h5" 
              component="h2" 
              sx={{ 
                fontSize: '1.5rem',
                fontWeight: '600',
                color: 'var(--b-c)',
                marginTop: '1.5rem',
                marginBottom: '1rem',
                borderLeft: '4px solid var(--b-c)',
                paddingLeft: '1rem'
              }}
            >
              {children}
            </Typography>
          ),
          p: ({ children }) => (
            <Typography 
              component="p" 
              sx={{ 
                fontSize: '1.1rem',
                lineHeight: 1.7,
                color: 'var(--b-c)',
                marginBottom: '1.5rem',
                textAlign: 'justify'
              }}
            >
              {children}
            </Typography>
          ),
          ul: ({ children }) => (
            <Box 
              component="ul" 
              sx={{ 
                marginLeft: '1.5rem',
                marginBottom: '1.5rem',
                paddingLeft: '1rem'
              }}
            >
              {children}
            </Box>
          ),
          li: ({ children }) => (
            <Typography 
              component="li" 
              sx={{ 
                fontSize: '1.1rem',
                lineHeight: 1.7,
                color: 'var(--b-c)',
                marginBottom: '0.75rem'
              }}
            >
              {children}
            </Typography>
          ),
          strong: ({ children }) => (
            <Box 
              component="strong" 
              sx={{ 
                fontWeight: '600',
                color: 'var(--b-c)',
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                padding: '0.1rem 0.3rem',
                borderRadius: '0.25rem'
              }}
            >
              {children}
            </Box>
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            return isInline ? (
              <Box 
                component="code" 
                sx={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  padding: '0.2rem 0.4rem',
                  borderRadius: '0.25rem',
                  fontFamily: 'monospace',
                  fontSize: '0.9em'
                }}
              >
                {children}
              </Box>
            ) : (
              <Box 
                component="pre" 
                sx={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.05)',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  overflow: 'auto',
                  marginBottom: '1rem'
                }}
              >
                <Box 
                  component="code" 
                  className={className}
                  sx={{ 
                    fontFamily: 'monospace',
                    fontSize: '0.9rem'
                  }}
                >
                  {children}
                </Box>
              </Box>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

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
      <Typography variant="h3" gutterBottom>
        Blog Debug Component
      </Typography>
      
      <Box mb={3}>
        <Button 
          variant="contained" 
          onClick={() => setBlogContent(testMarkdown)}
          sx={{ mr: 2 }}
        >
          Load Test Markdown
        </Button>
        <Button 
          variant="outlined" 
          onClick={() => setBlogContent("")}
        >
          Clear Content
        </Button>
      </Box>

      <Box
        sx={{
          background: "white",
          padding: "2rem",
          borderRadius: "1rem",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
        }}
      >
        {blogContent ? formatBlogContent(blogContent) : (
          <Typography variant="body1" color="text.secondary">
            Click "Load Test Markdown" to test React Markdown rendering.
          </Typography>
        )}
      </Box>
    </Box>
  );
};
