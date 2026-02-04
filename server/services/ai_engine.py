import nltk
import re
import numpy as np
from functools import lru_cache
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.stem import PorterStemmer
from nltk.corpus import stopwords
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from optimum.onnxruntime import ORTModelForFeatureExtraction
from transformers import AutoTokenizer

def download_nltk_resources():
    resources = ['punkt', 'stopwords', 'punkt_tab']
    for res in resources:
        try:
            nltk.data.find(f'tokenizers/{res}')
        except LookupError:
            try:
                nltk.data.find(f'corpora/{res}')
            except LookupError:
                nltk.download(res, quiet=True)

download_nltk_resources()

stemmer = PorterStemmer()
nltk_stopwords = set(stopwords.words('english'))

CUSTOM_IGNORE = {
    "job", "title", "description", "requirements", "summary", "experience",
    "looking", "seeking", "ideal", "candidate", "must", "have", "skills",
    "ensure", "ensuring", "high", "ability", "work", "responsibilities",
    "duties", "role", "position", "year", "years", "plus", "strong", "knowledge",
    "degree", "preferred", "qualification", "qualifications", "opportunity",
    "environment", "team", "player", "members", "communication", "collaborate",
    "support", "help", "client", "clients", "customer", "business", "company",
    "join", "make", "doing", "build", "building", "create", "creating",
    "develop", "developing", "maintain", "maintaining", "manage", "managing",
    "perform", "performing", "provide", "providing", "deliver", "delivering",
    "using", "used", "working", "works", "include", "including", "require",
    "requires", "participate", "skilled", "proficient", "excellent", "good"
}

STOP_WORDS = nltk_stopwords.union(CUSTOM_IGNORE)

try:
    model_id = "optimum/all-MiniLM-L6-v2"
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model = ORTModelForFeatureExtraction.from_pretrained(model_id)
except Exception:
    model = None
    tokenizer = None

def clean_and_tokenize(text_input):
    if not text_input:
        return []
    
    cleaned_input = text_input.replace('\\n', ' ').replace('\\r', ' ').replace('\\t', ' ')
    cleaned = re.sub(r'[^a-zA-Z0-9]', ' ', cleaned_input).lower()
    tokens = word_tokenize(cleaned)
    return [stemmer.stem(word) for word in tokens if word not in STOP_WORDS]

@lru_cache(maxsize=512)
def get_cached_embedding(text):
    if model is None or not text.strip():
        return np.zeros(384)

    sentences = sent_tokenize(text)[:20]
    if not sentences:
        sentences = [text[:1000]]

    try:
        inputs = tokenizer(sentences, padding=True, truncation=True, return_tensors="pt")
        outputs = model(**inputs)
        embeddings = outputs.last_hidden_state.numpy()
        sentence_embeddings = np.mean(embeddings, axis=1)
        final_embedding = np.mean(sentence_embeddings, axis=0)
        return final_embedding
    except Exception:
        return np.zeros(384)

def semantic_similarity(resume_text, job_text):
    if not resume_text or not job_text:
        return 0.0
    
    resume_emb = get_cached_embedding(resume_text)
    job_emb = get_cached_embedding(job_text)
    
    dot_product = np.dot(resume_emb, job_emb)
    norm_resume = np.linalg.norm(resume_emb)
    norm_job = np.linalg.norm(job_emb)
    
    if norm_resume == 0 or norm_job == 0:
        return 0.0
        
    similarity = dot_product / (norm_resume * norm_job)
    return float(max(0, min(similarity * 100, 100)))

def analyze_resume_lexical(resume_text, job_text):
    if not resume_text or not job_text:
        return {"score": 0.0, "missing": []}

    vectorizer = CountVectorizer(
        tokenizer=clean_and_tokenize,
        token_pattern=None, 
        binary=True,
        ngram_range=(1, 2)
    )

    try:
        documents = [resume_text, job_text]
        matrix = vectorizer.fit_transform(documents)
        cosine_sim = cosine_similarity(matrix[0:1], matrix[1:2])[0][0]
        score_percent = float(cosine_sim * 100)
    except ValueError:
        score_percent = 0.0

    resume_stems = set(clean_and_tokenize(resume_text))
    
    clean_job_text_raw = job_text.replace('\\n', ' ').replace('\\r', ' ').replace('\\t', ' ')
    clean_job_text = re.sub(r'[^a-zA-Z0-9]', ' ', clean_job_text_raw).lower()
    job_words = word_tokenize(clean_job_text)
    
    missing_display = []
    seen_stems = set()

    for word in job_words:
        if len(word) < 3: continue 
        if word in STOP_WORDS: continue
        
        stem = stemmer.stem(word)
        
        if stem not in resume_stems and stem not in seen_stems:
            missing_display.append(word)
            seen_stems.add(stem)

    return {"score": score_percent, "missing": missing_display[:10]}

def hybrid_match_score(resume_text, job_text):
    lexical_data = analyze_resume_lexical(resume_text, job_text)
    lexical_score = lexical_data["score"]
    semantic_score = semantic_similarity(resume_text, job_text)
    
    final_score = round((0.4 * lexical_score) + (0.6 * semantic_score), 2)
    
    return final_score, lexical_data["missing"], round(lexical_score, 2), round(semantic_score, 2)