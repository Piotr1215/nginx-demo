#!/bin/bash

# Build script for Kubernetes Pod Party

set -e

IMAGE_NAME="${IMAGE_NAME:-pod-party}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
REGISTRY="${REGISTRY:-}"

if [ -n "$REGISTRY" ]; then
    FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
else
    FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"
fi

echo "🎉 Building Kubernetes Pod Party"
echo "📦 Image: ${FULL_IMAGE}"
echo ""

# Build the Docker image
echo "🔨 Building Docker image..."
docker build -f Dockerfile.new -t "${FULL_IMAGE}" .

echo ""
echo "✅ Build complete!"
echo ""
echo "🚀 Next steps:"
echo "   1. Test locally: docker run -p 8080:8080 ${FULL_IMAGE}"
echo "   2. Push to registry: docker push ${FULL_IMAGE}"
echo "   3. Update k8s/deployment.yaml with image: ${FULL_IMAGE}"
echo "   4. Deploy: kubectl apply -f k8s/"
echo ""
