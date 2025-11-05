package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync/atomic"
	"time"

	"github.com/skip2/go-qrcode"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

var (
	requestCounter atomic.Int64
	startTime      = time.Now()
	clientset      *kubernetes.Clientset
	podInfo        *PodInfo
)

type PodInfo struct {
	Name            string            `json:"name"`
	Namespace       string            `json:"namespace"`
	NodeName        string            `json:"nodeName"`
	PodIP           string            `json:"podIP"`
	HostIP          string            `json:"hostIP"`
	ServiceAccount  string            `json:"serviceAccount"`
	Labels          map[string]string `json:"labels"`
	Annotations     map[string]string `json:"annotations"`
	StartTime       time.Time         `json:"startTime"`
	ContainerImage  string            `json:"containerImage"`
	IsVCluster      bool              `json:"isVCluster"`
	VClusterName    string            `json:"vClusterName,omitempty"`
	HostClusterInfo *HostClusterInfo  `json:"hostClusterInfo,omitempty"`
}

type HostClusterInfo struct {
	NodeCount     int    `json:"nodeCount"`
	NamespaceList []string `json:"namespaceList,omitempty"`
	ClusterName   string `json:"clusterName,omitempty"`
}

type MetricsResponse struct {
	RequestCount  int64     `json:"requestCount"`
	Uptime        string    `json:"uptime"`
	PodInfo       *PodInfo  `json:"podInfo"`
	CurrentTime   time.Time `json:"currentTime"`
	Version       string    `json:"version"`
}

func main() {
	// Initialize Kubernetes client
	config, err := rest.InClusterConfig()
	if err != nil {
		log.Printf("Warning: Not running in cluster, some features will be limited: %v", err)
	} else {
		clientset, err = kubernetes.NewForConfig(config)
		if err != nil {
			log.Printf("Warning: Could not create K8s client: %v", err)
		} else {
			// Fetch pod information
			podInfo = fetchPodInfo()
		}
	}

	// Setup HTTP routes
	http.HandleFunc("/", handleIndex)
	http.HandleFunc("/api/metrics", handleMetrics)
	http.HandleFunc("/api/qrcode", handleQRCode)
	http.HandleFunc("/health", handleHealth)

	// Start server
	port := getEnv("PORT", "8080")
	log.Printf("🚀 K8s Pod Inspector starting on port %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}

func fetchPodInfo() *PodInfo {
	ctx := context.Background()

	info := &PodInfo{
		Name:           getEnv("HOSTNAME", "unknown"),
		Namespace:      getEnv("POD_NAMESPACE", "default"),
		NodeName:       getEnv("NODE_NAME", "unknown"),
		PodIP:          getEnv("POD_IP", "unknown"),
		HostIP:         getEnv("HOST_IP", "unknown"),
		ServiceAccount: getEnv("SERVICE_ACCOUNT", "default"),
		Labels:         make(map[string]string),
		Annotations:    make(map[string]string),
	}

	// Try to fetch detailed pod info from K8s API
	if clientset != nil {
		pod, err := clientset.CoreV1().Pods(info.Namespace).Get(ctx, info.Name, metav1.GetOptions{})
		if err == nil {
			info.Labels = pod.Labels
			info.Annotations = pod.Annotations
			info.StartTime = pod.Status.StartTime.Time
			if len(pod.Spec.Containers) > 0 {
				info.ContainerImage = pod.Spec.Containers[0].Image
			}

			// Detect vCluster
			info.IsVCluster = detectVCluster(pod.Annotations, pod.Labels)
			if info.IsVCluster {
				info.VClusterName = extractVClusterName(pod.Annotations, pod.Labels)
			}
		}

		// Try to get host cluster info
		nodes, err := clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
		if err == nil {
			info.HostClusterInfo = &HostClusterInfo{
				NodeCount: len(nodes.Items),
			}

			// Get namespace list (limited to first 10 for display)
			namespaces, err := clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{Limit: 10})
			if err == nil {
				nsList := make([]string, 0, len(namespaces.Items))
				for _, ns := range namespaces.Items {
					nsList = append(nsList, ns.Name)
				}
				info.HostClusterInfo.NamespaceList = nsList
			}
		}
	}

	return info
}

func detectVCluster(annotations, labels map[string]string) bool {
	// Check for vCluster indicators
	if _, ok := annotations["vcluster.loft.sh/managed-by"]; ok {
		return true
	}
	if _, ok := labels["vcluster.loft.sh/managed-by"]; ok {
		return true
	}
	if _, ok := labels["vcluster.loft.sh/namespace"]; ok {
		return true
	}
	return false
}

func extractVClusterName(annotations, labels map[string]string) string {
	if name, ok := labels["vcluster.loft.sh/managed-by"]; ok {
		return name
	}
	if name, ok := annotations["vcluster.loft.sh/managed-by"]; ok {
		return name
	}
	if name, ok := labels["vcluster.loft.sh/namespace"]; ok {
		return name
	}
	return "unknown-vcluster"
}

func handleIndex(w http.ResponseWriter, r *http.Request) {
	requestCounter.Add(1)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprint(w, indexHTML)
}

func handleMetrics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	uptime := time.Since(startTime)

	response := MetricsResponse{
		RequestCount: requestCounter.Load(),
		Uptime:       formatDuration(uptime),
		PodInfo:      podInfo,
		CurrentTime:  time.Now(),
		Version:      getEnv("APP_VERSION", "v1.0.0"),
	}

	json.NewEncoder(w).Encode(response)
}

func handleQRCode(w http.ResponseWriter, r *http.Request) {
	// Generate QR code with the service URL
	url := r.URL.Query().Get("url")
	if url == "" {
		// Default to current host
		scheme := "http"
		if r.TLS != nil {
			scheme = "https"
		}
		url = fmt.Sprintf("%s://%s", scheme, r.Host)
	}

	png, err := qrcode.Encode(url, qrcode.Medium, 256)
	if err != nil {
		http.Error(w, "Failed to generate QR code", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "image/png")
	w.Write(png)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, "OK")
}

func formatDuration(d time.Duration) string {
	days := int(d.Hours() / 24)
	hours := int(d.Hours()) % 24
	minutes := int(d.Minutes()) % 60
	seconds := int(d.Seconds()) % 60

	if days > 0 {
		return fmt.Sprintf("%dd %dh %dm", days, hours, minutes)
	} else if hours > 0 {
		return fmt.Sprintf("%dh %dm %ds", hours, minutes, seconds)
	} else if minutes > 0 {
		return fmt.Sprintf("%dm %ds", minutes, seconds)
	}
	return fmt.Sprintf("%ds", seconds)
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
