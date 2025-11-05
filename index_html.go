package main

const indexHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>K8s Pod Inspector</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        .gradient-bg {
            background: linear-gradient(-45deg, #667eea, #764ba2, #f093fb, #4facfe);
            background-size: 400% 400%;
            animation: gradient 15s ease infinite;
        }

        .glass {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .pulse-dot {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .5; }
        }

        .badge {
            display: inline-flex;
            align-items: center;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            margin: 0.25rem;
        }

        .vcluster-badge {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .host-badge {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .fade-in {
            animation: fadeIn 0.5s ease-out;
        }
    </style>
</head>
<body class="gradient-bg min-h-screen text-white font-sans">
    <div class="container mx-auto px-4 py-8 max-w-6xl">
        <!-- Header -->
        <div class="text-center mb-8 fade-in">
            <h1 class="text-5xl font-bold mb-2">🔍 K8s Pod Inspector</h1>
            <p class="text-xl opacity-90">Live Kubernetes Cluster Introspection</p>
        </div>

        <!-- Main Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Pod Identity Card -->
            <div class="lg:col-span-2 glass rounded-2xl p-6 fade-in">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-2xl font-bold flex items-center">
                        <span class="w-3 h-3 bg-green-400 rounded-full mr-3 pulse-dot"></span>
                        Pod Identity
                    </h2>
                    <div id="vcluster-indicator"></div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-white bg-opacity-10 rounded-lg p-4">
                        <div class="text-sm opacity-75 mb-1">Pod Name</div>
                        <div class="font-mono text-lg font-semibold" id="pod-name">Loading...</div>
                    </div>
                    <div class="bg-white bg-opacity-10 rounded-lg p-4">
                        <div class="text-sm opacity-75 mb-1">Namespace</div>
                        <div class="font-mono text-lg font-semibold" id="namespace">Loading...</div>
                    </div>
                    <div class="bg-white bg-opacity-10 rounded-lg p-4">
                        <div class="text-sm opacity-75 mb-1">Node</div>
                        <div class="font-mono text-lg font-semibold" id="node-name">Loading...</div>
                    </div>
                    <div class="bg-white bg-opacity-10 rounded-lg p-4">
                        <div class="text-sm opacity-75 mb-1">Pod IP</div>
                        <div class="font-mono text-lg font-semibold" id="pod-ip">Loading...</div>
                    </div>
                    <div class="bg-white bg-opacity-10 rounded-lg p-4 md:col-span-2">
                        <div class="text-sm opacity-75 mb-1">Container Image</div>
                        <div class="font-mono text-sm font-semibold break-all" id="container-image">Loading...</div>
                    </div>
                </div>

                <!-- Labels Section -->
                <div class="mt-6">
                    <h3 class="text-lg font-semibold mb-3">🏷️ Labels</h3>
                    <div id="labels" class="flex flex-wrap"></div>
                </div>
            </div>

            <!-- Metrics & QR Code -->
            <div class="space-y-6">
                <!-- Metrics Card -->
                <div class="glass rounded-2xl p-6 fade-in">
                    <h2 class="text-2xl font-bold mb-4">📊 Live Metrics</h2>

                    <div class="space-y-4">
                        <div class="bg-white bg-opacity-10 rounded-lg p-4">
                            <div class="text-sm opacity-75 mb-1">Requests</div>
                            <div class="text-3xl font-bold" id="request-count">0</div>
                        </div>

                        <div class="bg-white bg-opacity-10 rounded-lg p-4">
                            <div class="text-sm opacity-75 mb-1">Uptime</div>
                            <div class="text-2xl font-bold font-mono" id="uptime">0s</div>
                        </div>

                        <div class="bg-white bg-opacity-10 rounded-lg p-4">
                            <div class="text-sm opacity-75 mb-1">Version</div>
                            <div class="text-xl font-bold" id="version">v1.0.0</div>
                        </div>
                    </div>
                </div>

                <!-- QR Code Card -->
                <div class="glass rounded-2xl p-6 fade-in">
                    <h2 class="text-xl font-bold mb-4 text-center">📱 Scan to Connect</h2>
                    <div class="bg-white rounded-xl p-4 flex justify-center">
                        <img id="qr-code" src="/api/qrcode" alt="QR Code" class="w-full max-w-xs">
                    </div>
                    <p class="text-center text-sm mt-3 opacity-75">Scan with your phone to access this pod</p>
                </div>
            </div>
        </div>

        <!-- Cluster Info -->
        <div class="glass rounded-2xl p-6 mt-6 fade-in" id="cluster-info-card">
            <h2 class="text-2xl font-bold mb-4">🌐 Cluster Information</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4" id="cluster-info">
                <div class="bg-white bg-opacity-10 rounded-lg p-4">
                    <div class="text-sm opacity-75 mb-1">Total Nodes</div>
                    <div class="text-3xl font-bold" id="node-count">-</div>
                </div>
                <div class="bg-white bg-opacity-10 rounded-lg p-4 md:col-span-2">
                    <div class="text-sm opacity-75 mb-1">Visible Namespaces</div>
                    <div class="flex flex-wrap mt-2" id="namespaces"></div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="text-center mt-8 opacity-75">
            <p class="text-sm">Refreshing every 2 seconds • <span id="current-time"></span></p>
        </div>
    </div>

    <script>
        let metricsData = null;

        async function fetchMetrics() {
            try {
                const response = await fetch('/api/metrics');
                metricsData = await response.json();
                updateUI();
            } catch (error) {
                console.error('Failed to fetch metrics:', error);
            }
        }

        function updateUI() {
            if (!metricsData) return;

            // Update metrics
            document.getElementById('request-count').textContent = metricsData.requestCount.toLocaleString();
            document.getElementById('uptime').textContent = metricsData.uptime;
            document.getElementById('version').textContent = metricsData.version;
            document.getElementById('current-time').textContent = new Date(metricsData.currentTime).toLocaleTimeString();

            // Update pod info if available
            if (metricsData.podInfo) {
                const pod = metricsData.podInfo;

                document.getElementById('pod-name').textContent = pod.name || 'N/A';
                document.getElementById('namespace').textContent = pod.namespace || 'N/A';
                document.getElementById('node-name').textContent = pod.nodeName || 'N/A';
                document.getElementById('pod-ip').textContent = pod.podIP || 'N/A';
                document.getElementById('container-image').textContent = pod.containerImage || 'N/A';

                // VCluster indicator
                const vclusterIndicator = document.getElementById('vcluster-indicator');
                if (pod.isVCluster) {
                    vclusterIndicator.innerHTML = '<span class="badge vcluster-badge">🎭 vCluster: ' + (pod.vClusterName || 'detected') + '</span>';
                } else {
                    vclusterIndicator.innerHTML = '<span class="badge host-badge">🏠 Host Cluster</span>';
                }

                // Update labels
                const labelsContainer = document.getElementById('labels');
                labelsContainer.innerHTML = '';
                if (pod.labels && Object.keys(pod.labels).length > 0) {
                    for (const [key, value] of Object.entries(pod.labels)) {
                        const badge = document.createElement('span');
                        badge.className = 'badge bg-blue-500 bg-opacity-50';
                        badge.textContent = key + '=' + value;
                        labelsContainer.appendChild(badge);
                    }
                } else {
                    labelsContainer.innerHTML = '<span class="text-sm opacity-75">No labels found</span>';
                }

                // Update cluster info
                if (pod.hostClusterInfo) {
                    const clusterInfo = pod.hostClusterInfo;
                    document.getElementById('node-count').textContent = clusterInfo.nodeCount || '-';

                    const namespacesContainer = document.getElementById('namespaces');
                    namespacesContainer.innerHTML = '';
                    if (clusterInfo.namespaceList && clusterInfo.namespaceList.length > 0) {
                        clusterInfo.namespaceList.forEach(ns => {
                            const badge = document.createElement('span');
                            badge.className = 'badge bg-purple-500 bg-opacity-50';
                            badge.textContent = ns;
                            namespacesContainer.appendChild(badge);
                        });
                    }
                }
            }
        }

        // Initial fetch
        fetchMetrics();

        // Refresh every 2 seconds
        setInterval(fetchMetrics, 2000);

        // Update QR code with current URL
        const currentUrl = window.location.href;
        document.getElementById('qr-code').src = '/api/qrcode?url=' + encodeURIComponent(currentUrl);
    </script>
</body>
</html>
`
