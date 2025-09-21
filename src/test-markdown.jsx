import React from 'react';
import ReactMarkdown from 'react-markdown';

const TestMarkdown = () => {
  const content = `# Hello World

This is **bold** and *italic* text.

- Item 1
- Item 2
- Item 3

\`\`\`javascript
const test = "Hello";
\`\`\`
`;

  return (
    <div style={{ padding: '20px' }}>
      <h2>React Markdown Test</h2>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
};

export default TestMarkdown;
