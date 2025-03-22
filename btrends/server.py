import requests
from time import sleep
from together import Together
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import csv
from io import StringIO
from dotenv import load_dotenv
import os

# Load environment variables from .env file in the same folder
load_dotenv()

app = Flask(__name__)

# Retrieve environment variables
ENVIRONMENT = os.getenv("ENVIRONMENT", "production")  # Default to production if not set
NEWS_API_KEY = os.getenv("NEWS_API_KEY")
TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY")

# CORS configuration
# Always allow localhost:5173/evolvex-business-agentic-ai, and conditionally add production origin
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:5173/evolvex-code-agentic-ai",
            "http://localhost:5173",
            "https://evolvexai.vercel.app"
        ]
    }
})

def fetch_full_content(url, max_retries=3, initial_timeout=40):
    """Use Jina Reader to fetch full content from a URL with retries."""
    jina_url = f"https://r.jina.ai/{url}"
    for attempt in range(max_retries):
        try:
            response = requests.get(jina_url, timeout=initial_timeout + attempt * 20)
            response.raise_for_status()
            return response.text
        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                sleep(5)
            else:
                return f"Failed to fetch content after {max_retries} attempts: {str(e)}"

def analyze_with_together(content, title):
    """Send content to Together AI for analysis using SDK."""
    if not TOGETHER_API_KEY:
        raise ValueError("TOGETHER_API_KEY is not set in environment variables")
    
    client = Together(api_key=TOGETHER_API_KEY)
    
    prompt = f"""
    Analyze the following news article content for these factors:
    1. Overall Sentiment (Positive, Negative, Neutral)
    2. Emotion Detection (Fear, Optimism, Uncertainty, Confidence)
    3. Polarity Score (-1 to +1, how extreme the sentiment is)
    4. Stock Market Effect (Likely rise or fall in stock prices)
    5. Search Volume (Simulated: High, Medium, Low interest)
    6. Revenue/Profit Impact (Increase or decrease in business profits)
    7. Recession Signals (Economic slowdowns, layoffs, declining investments)
    8. Supply & Demand Gaps (Shortages, production delays, increased demand)
    9. Employment Opportunity (Potential job creation or reduction)
    
    Title: {title}
    Content: {content[:2000]}
    Provide the analysis in a structured JSON format like this:
    {{
        "Overall_Sentiment": "value",
        "Emotion_Detection": "value",
        "Polarity_Score": value,
        "Stock_Market_Effect": "value",
        "Search_Volume": "value",
        "Revenue_Profit_Impact": "value",
        "Recession_Signals": "value",
        "Supply_Demand_Gaps": "value",
        "Employment_Opportunity": "value"
    }}
    """
    
    try:
        response = client.chat.completions.create(
            model="meta-llama/Llama-3.3-70B-Instruct-Turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.7
        )
        result = response.choices[0].message.content
        json_match = re.search(r'```json\s*([\s\S]*?)\s*```', result)
        if json_match:
            json_str = json_match.group(1)
        else:
            json_str = re.search(r'\{[\s\S]*\}', result).group(0)
        analysis = json.loads(json_str)
        return analysis
    except Exception as e:
        return {
            "Overall_Sentiment": "N/A",
            "Emotion_Detection": "N/A",
            "Polarity_Score": 0,
            "Stock_Market_Effect": "N/A",
            "Search_Volume": "N/A",
            "Revenue_Profit_Impact": "N/A",
            "Recession_Signals": "N/A",
            "Supply_Demand_Gaps": "N/A",
            "Employment_Opportunity": "N/A"
        }

def fetch_business_news(topic):
    """Fetch and analyze news articles, returning a list of analysis dictionaries."""
    if not NEWS_API_KEY:
        raise ValueError("NEWS_API_KEY is not set in environment variables")
    
    NEWS_API_URL = f"https://newsapi.org/v2/everything?q={topic}&language=en&apiKey={NEWS_API_KEY}"
    try:
        response = requests.get(NEWS_API_URL, timeout=10)
        response.raise_for_status()
        news_data = response.json()
        
        if news_data.get("status") != "ok":
            raise ValueError(f"NewsAPI error: {news_data.get('message', 'Unknown error')}")
        
        analysis_list = []
        for article in news_data["articles"][:5]:
            title = article["title"]
            url = article["url"]
            full_content = fetch_full_content(url)
            analysis = analyze_with_together(full_content, title) if "Failed to fetch" not in full_content else analyze_with_together("", title)
            analysis_list.append(analysis)
        return analysis_list
        
    except Exception as e:
        return [{
            "Overall_Sentiment": "N/A",
            "Emotion_Detection": "N/A",
            "Polarity_Score": 0,
            "Stock_Market_Effect": "N/A",
            "Search_Volume": "N/A",
            "Revenue_Profit_Impact": "N/A",
            "Recession_Signals": "N/A",
            "Supply_Demand_Gaps": "N/A",
            "Employment_Opportunity": "N/A"
        }]

@app.route('/api/rag', methods=['POST', 'GET'])
def get_news_analysis():
    if request.method == 'POST':
        data = request.get_json()
        topic = data.get('topic', '')
    else:  # GET
        topic = request.args.get('topic', '')
    
    if not topic:
        return jsonify({"error": "Topic is required"}), 400
    
    analysis_result = fetch_business_news(topic)
    
    # Convert to CSV
    csv_buffer = StringIO()
    fieldnames = analysis_result[0].keys()
    writer = csv.DictWriter(csv_buffer, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(analysis_result)
    csv_data = csv_buffer.getvalue()
    csv_buffer.close()
    
    return jsonify({
        "json": analysis_result,
        "csv": csv_data
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=ENVIRONMENT != "production")