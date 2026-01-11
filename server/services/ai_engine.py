import nltk
import re
import numpy as np
import hashlib
from nltk.tokenize import word_tokenize
from nltk.stem import PorterStemmer
from nltk.corpus import stopwords
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer

try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('punkt')
    nltk.download('stopwords')
    nltk.download('punkt_tab')

stemmer = PorterStemmer()
STOP_WORDS = set(stopwords.words('english'))
semantic_model = SentenceTransformer('all-MiniLM-L6-v2')
embedding_cache = {}

def safe_float(value):
    try:
        return float(value)
    except (ValueError, TypeError):
        return 0.0

def clean_and_tokenize(text_input):
    if not text_input:
        return []
    cleaned = re.sub(r'[^a-zA-Z0-9]', ' ', text_input).lower() #remove spl chars
    tokens = word_tokenize(cleaned)
    return [stemmer.stem(word) for word in tokens if word not in STOP_WORDS]

def get_weighted_embedding(text):
    #chunks text -> encodes -> averages vectors
    key = hashlib.md5(text.encode('utf-8')).hexdigest()
    if key in embedding_cache:
        return embedding_cache[key]
    
    chunk_size = 500
    chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]
    
    if not chunks:
        return np.zeros(384)

    chunk_embeddings = semantic_model.encode(chunks, convert_to_numpy=True)
    final_embedding = np.mean(chunk_embeddings, axis=0)
    
    embedding_cache[key] = final_embedding
    return final_embedding

def semantic_similarity(resume_text, job_text):
    if not resume_text or not job_text:
        return 0.0
    
    resume_emb = get_weighted_embedding(resume_text)
    job_emb = get_weighted_embedding(job_text)
    
    similarity = np.dot(resume_emb, job_emb) / (np.linalg.norm(resume_emb) * np.linalg.norm(job_emb))
    return safe_float(max(0, min(similarity * 100, 100)))

def analyze_resume_lexical(resume_text, job_text):
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

    clean_job_text = re.sub(r'[^a-zA-Z0-9]', ' ', job_text).lower()
    job_words = word_tokenize(clean_job_text)
    missing_display = []
    seen = set()

    for word in job_words:
        if word in STOP_WORDS: continue
        stem = stemmer.stem(word)
        if stem in missing_stems and stem not in seen:
            missing_display.append(word)
            seen.add(stem)

    return {"score": score_percent, "missing": missing_display[:10]}

def hybrid_match_score(resume_text, job_text):
    lexical_data = analyze_resume_lexical(resume_text, job_text)
    lexical_score = lexical_data["score"]
    semantic_score = semantic_similarity(resume_text, job_text)
    
    final_score = round((0.4 * lexical_score) + (0.6 * semantic_score), 2)
    return final_score, lexical_data["missing"], lexical_score, semantic_score