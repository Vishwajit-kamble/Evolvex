import React, { useState } from "react";
import { Typography, Box, Button } from "@mui/material";
import ReactMarkdown from "react-markdown";

export const BlogSimple = () => {
  const [content, setContent] = useState("");

  const testContent = `# Test Blog Post

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

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom>
        Simple Blog Test
      </Typography>
      
      <Box mb={3}>
        <Button 
          variant="contained" 
          onClick={() => setContent(testContent)}
          sx={{ mr: 2 }}
        >
          Load Test Content
        </Button>
        <Button 
          variant="outlined" 
          onClick={() => setContent("")}
        >
          Clear
        </Button>
      </Box>

      <Box sx={{ 
        border: '1px solid #ddd', 
        p: 2, 
        borderRadius: 1,
        backgroundColor: 'white'
      }}>
        {content ? (
          <ReactMarkdown>{content}</ReactMarkdown>
        ) : (
          <Typography color="text.secondary">
            Click "Load Test Content" to test React Markdown
          </Typography>
        )}
      </Box>
    </Box>
  );
};
