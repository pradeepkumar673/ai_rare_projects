"""
Pytest suite for the API.
"""
import pytest
from app import app
from pymongo import MongoClient
import json
from unittest.mock import patch, MagicMock
import io

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['MONGO_URI'] = 'mongodb://localhost:27017/raredisease_test'
    app.config['RATELIMIT_ENABLED'] = False
    app.config['CACHE_TYPE'] = 'SimpleCache'  # no Redis in tests
    with app.test_client() as test_client:
        yield test_client
    # Cleanup
    client_db = MongoClient('mongodb://localhost:27017/raredisease_test')
    client_db.drop_database('raredisease_test')

@pytest.fixture
def auth_headers(client):
    # Register and login a patient
    client.post('/api/auth/register', json={
        'email': 'test@example.com',
        'password': 'Test123!',
        'name': 'Tester'
    })
    resp = client.post('/api/auth/login', json={
        'email': 'test@example.com',
        'password': 'Test123!'
    })
    token = resp.json['access_token']
    return {'Authorization': f'Bearer {token}'}

def test_register_validation(client):
    # Missing password
    resp = client.post('/api/auth/register', json={'email': 'a@b.com'})
    assert resp.status_code == 400
    # Weak password
    resp = client.post('/api/auth/register', json={'email': 'a@b.com', 'password': 'weak'})
    assert resp.status_code == 400

def test_login_fail(client):
    resp = client.post('/api/auth/login', json={'email': 'nonexistent@example.com', 'password': 'Test123!'})
    assert resp.status_code == 401

@patch('routes.diagnosis.get_structured_predictor')
def test_predict_no_consent(mock_structured, client, auth_headers):
    mock_structured.return_value = MagicMock()
    data = {
        'symptoms': ['fever'],
        'consent': 'false'
    }
    resp = client.post('/api/diagnosis/predict', data=data, headers=auth_headers)
    assert resp.status_code == 400
    assert 'Consent' in resp.json['error']

@patch('routes.diagnosis.get_structured_predictor')
def test_predict_success(mock_structured, client, auth_headers):
    # Mock structured model
    mock_pred = MagicMock()
    mock_pred.predict_top5.return_value = [('DiseaseA', 0.9), ('DiseaseB', 0.05)]
    mock_pred.predict_proba.return_value = [0.9, 0.05, 0.05]
    mock_pred.explain.return_value = ([('fever', 0.5)], [0.5])
    mock_pred.le.classes_.tolist.return_value = ['DiseaseA', 'DiseaseB', 'DiseaseC']
    mock_structured.return_value = mock_pred

    data = {
        'symptoms': ['fever'],
        'age': '30',
        'gender': 'male',
        'consent': 'true'
    }
    resp = client.post('/api/diagnosis/predict', data=data, headers=auth_headers)
    assert resp.status_code == 200
    json_data = resp.json
    assert 'diagnosis_id' in json_data
    assert len(json_data['top5']) == 2
    assert json_data['risk_level'] in ['Low', 'Medium', 'High']

def test_fusion_agreement():
    from models.fusion import MultimodalFusion
    fusion = MultimodalFusion()
    structured = [0.2, 0.8, 0.0]
    image = [0.9, 0.1, 0.0]
    diseases = ['a', 'b', 'c']
    img_map = {0: 'a', 1: 'b', 2: 'c'}
    fused, agreement = fusion.fuse(structured, image, diseases, img_map)
    assert agreement == 'high'
    assert len(fused) == 3

def test_kg_builder():
    from knowledge_graph.builder import KnowledgeGraph
    kg = KnowledgeGraph()  # uses demo
    related = kg.get_related_diseases(['fever'])
    assert len(related) > 0

def test_doctor_access_denied(client, auth_headers):
    resp = client.get('/api/doctor/cases', headers=auth_headers)
    assert resp.status_code == 403

# Additional test for end-to-end flow would mock Celery and check PDF generation.