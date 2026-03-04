"""
Configuration settings loaded from environment variables.
"""
import os
from typing import List

class Config:
    # MongoDB
    MONGO_URI: str = os.getenv('MONGO_URI', 'mongodb://localhost:27017/raredisease')

    # JWT
    JWT_SECRET_KEY: str = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES: int = 3600  # 1 hour
    JWT_REFRESH_TOKEN_EXPIRES: int = 86400 * 7  # 7 days

    # Model paths
    MODEL_PATH: str = os.getenv('MODEL_PATH', './saved_models')
    STRUCTURED_MODEL_PATH: str = os.path.join(MODEL_PATH, 'rf_model.pkl')
    XGB_MODEL_PATH: str = os.path.join(MODEL_PATH, 'xgb_model.pkl')
    LABEL_ENCODER_PATH: str = os.path.join(MODEL_PATH, 'label_encoder.pkl')
    FEATURE_NAMES_PATH: str = os.path.join(MODEL_PATH, 'feature_names.pkl')
    IMAGE_MODEL_PATH: str = os.path.join(MODEL_PATH, 'efficientnet_b3_ham10000.pth')

    # CORS
    CORS_ORIGINS: List[str] = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')

    # Rate limiting
    RATELIMIT_DEFAULT: str = "200 per day, 10 per hour"
    """RATELIMIT_STORAGE_URL: str = os.getenv('REDIS_URL', 'redis://localhost:6379/0')"""
    RATELIMIT_STORAGE_URL = "memory://"

    # Async
    REDIS_URL: str = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    CELERY_BROKER_URL: str = REDIS_URL
    CELERY_RESULT_BACKEND: str = REDIS_URL

    # Email (for notifications)
    SMTP_HOST: str = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    SMTP_PORT: int = int(os.getenv('SMTP_PORT', '587'))
    SMTP_USER: str = os.getenv('SMTP_USER', '')
    SMTP_PASSWORD: str = os.getenv('SMTP_PASSWORD', '')

    # Other
    DEBUG: bool = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    PDF_REPORT_DIR: str = './reports'
    MAX_CONTENT_LENGTH: int = 16 * 1024 * 1024  # 16MB
    UPLOAD_TEMP_DIR: str = '/tmp'