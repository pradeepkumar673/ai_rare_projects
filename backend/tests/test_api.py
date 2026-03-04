import pytest
from app import app
from pymongo import MongoClient
import json

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['MONGO_URI'] = 'mongodb://localhost:27017/raredisease_test'
    with app.test_client() as client:
        yield client
    # Cleanup
    client = MongoClient('mongodb://localhost:27017/raredisease_test')
    client.drop_database('raredisease_test')

def test_register_login(client):
    # Register
    resp = client.post('/api/auth/register', json={
        'email': 'test@example.com',
        'password': 'Test123!',
        'name': 'Tester'
    })
    assert resp.status_code == 201

    # Login
    resp = client.post('/api/auth/login', json={
        'email': 'test@example.com',
        'password': 'Test123!'
    })
    assert resp.status_code == 200
    data = json.loads(resp.data)
    assert 'access_token' in data

def test_predict_no_auth(client):
    resp = client.post('/api/diagnosis/predict')
    assert resp.status_code == 401

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