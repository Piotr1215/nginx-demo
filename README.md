# vCluster Control Tower

An interactive Kubernetes and vCluster visualization dashboard designed for demos, talks, and presentations.

## Features

### 🎯 Real-time Cluster Monitoring
- **Host Cluster Overview**: Live metrics showing nodes, pods, namespaces, and Kubernetes version
- **Resource Health**: Visual indicators for cluster health and resource status
- **Auto-refresh**: Data updates every 30 seconds automatically

### 🎪 vCluster Discovery & Visualization
- **Automatic Detection**: Discovers all vclusters running in the host cluster
- **Detailed Metrics**: Shows vcluster status, age, replicas, workloads, and endpoints
- **Multi-vCluster View**: Perfect for demonstrating vcluster isolation and multi-tenancy

### 🔍 Pod Self-Awareness
- **Identity Information**: Displays current pod name, namespace, IP, and node placement
- **Node Details**: Shows host node OS, kernel, kubelet version, and container runtime
- **Configuration**: Reveals service account, labels, annotations, and Kubernetes API connection

### 🎨 Modern UI/UX
- **Glassmorphism Design**: Beautiful dark theme with vibrant purple/pink accent colors
- **Animated Transitions**: Smooth, professional animations and transitions
- **Responsive Layout**: Works on desktop, tablet, and mobile devices
- **Live Updates**: Real-time data refresh with visual feedback

## Architecture

```
┌─────────────────────────────────┐
│   Frontend (Vanilla JS)         │
│   - Modern glassmorphism UI     │
│   - Real-time updates           │
│   - Interactive visualizations  │
└──────────────┬──────────────────┘
               │ HTTP/REST API
┌──────────────▼──────────────────┐
│   Backend (Node.js/Express)     │
│   - API endpoints               │
│   - Kubernetes client           │
│   - vCluster detection logic    │
└──────────────┬──────────────────┘
               │ Kubernetes API
┌──────────────▼──────────────────┐
│   Kubernetes Cluster            │
│   - Host cluster resources      │
│   - vCluster StatefulSets       │
│   - Pod/Node information        │
└─────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Kubernetes cluster (1.20+)
- kubectl configured
- Docker (for building images)
- Node.js 18+ (for local development)

### Option 1: Deploy to Kubernetes

1. **Build and push the Docker image:**

```bash
# Build the image
docker build -f Dockerfile.v2 -t your-registry/vcluster-control-tower:v2.0.0 .

# Push to your registry
docker push your-registry/vcluster-control-tower:v2.0.0
```

2. **Update the image in kustomization.yaml:**

```bash
cd k8s
# Edit kustomization.yaml and update the image registry/tag
vim kustomization.yaml
```

3. **Deploy using kubectl:**

```bash
# Apply all manifests
kubectl apply -k k8s/

# Or apply individually
kubectl apply -f k8s/rbac.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

4. **Access the dashboard:**

```bash
# Get the LoadBalancer IP (if using LoadBalancer service)
kubectl get service vcluster-control-tower

# Or use port-forward for local access
kubectl port-forward service/vcluster-control-tower 8080:80

# Open browser
open http://localhost:8080
```

### Option 2: Run Locally (Demo Mode)

For development or testing without a Kubernetes cluster:

```bash
# Install dependencies
npm install

# Start the server
npm start

# Open browser
open http://localhost:3000
```

**Note**: In demo mode, the application will show mock data since it can't connect to a real Kubernetes cluster.

## Usage with vCluster

### Deploy a vCluster

To see the vCluster visualization in action, deploy one or more vclusters:

```bash
# Install vCluster CLI
curl -L -o vcluster "https://github.com/loft-sh/vcluster/releases/latest/download/vcluster-linux-amd64"
chmod +x vcluster
sudo mv vcluster /usr/local/bin

# Create a vcluster
vcluster create my-vcluster -n vcluster-demo

# Create another vcluster for comparison
vcluster create staging-vcluster -n vcluster-staging
```

The Control Tower will automatically detect and display these vclusters!

### Demonstrating vCluster Features

Perfect scenarios for demos:

1. **Multi-tenancy**: Show multiple vclusters running on the same host cluster
2. **Isolation**: Deploy workloads in different vclusters and show separation
3. **Resource Efficiency**: Compare resource usage between vclusters
4. **Development Workflows**: Use vclusters for dev/staging/prod environments

## API Endpoints

The backend exposes the following REST API endpoints:

- `GET /api/health` - Health check and mode status
- `GET /api/cluster` - Host cluster information
- `GET /api/vclusters` - List of discovered vclusters
- `GET /api/self` - Current pod information

## Configuration

### Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (production/development)
- `POD_NAMESPACE` - Pod namespace (auto-injected in K8s)
- `HOSTNAME` - Pod name (auto-injected in K8s)

### RBAC Permissions

The application requires read-only access to:

- Nodes, Namespaces, Pods, Services
- StatefulSets (for vcluster detection)
- Cluster version endpoint

See `k8s/rbac.yaml` for the complete ClusterRole definition.

## Development

### Project Structure

```
.
├── public/              # Frontend assets
│   ├── index.html      # Main HTML page
│   ├── styles.css      # Glassmorphism styling
│   └── app.js          # Frontend logic
├── k8s/                # Kubernetes manifests
│   ├── rbac.yaml       # ServiceAccount & permissions
│   ├── deployment.yaml # Application deployment
│   ├── service.yaml    # LoadBalancer service
│   ├── ingress.yaml    # Optional ingress
│   └── kustomization.yaml # Kustomize config
├── server.js           # Node.js backend
├── package.json        # Dependencies
├── Dockerfile.v2       # Production Docker image
└── README.md           # This file
```

### Running in Development Mode

```bash
# Install dependencies
npm install

# Run with auto-reload
npm run dev

# Access at http://localhost:3000
```

### Building Docker Image

```bash
# Build for production
docker build -f Dockerfile.v2 -t vcluster-control-tower:latest .

# Test locally
docker run -p 3000:3000 vcluster-control-tower:latest
```

## Legacy nginx Version

The original simple nginx demo is preserved in the repository:

- `Dockerfile` - Green variant (v1)
- `Dockerfile.blue` - Blue variant (v2)
- `index.html` - Green page
- `blue/index.html` - Blue page

These are still useful for basic blue-green deployment demos.

## Troubleshooting

### "Running in Demo Mode" message

This means the app cannot connect to the Kubernetes API. Possible causes:

1. **Local development**: Expected behavior when running outside Kubernetes
2. **Missing RBAC**: Ensure the ServiceAccount has correct permissions
3. **Network issues**: Check if the pod can reach the Kubernetes API server

### No vclusters detected

Possible causes:

1. **No vclusters deployed**: Deploy a vcluster using the vCluster CLI
2. **Different namespace**: The app searches all namespaces, but ensure vclusters are properly labeled
3. **RBAC issues**: Verify the ServiceAccount can list StatefulSets

### Pod crashes or restarts

Check logs:

```bash
kubectl logs -l app=vcluster-control-tower --tail=100
```

Common issues:
- Resource limits too low
- Missing environment variables
- Network connectivity problems

## Contributing

Contributions are welcome! This project is designed for educational purposes and demo scenarios.

## License

MIT License - Copyright (c) 2021 Piotr

## Credits

Built for Kubernetes and vCluster demos and presentations. Perfect for tech talks, workshops, and training sessions.

---

**Made with ❤️ for the Kubernetes community**
