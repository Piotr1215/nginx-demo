#!/bin/bash

# Quick Demo Script for K8s Pod Inspector
# This script sets up a complete demo environment

set -e

COLOR_GREEN='\033[0;32m'
COLOR_BLUE='\033[0;34m'
COLOR_YELLOW='\033[1;33m'
COLOR_RED='\033[0;31m'
COLOR_RESET='\033[0m'

echo -e "${COLOR_BLUE}"
cat << "EOF"
╔═══════════════════════════════════════╗
║   K8s Pod Inspector - Quick Demo     ║
╚═══════════════════════════════════════╝
EOF
echo -e "${COLOR_RESET}"

# Check prerequisites
command -v kubectl >/dev/null 2>&1 || { echo -e "${COLOR_RED}Error: kubectl is required but not installed.${COLOR_RESET}" >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${COLOR_RED}Error: docker is required but not installed.${COLOR_RESET}" >&2; exit 1; }

# Menu
echo -e "${COLOR_YELLOW}Select demo scenario:${COLOR_RESET}"
echo "1) Standard Deployment (3 replicas)"
echo "2) Blue-Green Deployment"
echo "3) VCluster Demo (requires vcluster CLI)"
echo "4) Scaling Demo (1 -> 10 replicas)"
echo "5) Clean up everything"
echo ""
read -p "Enter choice [1-5]: " choice

case $choice in
  1)
    echo -e "${COLOR_GREEN}🚀 Deploying standard setup...${COLOR_RESET}"
    kubectl apply -f k8s/deployment.yaml

    echo -e "${COLOR_GREEN}⏳ Waiting for pods to be ready...${COLOR_RESET}"
    kubectl wait --for=condition=ready pod -l app=pod-inspector -n pod-inspector --timeout=120s

    echo -e "${COLOR_GREEN}📊 Current status:${COLOR_RESET}"
    kubectl get all -n pod-inspector

    echo ""
    echo -e "${COLOR_YELLOW}🌐 To access the application:${COLOR_RESET}"
    echo "  kubectl port-forward -n pod-inspector svc/pod-inspector 8080:80"
    echo "  Then open: http://localhost:8080"
    echo ""

    read -p "Start port-forward now? [y/N]: " pf
    if [[ $pf =~ ^[Yy]$ ]]; then
      echo -e "${COLOR_GREEN}🔗 Port forwarding to localhost:8080...${COLOR_RESET}"
      echo -e "${COLOR_YELLOW}Press Ctrl+C to stop${COLOR_RESET}"
      kubectl port-forward -n pod-inspector svc/pod-inspector 8080:80
    fi
    ;;

  2)
    echo -e "${COLOR_GREEN}🚀 Deploying blue-green setup...${COLOR_RESET}"
    kubectl apply -f k8s/blue-green-demo.yaml

    echo -e "${COLOR_GREEN}⏳ Waiting for pods to be ready...${COLOR_RESET}"
    kubectl wait --for=condition=ready pod -l app=pod-inspector -n pod-inspector --timeout=120s

    echo -e "${COLOR_GREEN}📊 Both versions deployed:${COLOR_RESET}"
    kubectl get pods -n pod-inspector -l version=green
    kubectl get pods -n pod-inspector -l version=blue

    echo ""
    echo -e "${COLOR_YELLOW}Current traffic goes to: GREEN${COLOR_RESET}"
    echo ""
    echo "To switch to BLUE:"
    echo "  kubectl patch svc pod-inspector-bg -n pod-inspector -p '{\"spec\":{\"selector\":{\"version\":\"blue\"}}}'"
    echo ""
    echo "To switch back to GREEN:"
    echo "  kubectl patch svc pod-inspector-bg -n pod-inspector -p '{\"spec\":{\"selector\":{\"version\":\"green\"}}}'"
    echo ""

    read -p "Start port-forward now? [y/N]: " pf
    if [[ $pf =~ ^[Yy]$ ]]; then
      kubectl port-forward -n pod-inspector svc/pod-inspector-bg 8080:80
    fi
    ;;

  3)
    command -v vcluster >/dev/null 2>&1 || {
      echo -e "${COLOR_RED}Error: vcluster CLI is required.${COLOR_RESET}"
      echo "Install: curl -s https://get.vcluster.com | bash"
      exit 1
    }

    echo -e "${COLOR_GREEN}🎭 Creating vCluster...${COLOR_RESET}"
    vcluster create demo-vcluster -n vcluster-demo --expose

    echo -e "${COLOR_GREEN}🚀 Deploying to vCluster...${COLOR_RESET}"
    kubectl apply -f k8s/vcluster-demo.yaml

    echo -e "${COLOR_GREEN}⏳ Waiting for pods...${COLOR_RESET}"
    kubectl wait --for=condition=ready pod -l app=pod-inspector --timeout=120s

    echo -e "${COLOR_GREEN}✅ VCluster demo ready!${COLOR_RESET}"
    echo ""
    echo -e "${COLOR_YELLOW}You are now connected to the VIRTUAL cluster${COLOR_RESET}"
    echo "Notice the vCluster badge in the UI!"
    echo ""
    echo "To disconnect and return to host cluster:"
    echo "  vcluster disconnect"
    echo ""

    kubectl port-forward svc/pod-inspector 8081:80
    ;;

  4)
    echo -e "${COLOR_GREEN}🚀 Starting scaling demo...${COLOR_RESET}"
    kubectl apply -f k8s/deployment.yaml

    echo -e "${COLOR_GREEN}📉 Scaling to 1 replica...${COLOR_RESET}"
    kubectl scale deployment pod-inspector -n pod-inspector --replicas=1
    sleep 3

    echo -e "${COLOR_GREEN}Current pod:${COLOR_RESET}"
    kubectl get pods -n pod-inspector

    echo ""
    read -p "Press Enter to scale to 10 replicas..."
    echo ""

    echo -e "${COLOR_GREEN}📈 Scaling to 10 replicas...${COLOR_RESET}"
    kubectl scale deployment pod-inspector -n pod-inspector --replicas=10

    echo -e "${COLOR_GREEN}⏳ Watching pods scale up...${COLOR_RESET}"
    kubectl get pods -n pod-inspector -w &
    WATCH_PID=$!

    sleep 10
    kill $WATCH_PID 2>/dev/null || true

    echo ""
    echo -e "${COLOR_GREEN}✅ Scaling complete!${COLOR_RESET}"
    kubectl get pods -n pod-inspector

    echo ""
    read -p "Start port-forward? [y/N]: " pf
    if [[ $pf =~ ^[Yy]$ ]]; then
      kubectl port-forward -n pod-inspector svc/pod-inspector 8080:80
    fi
    ;;

  5)
    echo -e "${COLOR_YELLOW}🧹 Cleaning up all deployments...${COLOR_RESET}"

    kubectl delete -f k8s/deployment.yaml --ignore-not-found=true
    kubectl delete -f k8s/blue-green-demo.yaml --ignore-not-found=true
    kubectl delete -f k8s/vcluster-demo.yaml --ignore-not-found=true

    read -p "Delete vCluster? [y/N]: " vc
    if [[ $vc =~ ^[Yy]$ ]]; then
      vcluster delete demo-vcluster -n vcluster-demo 2>/dev/null || true
    fi

    echo -e "${COLOR_GREEN}✅ Cleanup complete!${COLOR_RESET}"
    ;;

  *)
    echo -e "${COLOR_RED}Invalid choice${COLOR_RESET}"
    exit 1
    ;;
esac

echo ""
echo -e "${COLOR_BLUE}Demo setup complete! 🎉${COLOR_RESET}"
