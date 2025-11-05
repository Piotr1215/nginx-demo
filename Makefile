.PHONY: help build push deploy clean test

# Variables
IMAGE_NAME ?= piotr1215/pod-inspector
TAG ?= latest
NAMESPACE ?= pod-inspector

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build the pod-inspector container image
	@echo "🔨 Building pod-inspector..."
	docker build -f Dockerfile.inspector -t $(IMAGE_NAME):$(TAG) .
	@echo "✅ Build complete: $(IMAGE_NAME):$(TAG)"

build-nginx: ## Build the original nginx demo
	@echo "🔨 Building nginx-demo..."
	docker build -t $(IMAGE_NAME):nginx-$(TAG) .
	@echo "✅ Build complete: $(IMAGE_NAME):nginx-$(TAG)"

push: ## Push the container image to registry
	@echo "📤 Pushing $(IMAGE_NAME):$(TAG)..."
	docker push $(IMAGE_NAME):$(TAG)
	@echo "✅ Push complete"

deploy: ## Deploy pod-inspector to Kubernetes
	@echo "🚀 Deploying pod-inspector to namespace $(NAMESPACE)..."
	kubectl apply -f k8s/deployment.yaml
	@echo "✅ Deployment complete"
	@echo ""
	@echo "To access the service:"
	@echo "  kubectl port-forward -n $(NAMESPACE) svc/pod-inspector 8080:80"
	@echo "  Then open: http://localhost:8080"

deploy-blue-green: ## Deploy blue-green demo
	@echo "🚀 Deploying blue-green setup..."
	kubectl apply -f k8s/blue-green-demo.yaml
	@echo "✅ Blue-green deployment complete"

deploy-vcluster: ## Deploy to vcluster (must be connected to vcluster first)
	@echo "🎭 Deploying to vCluster..."
	kubectl apply -f k8s/vcluster-demo.yaml
	@echo "✅ VCluster deployment complete"

logs: ## Show logs from pod-inspector pods
	kubectl logs -n $(NAMESPACE) -l app=pod-inspector --tail=100 -f

status: ## Show deployment status
	@echo "📊 Deployment status:"
	kubectl get all -n $(NAMESPACE)

clean: ## Remove all deployments
	@echo "🧹 Cleaning up..."
	kubectl delete -f k8s/deployment.yaml --ignore-not-found=true
	kubectl delete -f k8s/blue-green-demo.yaml --ignore-not-found=true
	@echo "✅ Cleanup complete"

test-local: ## Run the application locally
	@echo "🧪 Running locally..."
	@echo "⚠️  Note: Some features require running in a Kubernetes cluster"
	go run .

dev: ## Build and load into kind cluster for development
	@echo "🛠️  Building for kind..."
	docker build -f Dockerfile.inspector -t $(IMAGE_NAME):dev .
	kind load docker-image $(IMAGE_NAME):dev
	@echo "✅ Image loaded into kind cluster"

scale: ## Scale deployment (usage: make scale REPLICAS=5)
	@echo "📈 Scaling to $(REPLICAS) replicas..."
	kubectl scale deployment pod-inspector -n $(NAMESPACE) --replicas=$(REPLICAS)
	kubectl get pods -n $(NAMESPACE) -w

port-forward: ## Forward service port to localhost:8080
	@echo "🔗 Port forwarding to localhost:8080..."
	@echo "Open http://localhost:8080 in your browser"
	kubectl port-forward -n $(NAMESPACE) svc/pod-inspector 8080:80

all: build push deploy ## Build, push, and deploy

.DEFAULT_GOAL := help
