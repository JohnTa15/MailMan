#!/bin/bash
# ============================================
# Mailman - GCP Cloud Run Deploy Script
# ============================================
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - Docker installed
#   - A GCP project with Cloud Run API enabled
#
# Usage:
#   ./deploy-gcp.sh <PROJECT_ID> [REGION]
# ============================================

set -euo pipefail

PROJECT_ID="${1:?Usage: ./deploy-gcp.sh <PROJECT_ID> [REGION]}"
REGION="${2:-us-central1}"
SERVICE_NAME="mailman"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Deploying Mailman to GCP Cloud Run..."
echo "   Project: ${PROJECT_ID}"
echo "   Region:  ${REGION}"
echo "   Image:   ${IMAGE}"

# Set the project
gcloud config set project "${PROJECT_ID}"

# Enable required APIs
echo "📡 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com

# Build the Docker image
echo "🔨 Building Docker image..."
docker build -t "${IMAGE}" .

# Push to GCR
echo "📦 Pushing image to GCR..."
docker push "${IMAGE}"

# Deploy to Cloud Run
echo "☁️  Deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 600 \
  --set-env-vars "NODE_ENV=production,DATABASE_PATH=/app/data/webmail.db,CORS_ORIGIN=*" \
  --labels "app=mailman,version=1.1.0"

# Get the URL
URL=$(gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format 'value(status.url)')
echo ""
echo "✅ Deployment complete!"
echo "🌐 Your Mailman instance is live at: ${URL}"
echo ""
echo "⚠️  IMPORTANT: Set your secrets before production use:"
echo "   gcloud secrets create mailman-jwt-secret --data-file=- <<< '\$(openssl rand -hex 32)'"
echo "   gcloud secrets create mailman-encryption-key --data-file=- <<< '\$(openssl rand -hex 16)'"
echo "   gcloud run services update ${SERVICE_NAME} --region ${REGION} \\"
echo "     --update-secrets=JWT_SECRET=mailman-jwt-secret:latest \\"
echo "     --update-secrets=ENCRYPTION_KEY=mailman-encryption-key:latest"
