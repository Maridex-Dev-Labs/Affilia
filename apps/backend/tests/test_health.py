from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint_returns_ok():
    client = TestClient(app)
    response = client.get('/api/health', headers={'host': 'localhost'})

    assert response.status_code == 200
    assert response.json() == {'status': 'ok'}
