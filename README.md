# 🔍 K8s Pod Inspector

An interactive Kubernetes demo application perfect for conference talks, workshops, and demos. Originally a simple nginx demo, now evolved into a comprehensive tool for demonstrating Kubernetes concepts, especially **virtual clusters (vClusters)** and pod introspection.

## ✨ Features

### 🎯 Live Pod Identity Card
- Real-time pod information (name, namespace, IP, node)
- Container image and version display
- Labels and annotations visualization
- Startup time and uptime tracking

### 🌐 Cluster Introspection
- Automatic **vCluster detection** with visual indicators
- Node count and namespace discovery
- Host vs. virtual cluster comparison
- Perfect for demonstrating multi-tenancy

### 📊 Real-time Metrics Dashboard
- Request counter with live updates
- Pod uptime display
- Version tracking
- Auto-refreshing every 2 seconds

### 📱 QR Code Integration
- Dynamic QR code generation for audience engagement
- Scan to connect to the pod from mobile devices
- Perfect for conference demos with live audience

### 🎨 Modern UI
- Beautiful gradient background with animations
- Glass-morphism design
- Responsive layout (mobile-friendly)
- Dark mode optimized for projectors

## 🚀 Quick Start

### Option 1: Pod Inspector (Recommended for Demos)

```bash
# Build the container
docker build -f Dockerfile.inspector -t piotr1215/pod-inspector:latest .

# Deploy to Kubernetes
kubectl apply -f k8s/deployment.yaml

# Get the service URL
kubectl get svc -n pod-inspector
```

### Option 2: Simple Nginx (Original)

```bash
# Build the container
docker build -t piotr1215/nginx-demo:latest .

# Deploy to Kubernetes
kubectl create deployment nginx-demo --image=piotr1215/nginx-demo:latest
kubectl expose deployment nginx-demo --port=80 --type=LoadBalancer
```

## 🎭 Conference Demo Scenarios

### 1. **VCluster Multi-tenancy Demo**

Perfect for showing cluster isolation and virtual Kubernetes clusters:

```bash
# Create a vCluster
vcluster create demo-cluster -n vcluster-demo --expose

# Connect to the vCluster
vcluster connect demo-cluster -n vcluster-demo

# Deploy pod-inspector in vCluster
kubectl apply -f k8s/vcluster-demo.yaml

# Show the UI - it will detect and display vCluster info!
```

**What to show your audience:**
- The pod thinks it's in a real cluster
- VCluster badge appears with cluster name
- Compare node count (vCluster vs. host)
- Demonstrate namespace isolation

### 2. **Blue-Green Deployment Demo**

Demonstrate zero-downtime deployments:

```bash
# Deploy both versions
kubectl apply -f k8s/blue-green-demo.yaml

# Traffic goes to GREEN version (v1.0.0)
# Show audience the version number

# Switch to BLUE version
kubectl patch svc pod-inspector-bg -n pod-inspector -p '{"spec":{"selector":{"version":"blue"}}}'

# Watch the version change in real-time!
```

**What to show your audience:**
- Both versions running simultaneously
- Instant traffic switching
- Different version numbers (v1 vs v2)
- Zero downtime during switch

### 3. **Scaling Demo**

Show horizontal pod autoscaling in action:

```bash
# Start with 1 replica
kubectl scale deployment pod-inspector -n pod-inspector --replicas=1

# Have audience scan QR code and access the service
# They'll see the pod name and IP

# Scale to 10 replicas
kubectl scale deployment pod-inspector -n pod-inspector --replicas=10

# Refresh - audience sees different pod names as load balancer distributes traffic
```

**What to show your audience:**
- Different pod names on each refresh
- Load balancing in action
- Fast scale-up capabilities

### 4. **Rolling Update Demo**

Demonstrate Kubernetes rolling updates:

```bash
# Deploy v1
kubectl apply -f k8s/deployment.yaml

# Update to v2 (change APP_VERSION env var)
kubectl set env deployment/pod-inspector -n pod-inspector APP_VERSION=v2.0.0

# Watch pods rolling update
kubectl rollout status deployment/pod-inspector -n pod-inspector

# Audience sees versions changing gradually
```

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│  Frontend (HTML/JS/Tailwind CSS)   │
│  - Live metrics display             │
│  - QR code viewer                   │
│  - Auto-refresh every 2s            │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Go Backend                         │
│  - HTTP Server                      │
│  - Metrics collection               │
│  - QR code generation               │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Kubernetes API                     │
│  - Pod introspection                │
│  - Node information                 │
│  - VCluster detection               │
└─────────────────────────────────────┘
```

## 📦 Container Images

Both variants available:

- **Pod Inspector**: `piotr1215/pod-inspector:latest` (Go-based, feature-rich)
- **Simple Nginx**: `piotr1215/nginx-demo:latest` (Original, minimal)

## 🔧 Configuration

The pod inspector uses environment variables (automatically set by Kubernetes):

- `POD_NAMESPACE` - Pod's namespace
- `POD_IP` - Pod's IP address
- `NODE_NAME` - Node where pod is running
- `HOST_IP` - Host node IP
- `SERVICE_ACCOUNT` - Service account name
- `APP_VERSION` - Application version (default: v1.0.0)
- `PORT` - HTTP server port (default: 8080)

## 🎤 Conference Talk Tips

### Opening Hook
"Who here has deployed something to Kubernetes?"
→ Deploy pod-inspector
→ Show QR code: "Scan this and tell me what pod you're hitting!"

### Mid-Talk Engagement
- Have audience scan QR during breaks
- Live scale demo: "Let's add more replicas while you're watching"
- vCluster reveal: "But wait... are we REALLY in the cluster we think we're in?"

### Key Talking Points
1. **Observability** - "Notice how the pod knows everything about itself"
2. **VClusters** - "This pod thinks it's in its own cluster - isolation!"
3. **Cloud Native** - "All this without any external dependencies"
4. **Simplicity** - "Just a Go binary and Kubernetes - that's it!"

## 🛠️ Development

```bash
# Build locally
go build -o pod-inspector .

# Run locally (limited features outside cluster)
./pod-inspector

# Build container
docker build -f Dockerfile.inspector -t pod-inspector:dev .

# Test in kind cluster
kind create cluster
kubectl apply -f k8s/deployment.yaml
kubectl port-forward -n pod-inspector svc/pod-inspector 8080:80
```

## 📝 License

MIT License - feel free to use in your talks and demos!


