const express = require('express');
const compression = require('compression');
const k8s = require('kubernetes-client');
const { Client, KubeConfig } = k8s;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(compression());
app.use(express.json());
app.use(express.static('public'));

// Initialize Kubernetes client
let k8sClient;
let k8sApi;
let k8sAppsApi;
let k8sCore;

try {
  const kubeconfig = new KubeConfig();

  // Try in-cluster config first, fallback to default config
  if (process.env.KUBERNETES_SERVICE_HOST) {
    kubeconfig.loadFromCluster();
  } else {
    kubeconfig.loadFromDefault();
  }

  k8sClient = new Client({ config: kubeconfig });
  k8sCore = k8sClient.api.v1;
  k8sAppsApi = k8sClient.apis.apps.v1;

  console.log('✅ Kubernetes client initialized successfully');
} catch (error) {
  console.error('⚠️  Failed to initialize Kubernetes client:', error.message);
  console.log('🔧 Running in demo mode - returning mock data');
}

// Helper function to safely call K8s API
async function safeK8sCall(apiCall, mockData) {
  if (!k8sClient) {
    return mockData;
  }
  try {
    return await apiCall();
  } catch (error) {
    console.error('K8s API call failed:', error.message);
    return mockData;
  }
}

// API: Get cluster information
app.get('/api/cluster', async (req, res) => {
  try {
    const clusterInfo = await safeK8sCall(
      async () => {
        const [nodesRes, namespacesRes, podsRes, version] = await Promise.all([
          k8sCore.nodes.get(),
          k8sCore.namespaces.get(),
          k8sCore.pods.get(),
          k8sClient.backend.request({ method: 'GET', pathname: '/version' })
        ]);

        const nodes = nodesRes.body.items || [];
        const namespaces = namespacesRes.body.items || [];
        const pods = podsRes.body.items || [];

        return {
          version: version.body.gitVersion || 'unknown',
          nodes: {
            total: nodes.length,
            ready: nodes.filter(n =>
              n.status.conditions?.some(c => c.type === 'Ready' && c.status === 'True')
            ).length
          },
          namespaces: namespaces.length,
          pods: {
            total: pods.length,
            running: pods.filter(p => p.status.phase === 'Running').length,
            pending: pods.filter(p => p.status.phase === 'Pending').length,
            failed: pods.filter(p => p.status.phase === 'Failed').length
          },
          timestamp: new Date().toISOString()
        };
      },
      {
        version: 'v1.28.0 (demo mode)',
        nodes: { total: 3, ready: 3 },
        namespaces: 12,
        pods: { total: 45, running: 42, pending: 2, failed: 1 },
        timestamp: new Date().toISOString()
      }
    );

    res.json(clusterInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Discover vClusters
app.get('/api/vclusters', async (req, res) => {
  try {
    const vclusters = await safeK8sCall(
      async () => {
        // vClusters are typically StatefulSets with specific labels
        const statefulSetsRes = await k8sAppsApi.statefulsets.get();
        const statefulSets = statefulSetsRes.body.items || [];

        // Find StatefulSets that look like vClusters
        const vclusterSts = statefulSets.filter(sts =>
          sts.metadata.labels?.app === 'vcluster' ||
          sts.metadata.name?.includes('vcluster') ||
          sts.metadata.labels?.['app.kubernetes.io/name'] === 'vcluster'
        );

        // Get more details for each vcluster
        const vclusterDetails = await Promise.all(
          vclusterSts.map(async (sts) => {
            const namespace = sts.metadata.namespace;
            const name = sts.metadata.name;

            // Try to get the vcluster service
            let serviceEndpoint = null;
            try {
              const servicesRes = await k8sCore.namespaces(namespace).services.get();
              const vclusterService = servicesRes.body.items.find(svc =>
                svc.metadata.name === name || svc.metadata.name.includes(name)
              );
              if (vclusterService) {
                const port = vclusterService.spec.ports?.[0]?.port || 443;
                serviceEndpoint = `${vclusterService.metadata.name}.${namespace}.svc:${port}`;
              }
            } catch (e) {
              console.log('Could not fetch service for vcluster:', name);
            }

            // Get pods in the vcluster namespace
            let workloads = 0;
            try {
              const podsRes = await k8sCore.namespaces(namespace).pods.get();
              workloads = podsRes.body.items.length;
            } catch (e) {
              console.log('Could not fetch pods for vcluster:', name);
            }

            const readyReplicas = sts.status.readyReplicas || 0;
            const desiredReplicas = sts.spec.replicas || 0;
            const isHealthy = readyReplicas === desiredReplicas && desiredReplicas > 0;

            return {
              name: name,
              namespace: namespace,
              status: isHealthy ? 'Running' : 'Degraded',
              age: calculateAge(sts.metadata.creationTimestamp),
              replicas: {
                ready: readyReplicas,
                desired: desiredReplicas
              },
              endpoint: serviceEndpoint,
              workloads: workloads,
              version: sts.metadata.labels?.['chart-version'] || 'unknown',
              healthy: isHealthy
            };
          })
        );

        return vclusterDetails;
      },
      [
        {
          name: 'vcluster-dev',
          namespace: 'vcluster-dev',
          status: 'Running',
          age: '2d',
          replicas: { ready: 1, desired: 1 },
          endpoint: 'vcluster-dev.vcluster-dev.svc:443',
          workloads: 8,
          version: '0.19.0',
          healthy: true
        },
        {
          name: 'vcluster-staging',
          namespace: 'vcluster-staging',
          status: 'Running',
          age: '5d',
          replicas: { ready: 1, desired: 1 },
          endpoint: 'vcluster-staging.vcluster-staging.svc:443',
          workloads: 15,
          version: '0.19.0',
          healthy: true
        }
      ]
    );

    res.json(vclusters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Get self (current pod) information
app.get('/api/self', async (req, res) => {
  try {
    const selfInfo = await safeK8sCall(
      async () => {
        const podName = process.env.HOSTNAME;
        const namespace = process.env.POD_NAMESPACE || 'default';

        if (!podName) {
          throw new Error('Pod name not available');
        }

        const podRes = await k8sCore.namespaces(namespace).pods(podName).get();
        const pod = podRes.body;

        const nodeRes = await k8sCore.nodes(pod.spec.nodeName).get();
        const node = nodeRes.body;

        return {
          pod: {
            name: pod.metadata.name,
            namespace: pod.metadata.namespace,
            ip: pod.status.podIP,
            node: pod.spec.nodeName,
            serviceAccount: pod.spec.serviceAccountName,
            labels: pod.metadata.labels || {},
            annotations: Object.keys(pod.metadata.annotations || {}).length,
            containers: pod.spec.containers.length,
            phase: pod.status.phase,
            startTime: pod.status.startTime
          },
          node: {
            name: node.metadata.name,
            os: node.status.nodeInfo.osImage,
            kernel: node.status.nodeInfo.kernelVersion,
            kubeletVersion: node.status.nodeInfo.kubeletVersion,
            containerRuntime: node.status.nodeInfo.containerRuntimeVersion,
            architecture: node.status.nodeInfo.architecture
          },
          environment: {
            kubernetesHost: process.env.KUBERNETES_SERVICE_HOST || 'N/A',
            kubernetesPort: process.env.KUBERNETES_SERVICE_PORT || 'N/A'
          }
        };
      },
      {
        pod: {
          name: process.env.HOSTNAME || 'demo-pod-12345',
          namespace: 'default',
          ip: '10.244.0.5',
          node: 'demo-node-1',
          serviceAccount: 'vcluster-control-tower',
          labels: { app: 'vcluster-control-tower', version: 'v2' },
          annotations: 3,
          containers: 1,
          phase: 'Running',
          startTime: new Date(Date.now() - 3600000).toISOString()
        },
        node: {
          name: 'demo-node-1',
          os: 'Ubuntu 22.04.3 LTS',
          kernel: '5.15.0-87-generic',
          kubeletVersion: 'v1.28.0',
          containerRuntime: 'containerd://1.7.2',
          architecture: 'amd64'
        },
        environment: {
          kubernetesHost: '10.96.0.1',
          kubernetesPort: '443'
        }
      }
    );

    res.json(selfInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    mode: k8sClient ? 'kubernetes' : 'demo',
    timestamp: new Date().toISOString()
  });
});

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Helper: Calculate age from timestamp
function calculateAge(timestamp) {
  const now = new Date();
  const created = new Date(timestamp);
  const diffMs = now - created;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays > 0) return `${diffDays}d`;
  if (diffHours > 0) return `${diffHours}h`;
  if (diffMins > 0) return `${diffMins}m`;
  return 'just now';
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 vCluster Control Tower running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔧 Mode: ${k8sClient ? 'Kubernetes' : 'Demo'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});
