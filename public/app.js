// State management
const state = {
    cluster: null,
    vclusters: [],
    self: null,
    isDemo: false,
    lastUpdate: null
};

// API base URL
const API_BASE = window.location.origin;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 vCluster Control Tower initializing...');

    // Set up refresh buttons
    document.getElementById('refreshCluster').addEventListener('click', () => fetchClusterInfo());
    document.getElementById('refreshVclusters').addEventListener('click', () => fetchVclusters());
    document.getElementById('refreshSelf').addEventListener('click', () => fetchSelfInfo());

    // Initial data fetch
    fetchAllData();

    // Auto-refresh every 30 seconds
    setInterval(fetchAllData, 30000);
});

// Fetch all data
async function fetchAllData() {
    await Promise.all([
        checkHealth(),
        fetchClusterInfo(),
        fetchVclusters(),
        fetchSelfInfo()
    ]);
    updateLastUpdateTime();
}

// Check API health
async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE}/api/health`);
        const data = await response.json();

        state.isDemo = data.mode === 'demo';

        updateConnectionStatus(true);
        updateDemoNotice(state.isDemo);

        console.log(`✅ Connected (${data.mode} mode)`);
    } catch (error) {
        console.error('❌ Health check failed:', error);
        updateConnectionStatus(false);
    }
}

// Fetch cluster information
async function fetchClusterInfo() {
    const button = document.getElementById('refreshCluster');
    button.classList.add('spinning');

    try {
        const response = await fetch(`${API_BASE}/api/cluster`);
        const data = await response.json();

        state.cluster = data;
        renderClusterInfo(data);

        console.log('📊 Cluster info updated');
    } catch (error) {
        console.error('❌ Failed to fetch cluster info:', error);
        renderError('clusterGrid', 'Failed to load cluster information');
    } finally {
        button.classList.remove('spinning');
    }
}

// Fetch vclusters
async function fetchVclusters() {
    const button = document.getElementById('refreshVclusters');
    button.classList.add('spinning');

    try {
        const response = await fetch(`${API_BASE}/api/vclusters`);
        const data = await response.json();

        state.vclusters = data;
        renderVclusters(data);

        console.log(`🎪 Found ${data.length} vcluster(s)`);
    } catch (error) {
        console.error('❌ Failed to fetch vclusters:', error);
        renderError('vclusterGrid', 'Failed to load vclusters');
    } finally {
        button.classList.remove('spinning');
    }
}

// Fetch self information
async function fetchSelfInfo() {
    const button = document.getElementById('refreshSelf');
    button.classList.add('spinning');

    try {
        const response = await fetch(`${API_BASE}/api/self`);
        const data = await response.json();

        state.self = data;
        renderSelfInfo(data);

        console.log('🔍 Self info updated');
    } catch (error) {
        console.error('❌ Failed to fetch self info:', error);
        renderError('selfGrid', 'Failed to load pod information');
    } finally {
        button.classList.remove('spinning');
    }
}

// Render cluster information
function renderClusterInfo(data) {
    const grid = document.getElementById('clusterGrid');

    grid.innerHTML = `
        <div class="stat-card fade-in">
            <div class="stat-label">Kubernetes Version</div>
            <div class="stat-value">${formatVersion(data.version)}</div>
            <div class="stat-subtext">API Server</div>
        </div>

        <div class="stat-card fade-in" style="animation-delay: 0.1s">
            <div class="stat-label">Nodes</div>
            <div class="stat-value">${data.nodes.ready}/${data.nodes.total}</div>
            <div class="stat-subtext">${data.nodes.ready === data.nodes.total ? 'All Ready' : 'Some Not Ready'}</div>
        </div>

        <div class="stat-card fade-in" style="animation-delay: 0.2s">
            <div class="stat-label">Namespaces</div>
            <div class="stat-value">${data.namespaces}</div>
            <div class="stat-subtext">Total Count</div>
        </div>

        <div class="stat-card fade-in" style="animation-delay: 0.3s">
            <div class="stat-label">Pods</div>
            <div class="stat-value">${data.pods.running}/${data.pods.total}</div>
            <div class="stat-subtext">
                ${data.pods.pending > 0 ? `${data.pods.pending} Pending` : ''}
                ${data.pods.failed > 0 ? `${data.pods.failed} Failed` : ''}
                ${data.pods.pending === 0 && data.pods.failed === 0 ? 'All Running' : ''}
            </div>
        </div>
    `;
}

// Render vclusters
function renderVclusters(vclusters) {
    const grid = document.getElementById('vclusterGrid');

    if (vclusters.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="3" width="20" height="14" rx="2"/>
                    <path d="M8 21h8"/>
                    <path d="M12 17v4"/>
                </svg>
                <p>No vclusters found</p>
                <p style="font-size: 0.875rem; margin-top: 0.5rem;">
                    ${state.isDemo ? 'Deploy to Kubernetes to see real vclusters' : 'Deploy a vcluster to see it here'}
                </p>
            </div>
        `;
        return;
    }

    grid.innerHTML = vclusters.map((vc, index) => `
        <div class="vcluster-card ${vc.healthy ? '' : 'degraded'} fade-in" style="animation-delay: ${index * 0.1}s">
            <div class="vcluster-header">
                <div>
                    <div class="vcluster-name">${vc.name}</div>
                    <div class="vcluster-namespace">📦 ${vc.namespace}</div>
                </div>
                <div class="vcluster-status ${vc.status.toLowerCase()}">${vc.status}</div>
            </div>

            <div class="vcluster-meta">
                <div class="meta-item">
                    <div class="meta-label">Age</div>
                    <div class="meta-value">⏱️ ${vc.age}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Replicas</div>
                    <div class="meta-value">📊 ${vc.replicas.ready}/${vc.replicas.desired}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Workloads</div>
                    <div class="meta-value">🚀 ${vc.workloads}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Version</div>
                    <div class="meta-value">📌 ${vc.version}</div>
                </div>
            </div>

            ${vc.endpoint ? `
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--glass-border);">
                    <div class="meta-label">Endpoint</div>
                    <div class="meta-value" style="font-size: 0.75rem; word-break: break-all;">🔗 ${vc.endpoint}</div>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Render self information
function renderSelfInfo(data) {
    const grid = document.getElementById('selfGrid');

    grid.innerHTML = `
        <div class="info-card fade-in">
            <div class="info-title">🎯 Pod Identity</div>
            <div class="info-content">
                <div class="info-row">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${data.pod.name}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Namespace:</span>
                    <span class="info-value">${data.pod.namespace}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">IP Address:</span>
                    <span class="info-value">${data.pod.ip}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Phase:</span>
                    <span class="info-value">${data.pod.phase}</span>
                </div>
            </div>
        </div>

        <div class="info-card fade-in" style="animation-delay: 0.1s">
            <div class="info-title">🖥️ Node Info</div>
            <div class="info-content">
                <div class="info-row">
                    <span class="info-label">Node:</span>
                    <span class="info-value">${data.pod.node}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">OS:</span>
                    <span class="info-value">${truncate(data.node.os, 25)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Arch:</span>
                    <span class="info-value">${data.node.architecture}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Runtime:</span>
                    <span class="info-value">${truncate(data.node.containerRuntime, 20)}</span>
                </div>
            </div>
        </div>

        <div class="info-card fade-in" style="animation-delay: 0.2s">
            <div class="info-title">⚙️ Configuration</div>
            <div class="info-content">
                <div class="info-row">
                    <span class="info-label">Service Account:</span>
                    <span class="info-value">${truncate(data.pod.serviceAccount, 20)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Containers:</span>
                    <span class="info-value">${data.pod.containers}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Labels:</span>
                    <span class="info-value">${Object.keys(data.pod.labels).length}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Annotations:</span>
                    <span class="info-value">${data.pod.annotations}</span>
                </div>
            </div>
        </div>

        <div class="info-card fade-in" style="animation-delay: 0.3s">
            <div class="info-title">🔌 K8s API</div>
            <div class="info-content">
                <div class="info-row">
                    <span class="info-label">API Host:</span>
                    <span class="info-value">${data.environment.kubernetesHost}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">API Port:</span>
                    <span class="info-value">${data.environment.kubernetesPort}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Kubelet:</span>
                    <span class="info-value">${data.node.kubeletVersion}</span>
                </div>
            </div>
        </div>
    `;
}

// Update connection status
function updateConnectionStatus(connected) {
    const badge = document.getElementById('connectionStatus');
    badge.className = `status-badge ${connected ? 'connected' : 'error'}`;
    badge.innerHTML = `
        <span class="status-dot"></span>
        <span class="status-text">${connected ? 'Connected' : 'Disconnected'}</span>
    `;
}

// Update demo notice
function updateDemoNotice(isDemo) {
    const notice = document.getElementById('demoNotice');
    notice.style.display = isDemo ? 'block' : 'none';
}

// Update last update time
function updateLastUpdateTime() {
    state.lastUpdate = new Date();
    document.getElementById('lastUpdate').textContent = formatTime(state.lastUpdate);
}

// Render error state
function renderError(elementId, message) {
    const element = document.getElementById(elementId);
    element.innerHTML = `
        <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p style="color: var(--danger);">${message}</p>
        </div>
    `;
}

// Utility: Format version
function formatVersion(version) {
    return version.replace('v', '').split(' ')[0];
}

// Utility: Format time
function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Utility: Truncate string
function truncate(str, length) {
    if (str.length <= length) return str;
    return str.substring(0, length) + '...';
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// Log initial state
console.log('✨ vCluster Control Tower ready');
