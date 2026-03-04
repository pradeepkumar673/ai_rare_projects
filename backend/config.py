 
import os

class Config:
    # MongoDB
    MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/raredisease')
    
    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = 3600  # 1 hour
    JWT_REFRESH_TOKEN_EXPIRES = 86400 * 7  # 7 days

    # Model paths
    MODEL_PATH = os.getenv('MODEL_PATH', './saved_models')
    STRUCTURED_MODEL_PATH = os.path.join(MODEL_PATH, 'rf_model.pkl')
    XGB_MODEL_PATH = os.path.join(MODEL_PATH, 'xgb_model.pkl')
    LABEL_ENCODER_PATH = os.path.join(MODEL_PATH, 'label_encoder.pkl')
    FEATURE_NAMES_PATH = os.path.join(MODEL_PATH, 'feature_names.pkl')
    IMAGE_MODEL_PATH = os.path.join(MODEL_PATH, 'efficientnet_b3_ham10000.pth')

    # Other
    DEBUG = True
    PDF_REPORT_DIR = './reports'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size