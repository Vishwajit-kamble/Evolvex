import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Box, Typography } from '@mui/material';

const testContent = `# Test Markdown

## This is a test

This is **bold** and *italic* text.

### List
- Item 1
- Item 2
- Item 3

### Code
\`\`\`javascript
const test = "Hello World";
console.log(test);
\`\`\`

> This is a blockquote

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |
`;

export const MarkdownTest = () => {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        React Markdown Test
      </Typography>
      <Box sx={{ 
        border: '1px solid #ccc', 
        p: 2, 
        borderRadius: 1,
        backgroundColor: '#f9f9f9'
      }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
        >
          {testContent}
        </ReactMarkdown>
      </Box>
    </Box>
  );
};
