 
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from pymongo import MongoClient
from config import Config
from routes.auth import auth_bp
from routes.diagnosis import diagnosis_bp
from routes.doctor import doctor_bp
from routes.feedback import feedback_bp
import os

app = Flask(__name__)
app.config.from_object(Config)

# Enable CORS
CORS(app)

# JWT
jwt = JWTManager(app)

# MongoDB
client = MongoClient(app.config['MONGO_URI'])
db = client.get_default_database()
app.db = db

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

if __name__ == '__main__':
    app.run(debug=app.config['DEBUG'], host='0.0.0.0', port=5000)