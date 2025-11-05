const express = require('express');
const os = require('os');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// In-memory storage for votes and stats
let stats = {
  totalVisits: 0,
  votes: {
    'yaml-indentation': 0,
    'crashloopbackoff': 0,
    'resource-limits': 0,
    'networking': 0,
    'rbac': 0,
    'storage': 0
  }
};

// Kubernetes jokes and tips
const k8sWisdom = [
  "🎭 YAML: Where spaces are more important than your feelings",
  "💡 Remember: It's not a bug, it's an undocumented feature in your PodSpec",
  "🎪 CrashLoopBackOff is just Kubernetes way of saying 'try again, but like, forever'",
  "🎯 Virtual clusters: Because one cluster's problems weren't enough",
  "🤹 kubectl apply -f life.yaml && hope-for-the-best",
  "🎨 ImagePullBackOff: The error message that launches a thousand Stack Overflow searches",
  "🎪 Pending pods are just optimistic about their future",
  "🎭 'It works on my cluster' - Famous last words",
  "💫 Kubernetes: Turning 'oops' into 'outage' since 2014",
  "🎯 StatefulSets: For when you want your problems to be persistent",
  "🎪 DaemonSets: One problem per node, guaranteed!",
  "🤖 Kubernetes: Making simple things possible and complex things inevitable"
];

// Pod personalities based on name patterns
const getPodPersonality = (podName) => {
  if (!podName) return { emoji: '🤖', mood: 'mysterious', trait: 'Unknown' };

  const hash = podName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const personalities = [
    { emoji: '😎', mood: 'cool', trait: 'The Reliable One' },
    { emoji: '🎉', mood: 'excited', trait: 'Party Leader' },
    { emoji: '🤓', mood: 'nerdy', trait: 'The Overachiever' },
    { emoji: '😴', mood: 'sleepy', trait: 'Low Energy Mode' },
    { emoji: '🚀', mood: 'energetic', trait: 'Speed Demon' },
    { emoji: '🎭', mood: 'dramatic', trait: 'Drama Queen' },
    { emoji: '🦸', mood: 'heroic', trait: 'Cluster Hero' },
    { emoji: '🤡', mood: 'silly', trait: 'The Jokester' }
  ];

  return personalities[hash % personalities.length];
};

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Get pod metadata from environment (Kubernetes Downward API)
const podInfo = {
  name: process.env.POD_NAME || os.hostname(),
  namespace: process.env.POD_NAMESPACE || 'default',
  nodeName: process.env.NODE_NAME || 'unknown',
  podIP: process.env.POD_IP || 'unknown',
  serviceAccount: process.env.SERVICE_ACCOUNT || 'default',
  startTime: new Date().toISOString()
};

// API endpoint for pod info
app.get('/api/info', (req, res) => {
  stats.totalVisits++;
  const personality = getPodPersonality(podInfo.name);
  const wisdom = k8sWisdom[Math.floor(Math.random() * k8sWisdom.length)];

  res.json({
    pod: podInfo,
    personality,
    wisdom,
    stats: {
      totalVisits: stats.totalVisits,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      hostname: os.hostname()
    }
  });
});

// API endpoint for voting
app.post('/api/vote', (req, res) => {
  const { painPoint } = req.body;

  if (stats.votes.hasOwnProperty(painPoint)) {
    stats.votes[painPoint]++;
    res.json({ success: true, votes: stats.votes });
  } else {
    res.status(400).json({ error: 'Invalid pain point' });
  }
});

// Get current votes
app.get('/api/votes', (req, res) => {
  res.json(stats.votes);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', pod: podInfo.name });
});

// Main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Vote page (for QR code)
app.get('/vote', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'vote.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎉 Pod Party started on port ${PORT}`);
  console.log(`📦 Pod: ${podInfo.name}`);
  console.log(`🏠 Namespace: ${podInfo.namespace}`);
  console.log(`🖥️  Node: ${podInfo.nodeName}`);
});
