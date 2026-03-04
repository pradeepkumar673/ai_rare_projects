# Rare Disease Diagnostic Engine - Backend

Flask-based backend for multimodal AI rare disease diagnosis.

## Features

- Structured symptom model (Random Forest + XGBoost) trained on 134 diseases.
- Optional image model (EfficientNet-B3) with Grad-CAM.
- Knowledge graph from Orphanet with symptom synonym mapping.
- Multimodal fusion with agreement flag.
- Explainable AI: SHAP for symptoms, heatmap for images.
- PDF reports with embedded visuals and QR code.
- JWT authentication (patient/doctor roles).
- Rate limiting, caching, audit logging.
- Async tasks with Celery (PDF generation, notifications).
- Comprehensive test suite.

## Quick Start with Docker Compose

```bash
# Clone repository and cd into backend
docker-compose up --build