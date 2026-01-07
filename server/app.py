from flask import Flask, jsonify, request
from flask_cors import CORS
import nltk
import re
from nltk.tokenize import word_tokenize
from nltk.stem import PorterStemmer
from nltk.corpus import stopwords
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
import numpy as np
import hashlib

app = Flask(__name__)
CORS(app)

try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('punkt')
    nltk.download('stopwords')

stemmer = PorterStemmer()
STOP_WORDS = set(stopwords.words('english'))

semantic_model = SentenceTransformer('all-MiniLM-L6-v2')

#dictionary to store job_text -> embedding
embedding_cache = {}

def get_cached_embedding(text):
    """Return cached embedding or compute it if not cached"""
    key = hashlib.md5(text.encode('utf-8')).hexdigest()
    if key in embedding_cache:
        return embedding_cache[key]
    emb = semantic_model.encode([text], convert_to_numpy=True, normalize_embeddings=True)[0]
    embedding_cache[key] = emb
    return emb

def safe_float(value):
    try:
        return float(value)
    except (ValueError, TypeError):
        return 0.0

def semantic_similarity(resume_text, job_text):
    if not resume_text or not job_text:
        return 0.0
    resume_emb = semantic_model.encode([resume_text], convert_to_numpy=True, normalize_embeddings=True)[0]
    job_emb = get_cached_embedding(job_text)
    similarity = np.dot(resume_emb, job_emb)
    boosted_score = similarity * 170
    return safe_float(max(0, min(boosted_score, 100)))

def clean_and_tokenize(text_input):
    if not text_input:
        return []
    cleaned = re.sub(r'[^a-zA-Z]', ' ', text_input).lower()
    tokens = word_tokenize(cleaned)
    return [stemmer.stem(word) for word in tokens if word not in STOP_WORDS]

def analyze_resume(resume_text, job_text):
    if not resume_text or not job_text:
        return {"score": 0.0, "missing": []}

    vectorizer = CountVectorizer(
        tokenizer=clean_and_tokenize,
        token_pattern=None,
        binary=True,
        ngram_range=(1, 2)
    )

    documents = [resume_text, job_text]
    try:
        matrix = vectorizer.fit_transform(documents)
        score_percent = safe_float(cosine_similarity(matrix[0:1], matrix[1:2])[0][0] * 100)
    except ValueError:
        score_percent = 0.0

    resume_stems = set(clean_and_tokenize(resume_text))
    job_stems = set(clean_and_tokenize(job_text))
    missing_stems = job_stems - resume_stems

    clean_job_text = re.sub(r'[^a-zA-Z]', ' ', job_text).lower()
    job_words = word_tokenize(clean_job_text)

    missing_display = []
    seen = set()
    for word in job_words:
        if word in STOP_WORDS:
            continue
        stem = stemmer.stem(word)
        if stem in missing_stems and stem not in seen:
            missing_display.append(word)
            seen.add(stem)

    return {"score": score_percent, "missing": missing_display[:10]}

def hybrid_match_score(resume_text, job_text):
    lexical_data = analyze_resume(resume_text, job_text)
    lexical_score = lexical_data["score"]
    semantic_score = semantic_similarity(resume_text, job_text)
    final_score = round((0.4 * lexical_score) + (0.6 * semantic_score), 2)
    return final_score, lexical_data["missing"], lexical_score, semantic_score

@app.route('/api/analyze', methods=['POST'])
def analyze_endpoint():
    data = request.json or {}
    resume = data.get('resume', '')
    job = data.get('job', '')

    final_score, missing_keywords, lexical_score, semantic_score = hybrid_match_score(resume, job)

    return jsonify({
        "status": "success",
        "data": {
            "score": final_score,
            "missing": missing_keywords,
            "breakdown": {
                "lexical": lexical_score,
                "semantic": semantic_score
            }
        }
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "alive", "message": "ResuMatch Backend Ready"})

if __name__ == '__main__':
    print("🚀 Server starting with semantic caching...")
    app.run(debug=True, port=5000)
