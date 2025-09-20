@echo off
echo Starting RAG Backend...
cd saasa
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)
echo Installing requirements...
venv\Scripts\pip install -r requirements.txt
echo Starting Flask backend...
echo Backend will be available at: http://localhost:5000
echo Press Ctrl+C to stop the server
venv\Scripts\python app.py
pause
