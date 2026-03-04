from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache
from pymongo import MongoClient
from config import Config
from routes.auth import auth_bp
from routes.diagnosis import diagnosis_bp
from routes.doctor import doctor_bp
from routes.feedback import feedback_bp
import os
import structlog

app = Flask(__name__)
app.config.from_object(Config)

# Structured logging
structlog.configure(
    processors=[structlog.processors.JSONRenderer()]
)
logger = structlog.get_logger()

# CORS
CORS(app, origins=Config.CORS_ORIGINS)

# JWT
jwt = JWTManager(app)

# Rate limiter
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    storage_uri=Config.RATELIMIT_STORAGE_URL,
    default_limits=[Config.RATELIMIT_DEFAULT]
)

# Caching
cache = Cache(app, config={'CACHE_TYPE': 'RedisCache', 'CACHE_REDIS_URL': Config.REDIS_URL})

# MongoDB
client = MongoClient(Config.MONGO_URI)
db = client.get_default_database()
app.db = db

# Ensure indexes
db.users.create_index('email', unique=True)
db.audit_logs.create_index('ts')
db.diagnoses.create_index('user_id')
db.diagnoses.create_index('risk_level')

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(diagnosis_bp, url_prefix='/api/diagnosis')
app.register_blueprint(doctor_bp, url_prefix='/api/doctor')
app.register_blueprint(feedback_bp, url_prefix='/api/feedback')

# Ensure PDF report directory exists
os.makedirs(app.config['PDF_REPORT_DIR'], exist_ok=True)

@app.route('/')
def home():
    return "Rare Disease Diagnostic Engine API"

@app.before_request
def log_request():
    logger.info('request', method=request.method, path=request.path, ip=request.remote_addr)

if __name__ == '__main__':
    app.run(debug=app.config['DEBUG'], host='0.0.0.0', port=5000)