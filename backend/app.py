"""
Main Flask application for Rare Disease Diagnostic Engine.
"""
from flask import Flask, request, g
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache
from pymongo import MongoClient
import structlog
import os

from config import Config
from routes.auth import auth_bp
from routes.diagnosis import diagnosis_bp
from routes.doctor import doctor_bp
from routes.feedback import feedback_bp

# -------------------------------------------------------------------
# App initialization
# -------------------------------------------------------------------
app = Flask(__name__)
app.config.from_object(Config)

# -------------------------------------------------------------------
# Logging
# -------------------------------------------------------------------
structlog.configure(processors=[structlog.processors.JSONRenderer()])
logger = structlog.get_logger()

# -------------------------------------------------------------------
# Extensions
# -------------------------------------------------------------------
CORS(app, origins=Config.CORS_ORIGINS)
jwt = JWTManager(app)

# Rate limiter with Redis backend
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    storage_uri=Config.RATELIMIT_STORAGE_URL,
    default_limits=[Config.RATELIMIT_DEFAULT]
)

# Cache for KG and report endpoints
cache = Cache(app, config={'CACHE_TYPE': 'RedisCache', 'CACHE_REDIS_URL': Config.REDIS_URL})

# -------------------------------------------------------------------
# MongoDB
# -------------------------------------------------------------------
client = MongoClient(Config.MONGO_URI)
db = client.get_default_database()
app.db = db

# Ensure indexes
db.users.create_index('email', unique=True)
db.audit_logs.create_index('ts')
db.diagnoses.create_index('user_id')
db.diagnoses.create_index('risk_level')

# -------------------------------------------------------------------
# Blueprints
# -------------------------------------------------------------------
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(diagnosis_bp, url_prefix='/api/diagnosis')
app.register_blueprint(doctor_bp, url_prefix='/api/doctor')
app.register_blueprint(feedback_bp, url_prefix='/api/feedback')

# Ensure PDF report directory exists
os.makedirs(app.config['PDF_REPORT_DIR'], exist_ok=True)

# -------------------------------------------------------------------
# Model loading (lazy, on first request)
# -------------------------------------------------------------------
_models_loaded = False

@app.before_request
def load_models():
    """Load heavy models into app context on first request."""
    global _models_loaded
    if not _models_loaded:
        from models.image_model import ImagePredictor
        from models.fusion import MultimodalFusion
        from knowledge_graph.builder import KnowledgeGraph

        # ── Rare Disease Knowledge Base (replaces StructuredPredictor) ──
        try:
            from models.rare_disease_kb import RareDiseasePredictor
            app.structured_predictor = RareDiseasePredictor()
            logger.info("Rare disease KB loaded")
        except Exception as e:
            logger.error("Rare disease KB failed", error=str(e))
            app.structured_predictor = None

        # ── Image model (EfficientNet-B3, HAM10000 skin lesions) ────────
        try:
            app.image_predictor = ImagePredictor(Config.IMAGE_MODEL_PATH)
            logger.info("Image model loaded")
        except Exception as e:
            logger.error("Image model missing", error=str(e))
            app.image_predictor = None

        # ── Fusion ───────────────────────────────────────────────────────
        app.fusion = MultimodalFusion()

        # ── Knowledge Graph ──────────────────────────────────────────────
        try:
            app.kg = KnowledgeGraph(
                synonym_path='knowledge_graph/symptom_synonyms.json',
                cache_path='kg_cache.pkl'
            )
            logger.info("Knowledge graph loaded")
        except Exception as e:
            logger.error("KG build failed, using demo", error=str(e))
            try:
                from knowledge_graph.demo_graph import demo_graph
                app.kg = demo_graph()
            except Exception:
                app.kg = None

        _models_loaded = True

# -------------------------------------------------------------------
# Request logging
# -------------------------------------------------------------------
@app.before_request
def log_request():
    logger.info('request', method=request.method, path=request.path, ip=request.remote_addr)

# -------------------------------------------------------------------
# Home
# -------------------------------------------------------------------
@app.route('/')
def home():
    return "Rare Disease Diagnostic Engine API"

if __name__ == '__main__':
    app.run(debug=app.config['DEBUG'], host='0.0.0.0', port=5000)