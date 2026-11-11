import nltk
import re
import threading
import logging
import spacy
from spacy.matcher import PhraseMatcher
import numpy as np
from collections import OrderedDict
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.stem import PorterStemmer
from nltk.corpus import stopwords
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

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

# --- Bounded LRU cache (no dependency on full text as hash key in stdlib lru_cache) ---
class BoundedEmbeddingCache:
    """Simple LRU cache with a max memory-safe size. Keys are hashes, not full text."""
    def __init__(self, maxsize=128):
        self._cache = OrderedDict()
        self._maxsize = maxsize
        self._lock = threading.Lock()

    def get(self, key):
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
                return self._cache[key]
            return None

    def put(self, key, value):
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
            else:
                if len(self._cache) >= self._maxsize:
                    self._cache.popitem(last=False)
            self._cache[key] = value

_embedding_cache = BoundedEmbeddingCache(maxsize=128)

# --- Model loading with explicit warning ---
_model_loaded = False
model = None
tokenizer = None

try:
    # Attempt to load using standard PyTorch CPU feature extraction first
    # to avoid fragile ONNX runtime C-level access violations on some architectures
    import torch
    from transformers import AutoTokenizer, AutoModel
    model_id = "sentence-transformers/all-MiniLM-L6-v2"
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model = AutoModel.from_pretrained(model_id)
    _model_loaded = True
    logger.info("Semantic model loaded successfully via PyTorch: %s", model_id)
except Exception as e:
    # If PyTorch fails, attempt ONNX fallback
    try:
        from optimum.onnxruntime import ORTModelForFeatureExtraction
        from transformers import AutoTokenizer
        model_id = "optimum/all-MiniLM-L6-v2"
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        model = ORTModelForFeatureExtraction.from_pretrained(model_id)
        _model_loaded = True
        logger.info("Semantic model loaded successfully via ONNX: %s", model_id)
    except Exception as e_onnx:
        model = None
        tokenizer = None
        logger.warning(
            "Failed to load semantic model: PyTorch error: %s | ONNX error: %s. "
            "Semantic similarity will return 0 for all requests. "
            "Only lexical scoring will be used.",
            e, e_onnx
        )

def is_model_loaded():
    """Expose model health status for the /health endpoint."""
    return _model_loaded

def clean_and_tokenize(text_input):
    if not text_input:
        return []
    
    cleaned_input = text_input.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
    cleaned = re.sub(r'[^a-zA-Z0-9]', ' ', cleaned_input).lower()
    tokens = word_tokenize(cleaned)
    return [stemmer.stem(word) for word in tokens if word not in STOP_WORDS]

def get_cached_embedding(text):
    if model is None or not text.strip():
        return np.zeros(384)

    cache_key = hash(text)
    cached = _embedding_cache.get(cache_key)
    if cached is not None:
        return cached

    sentences = sent_tokenize(text)[:20]
    if not sentences:
        sentences = [text[:1000]]

    try:
        import torch
        inputs = tokenizer(sentences, padding=True, truncation=True, return_tensors="pt")
        
        # Standard PyTorch model inference vs ONNX model inference
        if 'ORTModel' not in model.__class__.__name__:
            with torch.no_grad():
                outputs = model(**inputs)
        else:
            outputs = model(**inputs)
            
        embeddings = outputs.last_hidden_state.numpy()
        sentence_embeddings = np.mean(embeddings, axis=1)
        final_embedding = np.mean(sentence_embeddings, axis=0)
        _embedding_cache.put(cache_key, final_embedding)
        return final_embedding
    except Exception as ex:
        logger.warning(f"Failed to generate embedding: {ex}")
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

# Predefined common tech skills for the PhraseMatcher
COMMON_SKILLS = [
    "python", "javascript", "typescript", "java", "c++", "c#", "go", "rust", "ruby", "php", "swift", "kotlin",
    "flask", "django", "fastapi", "node.js", "express", "spring boot", "react", "vue", "angular", "svelte", "next.js",
    "docker", "kubernetes", "aws", "azure", "gcp", "google cloud", "devops", "ci/cd", "git", "github", "gitlab",
    "mysql", "postgresql", "mongodb", "redis", "sqlite", "mariadb", "oracle", "elasticsearch", "cassandra",
    "machine learning", "deep learning", "artificial intelligence", "data science", "nlp", "computer vision",
    "pytorch", "tensorflow", "keras", "scikit-learn", "pandas", "numpy", "scipy", "tableau", "powerbi",
    "html", "css", "tailwindcss", "bootstrap", "sass", "graphql", "rest api", "soap", "web sockets",
    "agile", "scrum", "kanban", "jira", "confluence", "trello", "microservices", "serverless",
    "linux", "bash", "shell", "powershell", "windows server", "macos", "ios", "android",
    "unit testing", "integration testing", "pytest", "jest", "selenium", "cypress", "mocha"
]

_nlp = None
_matcher = None
_spacy_lock = threading.Lock()

def _init_spacy():
    global _nlp, _matcher
    with _spacy_lock:
        if _nlp is None:
            try:
                _nlp = spacy.load("en_core_web_sm")
            except OSError:
                from spacy.cli import download
                try:
                    download("en_core_web_sm")
                    _nlp = spacy.load("en_core_web_sm")
                except Exception as ex:
                    logger.warning(f"Failed to download/load en_core_web_sm: {ex}")
                    _nlp = None
                    return None, None
                    
            _matcher = PhraseMatcher(_nlp.vocab, attr="LOWER")
            patterns = [_nlp.make_doc(skill) for skill in COMMON_SKILLS]
            _matcher.add("SKILLS", patterns)
            
        return _nlp, _matcher

def extract_skills_and_entities(text):
    nlp_engine, skill_matcher = _init_spacy()
    if not nlp_engine:
        # Fallback to regex word matching if SpaCy is unavailable
        words = set(re.findall(r'[a-zA-Z0-9\-\.]+', text.lower()))
        matched_skills = [s for s in COMMON_SKILLS if s in words]
        return matched_skills, []
        
    try:
        doc = nlp_engine(text)
        
        # Extract named entities (like companies/platforms/products)
        entities = []
        for ent in doc.ents:
            if ent.label_ in ["ORG", "PRODUCT", "WORK_OF_ART"]:
                entities.append(ent.text.strip())
                
        # Extract skills using PhraseMatcher
        skills = []
        matches = skill_matcher(doc)
        for match_id, start, end in matches:
            span = doc[start:end]
            skills.append(span.text.strip())
            
        return list(set(skills)), list(set(entities))
    except Exception as ex:
        logger.warning(f"Error during SpaCy extraction: {ex}")
        words = set(re.findall(r'[a-zA-Z0-9\-\.]+', text.lower()))
        matched_skills = [s for s in COMMON_SKILLS if s in words]
        return matched_skills, []

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

    # Extract skills/entities
    resume_skills, resume_ents = extract_skills_and_entities(resume_text)
    job_skills, job_ents = extract_skills_and_entities(job_text)
    
    resume_skills_lower = {s.lower() for s in resume_skills}
    resume_ents_lower = {e.lower() for e in resume_ents}
    
    missing_display = []
    
    # 1. Compare skills
    for skill in job_skills:
        if skill.lower() not in resume_skills_lower:
            missing_display.append(skill)
            
    # 2. Compare entities (technologies, organizations, etc.)
    if len(missing_display) < 10:
        for ent in job_ents:
            if len(ent) < 3 or ent.lower() in resume_skills_lower or ent.lower() in resume_ents_lower:
                continue
            if ent not in missing_display and ent.lower() not in [m.lower() for m in missing_display]:
                missing_display.append(ent)
                
    # 3. Fallback to token word difference if no skills or entities were identified
    if not missing_display:
        resume_stems = set(clean_and_tokenize(resume_text))
        clean_job_text_raw = job_text.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
        clean_job_text = re.sub(r'[^a-zA-Z0-9]', ' ', clean_job_text_raw).lower()
        job_words = word_tokenize(clean_job_text)
        seen_stems = set()
        for word in job_words:
            if len(word) < 3 or word in STOP_WORDS:
                continue
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