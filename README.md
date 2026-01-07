# ResuMatch AI 🚀

A Hybrid ATS Resume Scanner that combines **Keyword Matching** with **Semantic Vector Search** to provide accurate resume scoring.

## How the hybrid engine works
Most resume scanners only look for exact keywords. ResuMatch uses a weighted algorithm:

1.  **Lexical Search (40%):** Uses `Scikit-Learn` to find exact keywords (ATS simulation).
2.  **Semantic Search (60%):** Uses `all-MiniLM-L6-v2` to convert text into Vector Embeddings, allowing the system to understand that *"Managing a team"* is the same as *"Leadership"*.

## Features
- **Smart Tokenization:** Handles merged words and punctuation errors.
- **Missing Keyword Extraction:** Tells you exactly what words to add.
- **Performance Caching:** Caches vector embeddings to reduce latency.
- **Detailed Breakdown:** Visualizes Keyword vs. Meaning score.

## Installation
1. Clone the repo.
2. `cd server` && `pip install -r requirements.txt` && `python app.py`
3. `cd client` && `npm install` && `npm run dev`
