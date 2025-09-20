#!/usr/bin/env python3
"""
Script to start the Flask backend for the RAG tool
"""
import os
import sys
import subprocess

def main():
    # Change to the saasa directory
    os.chdir('saasa')
    
    # Check if virtual environment exists
    if not os.path.exists('venv'):
        print("Creating virtual environment...")
        subprocess.run([sys.executable, '-m', 'venv', 'venv'], check=True)
    
    # Activate virtual environment and install requirements
    if os.name == 'nt':  # Windows
        activate_script = 'venv\\Scripts\\activate'
        pip_path = 'venv\\Scripts\\pip'
        python_path = 'venv\\Scripts\\python'
    else:  # Unix/Linux/Mac
        activate_script = 'venv/bin/activate'
        pip_path = 'venv/bin/pip'
        python_path = 'venv/bin/python'
    
    print("Installing requirements...")
    subprocess.run([pip_path, 'install', '-r', 'requirements.txt'], check=True)
    
    print("Starting Flask backend...")
    print("Backend will be available at: http://localhost:5000")
    print("Press Ctrl+C to stop the server")
    
    # Start the Flask app
    subprocess.run([python_path, 'app.py'], check=True)

if __name__ == "__main__":
    main()
