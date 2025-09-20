import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source to a local file in the public folder
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export const Rag = () => {
  const [csvFile, setCsvFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCsvChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setCsvFile(selectedFile);
      setMessage('CSV file selected successfully!');
    } else {
      setCsvFile(null);
      setMessage('Please upload a valid CSV file.');
    }
  };

  const handlePdfChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setPdfFile(selectedFile);
      setMessage('PDF file selected successfully!');
    } else {
      setPdfFile(null);
      setMessage('Please upload a valid PDF file.');
    }
  };

  const handleFileUpload = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage('');

    const formData = new FormData();
    if (csvFile) formData.append('csv_file', csvFile);
    if (pdfFile) formData.append('pdf_file', pdfFile);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setMessage('Files uploaded successfully!');
    } else {
        setMessage('Error uploading files. Please try again.');
      }
    } catch (error) {
      setMessage('Error uploading files: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuerySubmit = async (event) => {
    event.preventDefault();
    if (!query.trim()) {
      setMessage('Please enter a query.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (response.ok) {
        const data = await response.json();
        setResponse(data.response || 'No response received.');
        setMessage('Query processed successfully!');
      } else {
        setMessage('Error processing query. Please try again.');
      }
      } catch (error) {
      setMessage('Error processing query: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif', 
      margin: '0 20px',
      background: 'var(--w-c)',
      minHeight: '100vh',
      color: 'var(--b-c)'
    }}>
      <div style={{ maxWidth: '600px', margin: 'auto', padding: '2rem 0' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: '900', 
          textAlign: 'center', 
          marginBottom: '2rem',
          color: 'var(--b-c)'
        }}>
          RAG File Upload and Query
        </h1>

        {/* Flash messages */}
        {message && (
          <p style={{ 
            color: message.includes('Error') ? '#dc3545' : '#28a745',
            textAlign: 'center',
            padding: '1rem',
            borderRadius: '0.5rem',
            backgroundColor: message.includes('Error') ? '#f8d7da' : '#d4edda',
            border: `1px solid ${message.includes('Error') ? '#f5c6cb' : '#c3e6cb'}`,
            marginBottom: '1rem'
          }}>
            {message}
          </p>
        )}

        {/* Upload Section */}
        <div style={{ 
          marginBottom: '3rem',
          background: 'white',
          padding: '2rem',
          borderRadius: '1rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: '700', 
            marginBottom: '1.5rem',
            color: 'var(--b-c)',
            textAlign: 'center'
          }}>
            Upload Files
          </h2>
          <form onSubmit={handleFileUpload} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            flexDirection: 'column', 
            gap: '2em' 
          }}>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'row', 
              alignItems: 'center', 
              gap: '2em', 
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <div style={{ 
                width: '260px', 
                height: '130px', 
                borderRadius: '2rem', 
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)', 
                padding: '1.5rem', 
                background: 'var(--w-c)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                flexDirection: 'column',
                border: '2px solid var(--b-c)',
                transition: 'all ease 0.3s'
              }}>
                <label htmlFor="csv_file" style={{ 
                  fontWeight: '600', 
                  marginBottom: '0.5rem',
                  color: 'var(--b-c)'
                }}>
                  Upload CSV:
                </label>
                <input 
                  type="file" 
                  name="csv_file" 
                  accept=".csv" 
                  onChange={handleCsvChange} 
                  style={{ 
                    marginTop: '10px',
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--b-c)',
                    background: 'white'
                  }} 
                />
              </div>
              <div style={{ 
                width: '260px', 
                height: '130px', 
                borderRadius: '2rem', 
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)', 
                padding: '1.5rem', 
                background: 'var(--w-c)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                flexDirection: 'column',
                border: '2px solid var(--b-c)',
                transition: 'all ease 0.3s'
              }}>
                <label htmlFor="pdf_file" style={{ 
                  fontWeight: '600', 
                  marginBottom: '0.5rem',
                  color: 'var(--b-c)'
                }}>
                  Upload PDF:
                </label>
        <input
          type="file"
                  name="pdf_file" 
                  accept=".pdf" 
                  onChange={handlePdfChange} 
                  style={{ 
                    marginTop: '10px',
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--b-c)',
                    background: 'white'
                  }} 
                />
              </div>
            </div>
            <input 
              type="submit" 
              value="Upload Files" 
              disabled={!csvFile && !pdfFile || isLoading}
              style={{ 
                borderRadius: '2rem', 
                border: '2px solid var(--b-c)', 
                padding: '1em 2em', 
                cursor: (!csvFile && !pdfFile || isLoading) ? 'not-allowed' : 'pointer', 
                transition: 'all ease 0.25s',
                background: (!csvFile && !pdfFile || isLoading) ? '#ccc' : 'var(--w-c)',
                color: 'var(--b-c)',
                fontWeight: '600',
                fontSize: '1rem'
              }}
            />
          </form>
        </div>

        {/* Query Section */}
        <div style={{ 
          marginBottom: '3rem',
          background: 'white',
          padding: '2rem',
          borderRadius: '1rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: '700', 
            marginBottom: '1.5rem',
            color: 'var(--b-c)',
            textAlign: 'center'
          }}>
            Enter Your Query
          </h2>
          <form onSubmit={handleQuerySubmit} style={{ 
            display: 'flex', 
            flexDirection: 'row', 
            alignItems: 'stretch',
            gap: '1rem'
          }}>
            <input 
              type="text" 
              name="query" 
              id="query" 
              placeholder="e.g., What's the sales trend?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ 
                borderRadius: '2rem', 
                border: '2px solid var(--b-c)', 
                padding: '1rem 1.5rem',
                flex: 1,
                fontSize: '1rem',
                background: 'white',
                color: 'var(--b-c)'
              }}
            />
            <input 
              type="submit" 
              value="Submit Query" 
              disabled={isLoading}
              style={{ 
                borderRadius: '2rem', 
                border: '2px solid var(--b-c)', 
                padding: '1em 2em', 
                cursor: isLoading ? 'not-allowed' : 'pointer', 
                transition: 'all ease 0.25s',
                background: isLoading ? '#ccc' : 'var(--w-c)',
                color: 'var(--b-c)',
                fontWeight: '600',
                fontSize: '1rem'
              }}
            />
      </form>
        </div>

        {/* Response Section */}
        {response && (
          <div style={{ 
            marginBottom: '3rem',
            background: 'white',
            padding: '2rem',
            borderRadius: '1rem',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '700', 
              marginBottom: '1rem',
              color: 'var(--b-c)'
            }}>
              Response
            </h2>
            <p style={{ 
              lineHeight: '1.6',
              color: 'var(--b-c)',
              background: 'var(--w-c)',
              padding: '1rem',
              borderRadius: '0.5rem',
              border: '1px solid #ddd'
            }}>
              {response}
            </p>
        </div>
      )}

        {/* EVOLVEX Branding Section */}
        <div style={{ 
          position: 'relative', 
          height: '17rem',
          background: 'white',
          borderRadius: '1rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{ 
            position: 'absolute', 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '2rem', 
            flexDirection: 'column', 
            textAlign: 'center' 
          }}>
            <h1 style={{ 
              margin: 0, 
              fontWeight: 900,
              fontSize: '2rem',
              color: 'var(--b-c)',
              marginBottom: '1rem'
            }}>
              EVOLVEX
            </h1>
            <p style={{ 
              lineHeight: '1.6',
              color: 'var(--b-c)',
              marginBottom: '1rem'
            }}>
              Evolvex AI is a next-gen AI-powered multi-agent system designed to revolutionize software
              development, business intelligence, and creative automation. By integrating advanced AI models, RAG,
              and autonomous agents, we streamline workflows, enhance productivity, and drive innovation.
              Experience the future of AI-driven efficiency with Evolvex AI.
            </p>
            <h5 style={{ 
              color: 'var(--b-c)',
              fontWeight: '600',
              margin: 0
            }}>
              All right reserved - Bit Lords 2025
            </h5>
          </div>
        </div>
        </div>
    </div>
  );
};