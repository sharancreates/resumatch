from flask import Blueprint, request, jsonify
from services.ai_engine import hybrid_match_score
from utils.pdf_parser import parse_pdf
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

analyze_bp = Blueprint('analyze', __name__)

@analyze_bp.route('/analyze', methods=['POST'])
def analyze_endpoint():
    try:
        data = request.json or {}
        resume = data.get('resume', '')
        job = data.get('job', '')

        if not resume or not job:
            return jsonify({"error": "Resume and Job description are required."}), 400
        
        # Reduced max length check to protect RAM
        if len(resume) > 20000 or len(job) > 20000: 
            return jsonify({"error": "Input too long. Max 20,000 characters."}), 400

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
    except Exception as e:
        logger.error(f"Analysis Error: {str(e)}")
        # In production, never return str(e) to the client (security risk). Log it instead.
        return jsonify({"error": "Internal processing error."}), 500

@analyze_bp.route('/parse-pdf', methods=['POST'])
def parse_pdf_endpoint():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
        
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({"error": "Invalid file type. Please upload a PDF."}), 400

    try:
        text = parse_pdf(file.stream)
        return jsonify({"status": "success", "text": text})
    except Exception as e:
        logger.error(f"PDF Parse Error: {str(e)}")
        return jsonify({"error": "Failed to parse PDF. File may be corrupted."}), 500

@analyze_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "alive", "message": "ResuMatch Backend Ready"})