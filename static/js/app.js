// AI-DJ System - MCP Vibe Meter JavaScript

class AIDJSystem {
    constructor() {
        this.socket = io();
        this.vibeChart = null;
        this.currentData = null;
        this.autoRefreshInterval = null;

        this.initSocketEvents();
        this.initChart();
        this.initEventListeners();
        this.startAutoRefresh();
    }

    initSocketEvents() {
        this.socket.on('connect', () => {
            console.log('Connected to AI-DJ System');
            this.updateStatus('Connected');
        });

        this.socket.on('initial_data', (data) => {
            console.log('Initial data received:', data);
            this.updateUI(data);
        });

        this.socket.on('vibe_update', (data) => {
            console.log('Vibe update received:', data);
            this.updateUI(data);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from AI-DJ System');
            this.updateStatus('Disconnected');
        });
    }

    initChart() {
        const ctx = document.getElementById('vibeChart').getContext('2d');

        this.vibeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({ length: 20 }, (_, i) => i + 1),
                datasets: [
                    {
                        label: 'Movement',
                        data: [],
                        borderColor: '#ff6b6b',
                        backgroundColor: 'rgba(255, 107, 107, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Audio',
                        data: [],
                        borderColor: '#feca57',
                        backgroundColor: 'rgba(254, 202, 87, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Crowd Energy',
                        data: [],
                        borderColor: '#48dbfb',
                        backgroundColor: 'rgba(72, 219, 251, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Overall Vibe',
                        data: [],
                        borderColor: '#1dd1a1',
                        backgroundColor: 'rgba(29, 209, 161, 0.2)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 1,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#888',
                            callback: (value) => `${Math.round(value * 100)}%`
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#888'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#aaa',
                            usePointStyle: true,
                            padding: 15
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                }
            }
        });
    }

    initEventListeners() {
        document.getElementById('refresh-data').addEventListener('click', () => {
            this.fetchData();
        });
    }

    startAutoRefresh() {
        // Auto-refresh every 5 seconds
        this.autoRefreshInterval = setInterval(() => {
            this.socket.emit('request_update');
        }, 5000);
    }

    async fetchData() {
        try {
            const response = await fetch('/api/mcp-data');
            const data = await response.json();
            this.updateUI(data);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    updateUI(data) {
        this.currentData = data;
        this.updateSessionInfo(data);
        this.updateVibeMetrics(data.vibe_metrics, data.current_stats);
        this.updateChart(data.vibe_metrics);
        this.updateTracklist(data.tracklist);
        this.updateRecommendations(data.recommendations);
        this.updateLastUpdate();
    }

    updateSessionInfo(data) {
        document.getElementById('session-id').textContent = `Session: ${data.session_id}`;
        if (data.current_stats) {
            document.getElementById('session-duration').textContent = `Duration: ${data.current_stats.session_duration}`;
        }
    }

    updateVibeMetrics(metrics, stats) {
        // Update overall vibe meter
        const overallValue = stats ? Math.round(stats.avg_crowd_energy * 100) : 0;
        const meterValue = document.querySelector('#overall-vibe .meter-value');
        meterValue.textContent = `${overallValue}%`;

        // Animate the meter circle
        const meterCircle = document.getElementById('overall-vibe');
        const hue = (overallValue / 100) * 120; // 0 = red, 120 = green
        meterCircle.style.boxShadow = `0 0 30px hsla(${hue}, 70%, 50%, 0.5)`;

        // Update stat bars
        if (metrics.movement.length > 0) {
            const movementVal = Math.round(metrics.movement[metrics.movement.length - 1] * 100);
            document.getElementById('movement-bar').style.width = `${movementVal}%`;
            document.getElementById('movement-value').textContent = `${movementVal}%`;
        }

        if (metrics.audio.length > 0) {
            const audioVal = Math.round(metrics.audio[metrics.audio.length - 1] * 100);
            document.getElementById('audio-bar').style.width = `${audioVal}%`;
            document.getElementById('audio-value').textContent = `${audioVal}%`;
        }

        if (metrics.crowd_energy.length > 0) {
            const energyVal = Math.round(metrics.crowd_energy[metrics.crowd_energy.length - 1] * 100);
            document.getElementById('energy-bar').style.width = `${energyVal}%`;
            document.getElementById('energy-value').textContent = `${energyVal}%`;
        }
    }

    updateChart(metrics) {
        this.vibeChart.data.datasets[0].data = metrics.movement;
        this.vibeChart.data.datasets[1].data = metrics.audio;
        this.vibeChart.data.datasets[2].data = metrics.crowd_energy;
        this.vibeChart.data.datasets[3].data = metrics.overall;
        this.vibeChart.update('none'); // Update without animation for smoother transitions
    }

    updateTracklist(tracks) {
        const tracklistContainer = document.getElementById('tracklist');
        tracklistContainer.innerHTML = '';

        tracks.forEach((track, index) => {
            const trackElement = document.createElement('div');
            trackElement.className = `track-item ${track.status}`;

            trackElement.innerHTML = `
                <div class="track-number">${index + 1}</div>
                <div class="track-info">
                    <div class="track-title">${track.title}</div>
                    <div class="track-artist">${track.artist}</div>
                </div>
                <div class="track-stats">
                    <span>BPM: ${track.bpm}</span>
                    <span>Energy: ${Math.round(track.energy * 100)}%</span>
                    <span>Valence: ${Math.round(track.valence * 100)}%</span>
                </div>
                <div class="track-status">${this.getStatusText(track.status)}</div>
            `;

            tracklistContainer.appendChild(trackElement);
        });
    }

    getStatusText(status) {
        switch (status) {
            case 'played':
                return 'Played';
            case 'playing':
                return 'Now Playing';
            case 'upcoming':
                return 'Up Next';
            default:
                return status;
        }
    }

    updateRecommendations(recommendations) {
        const recommendationsContainer = document.getElementById('recommendations');
        recommendationsContainer.innerHTML = '';

        recommendations.forEach((rec) => {
            const recElement = document.createElement('div');
            recElement.className = `recommendation-item ${rec.priority}`;

            recElement.innerHTML = `
                <div class="recommendation-header">
                    <span class="recommendation-type">${this.formatType(rec.type)}</span>
                    <span class="recommendation-priority">${rec.priority}</span>
                </div>
                <div class="recommendation-message">${rec.message}</div>
                <div class="recommendation-confidence">Confidence: ${Math.round(rec.confidence * 100)}%</div>
            `;

            recommendationsContainer.appendChild(recElement);
        });
    }

    formatType(type) {
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    updateLastUpdate() {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        document.getElementById('last-update').textContent = timeString;
    }

    updateStatus(status) {
        console.log(`System status: ${status}`);
    }
}

// Initialize the system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.aiDJSystem = new AIDJSystem();
});
