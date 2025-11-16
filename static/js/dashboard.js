// AI-DJ System - Enhanced Dashboard JavaScript

class MCPDashboard {
    constructor() {
        this.socket = null;
        this.vibeChart = null;
        this.currentData = null;
        this.previousData = null;
        this.isConnected = false;

        this.init();
    }

    init() {
        this.initSocketConnection();
        this.initChart();
        this.initEventListeners();
        this.fetchInitialData();
    }

    initSocketConnection() {
        try {
            this.socket = io();

            this.socket.on('connect', () => {
                console.log('WebSocket connected');
                this.isConnected = true;
                this.updateConnectionStatus(true);
            });

            this.socket.on('disconnect', () => {
                console.log('WebSocket disconnected');
                this.isConnected = false;
                this.updateConnectionStatus(false);
            });

            this.socket.on('initial_data', (data) => {
                console.log('Initial MCP data received');
                this.handleDataUpdate(data);
            });

            this.socket.on('mcp_update', (data) => {
                console.log('MCP update received');
                this.handleDataUpdate(data);
            });

            this.socket.on('vibe_update', (data) => {
                console.log('Vibe update received');
                this.handleDataUpdate(data);
            });

            this.socket.on('new_recommendation', (rec) => {
                console.log('New recommendation received');
                this.addNewRecommendation(rec);
            });

            this.socket.on('track_update', (tracks) => {
                console.log('Track update received');
                if (this.currentData) {
                    this.currentData.tracklist = tracks;
                    this.renderTracklist(tracks);
                }
            });
        } catch (error) {
            console.error('Socket connection failed:', error);
            this.updateConnectionStatus(false);
        }
    }

    updateConnectionStatus(connected) {
        const dot = document.getElementById('connection-dot');
        const text = document.getElementById('connection-text');
        const wsStatus = document.getElementById('ws-status');

        if (connected) {
            dot.style.background = '#00ff88';
            text.textContent = 'Connected';
            wsStatus.textContent = 'Active';
        } else {
            dot.style.background = '#ff4466';
            text.textContent = 'Disconnected';
            wsStatus.textContent = 'Inactive';
        }
    }

    initChart() {
        const ctx = document.getElementById('vibeChart').getContext('2d');

        // Create gradient for overall line
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, 'rgba(0, 212, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 212, 255, 0.0)');

        this.vibeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({ length: 20 }, (_, i) => i + 1),
                datasets: [
                    {
                        label: 'Overall',
                        data: [],
                        borderColor: '#00d4ff',
                        backgroundColor: gradient,
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 0,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Movement',
                        data: [],
                        borderColor: '#ff00d4',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false,
                        pointRadius: 0,
                        pointHoverRadius: 4
                    },
                    {
                        label: 'Audio',
                        data: [],
                        borderColor: '#ffd700',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false,
                        pointRadius: 0,
                        pointHoverRadius: 4
                    },
                    {
                        label: 'Energy',
                        data: [],
                        borderColor: '#00ff88',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false,
                        pointRadius: 0,
                        pointHoverRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 750,
                    easing: 'easeInOutQuart'
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 1,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#6060a0',
                            font: { size: 10 },
                            callback: (value) => `${Math.round(value * 100)}%`
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#6060a0',
                            font: { size: 10 },
                            maxTicksLimit: 10
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end',
                        labels: {
                            color: '#a0a0c0',
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 15,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(20, 20, 50, 0.95)',
                        titleColor: '#ffffff',
                        bodyColor: '#a0a0c0',
                        borderColor: 'rgba(100, 100, 200, 0.3)',
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: (context) => {
                                return `${context.dataset.label}: ${Math.round(context.raw * 100)}%`;
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }

    initEventListeners() {
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.fetchInitialData();
        });

        document.getElementById('simulate-btn').addEventListener('click', () => {
            this.simulateUpdate();
        });

        // Graph control buttons
        document.querySelectorAll('.graph-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.graph-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updateChartVisibility(e.target.dataset.metric);
            });
        });
    }

    updateChartVisibility(metric) {
        if (metric === 'all') {
            this.vibeChart.data.datasets.forEach(ds => ds.hidden = false);
        } else if (metric === 'overall') {
            this.vibeChart.data.datasets.forEach((ds, i) => ds.hidden = i !== 0);
        }
        this.vibeChart.update();
    }

    async fetchInitialData() {
        try {
            const response = await fetch('/api/mcp-data');
            const data = await response.json();
            this.handleDataUpdate(data);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        }
    }

    async simulateUpdate() {
        try {
            const newVibe = {
                movement: Math.random() * 0.3 + 0.6,
                audio: Math.random() * 0.3 + 0.6,
                crowd_energy: Math.random() * 0.3 + 0.6
            };

            await fetch('/api/update-vibe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newVibe)
            });
        } catch (error) {
            console.error('Failed to simulate update:', error);
        }
    }

    handleDataUpdate(data) {
        this.previousData = this.currentData;
        this.currentData = data;

        this.updateSessionInfo(data);
        this.updateVibeMeters(data);
        this.updateChart(data.vibe_metrics);
        this.renderTracklist(data.tracklist);
        this.renderRecommendations(data.recommendations);
        this.updateLastUpdate();
    }

    updateSessionInfo(data) {
        document.getElementById('session-id').textContent = data.session_id || '---';
        if (data.current_stats) {
            document.getElementById('session-duration').textContent = data.current_stats.session_duration || '00:00:00';
        }
    }

    updateVibeMeters(data) {
        const metrics = data.vibe_metrics;
        const stats = data.current_stats;

        // Update main gauge
        const overallValue = metrics.overall.length > 0 ? metrics.overall[metrics.overall.length - 1] : 0;
        const percentage = Math.round(overallValue * 100);

        document.getElementById('overall-vibe-value').textContent = percentage;

        // Update gauge arc
        const gaugeFill = document.getElementById('main-gauge-fill');
        const maxOffset = 251; // Full arc length
        const offset = maxOffset - (maxOffset * overallValue);
        gaugeFill.style.strokeDashoffset = offset;

        // Update vibe status text
        const statusText = this.getVibeStatus(overallValue);
        document.getElementById('vibe-status').textContent = statusText;

        // Update individual metric bars
        this.updateMetricBar('movement', metrics.movement);
        this.updateMetricBar('audio', metrics.audio);
        this.updateMetricBar('energy', metrics.crowd_energy);

        // Update quick stats
        if (stats) {
            document.getElementById('peak-vibe').textContent = `${Math.round(stats.peak_vibe * 100)}%`;
            document.getElementById('tracks-played').textContent = `${stats.tracks_played}/${stats.total_tracks}`;
        }
    }

    updateMetricBar(type, values) {
        if (!values || values.length === 0) return;

        const currentValue = values[values.length - 1];
        const percentage = Math.round(currentValue * 100);

        // Update bar width
        const barId = type === 'energy' ? 'energy-bar' : `${type}-bar`;
        const bar = document.getElementById(barId);
        if (bar) {
            bar.style.width = `${percentage}%`;
        }

        // Update value text
        const valueId = type === 'energy' ? 'energy-value' : `${type}-value`;
        const valueEl = document.getElementById(valueId);
        if (valueEl) {
            valueEl.textContent = `${percentage}%`;
        }

        // Update trend indicator
        const trendId = type === 'energy' ? 'energy-trend' : `${type}-trend`;
        const trendEl = document.getElementById(trendId);
        if (trendEl && values.length >= 2) {
            const prevValue = values[values.length - 2];
            const diff = currentValue - prevValue;

            if (diff > 0.02) {
                trendEl.textContent = '↑';
                trendEl.className = 'metric-trend up';
            } else if (diff < -0.02) {
                trendEl.textContent = '↓';
                trendEl.className = 'metric-trend down';
            } else {
                trendEl.textContent = '→';
                trendEl.className = 'metric-trend stable';
            }
        }
    }

    getVibeStatus(value) {
        if (value >= 0.9) return 'Peak Energy! Maximum Vibe!';
        if (value >= 0.8) return 'High Energy - Crowd is Hyped';
        if (value >= 0.7) return 'Good Vibes - Energy Rising';
        if (value >= 0.6) return 'Warming Up - Building Momentum';
        if (value >= 0.5) return 'Moderate Energy';
        if (value >= 0.4) return 'Steady Flow';
        return 'Low Energy - Time to Energize';
    }

    updateChart(metrics) {
        if (!metrics) return;

        this.vibeChart.data.datasets[0].data = metrics.overall;
        this.vibeChart.data.datasets[1].data = metrics.movement;
        this.vibeChart.data.datasets[2].data = metrics.audio;
        this.vibeChart.data.datasets[3].data = metrics.crowd_energy;

        this.vibeChart.update('none');
    }

    renderTracklist(tracks) {
        const container = document.getElementById('tracklist');
        container.innerHTML = '';

        if (!tracks || tracks.length === 0) {
            container.innerHTML = '<div class="loading-placeholder">No tracks available</div>';
            return;
        }

        document.getElementById('track-count').textContent = `${tracks.length} tracks`;

        tracks.forEach((track, index) => {
            const trackEl = document.createElement('div');
            trackEl.className = `track-item ${track.status}`;

            trackEl.innerHTML = `
                <div class="track-number">${index + 1}</div>
                <div class="track-info">
                    <div class="track-title">${this.escapeHtml(track.title)}</div>
                    <div class="track-artist">${this.escapeHtml(track.artist)}</div>
                </div>
                <div class="track-meta">
                    <div class="track-bpm">${track.bpm} BPM</div>
                    <div class="track-energy-bar">
                        <div class="track-energy-fill" style="width: ${track.energy * 100}%"></div>
                    </div>
                    <div class="track-status-badge">${this.getStatusLabel(track.status)}</div>
                </div>
            `;

            container.appendChild(trackEl);
        });
    }

    getStatusLabel(status) {
        switch (status) {
            case 'played': return 'Played';
            case 'playing': return 'Now Playing';
            case 'upcoming': return 'Up Next';
            default: return status;
        }
    }

    renderRecommendations(recommendations) {
        const container = document.getElementById('recommendations');
        container.innerHTML = '';

        if (!recommendations || recommendations.length === 0) {
            container.innerHTML = '<div class="loading-placeholder">No recommendations yet</div>';
            return;
        }

        recommendations.forEach(rec => {
            const recEl = this.createRecommendationCard(rec);
            container.appendChild(recEl);
        });
    }

    createRecommendationCard(rec) {
        const card = document.createElement('div');
        card.className = `recommendation-card ${rec.priority}`;

        card.innerHTML = `
            <div class="rec-header">
                <span class="rec-type">${this.formatType(rec.type)}</span>
                <span class="rec-priority">${rec.priority}</span>
            </div>
            <div class="rec-message">${this.escapeHtml(rec.message)}</div>
            <div class="rec-footer">
                <span class="rec-confidence">Confidence: ${Math.round(rec.confidence * 100)}%</span>
                <span class="rec-time">${rec.timestamp || 'Just now'}</span>
            </div>
        `;

        return card;
    }

    addNewRecommendation(rec) {
        const container = document.getElementById('recommendations');

        // Remove placeholder if present
        const placeholder = container.querySelector('.loading-placeholder');
        if (placeholder) {
            placeholder.remove();
        }

        // Create and prepend new recommendation
        const recEl = this.createRecommendationCard(rec);
        recEl.style.animation = 'fadeIn 0.5s ease';
        container.insertBefore(recEl, container.firstChild);

        // Keep only last 10
        while (container.children.length > 10) {
            container.removeChild(container.lastChild);
        }
    }

    formatType(type) {
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateLastUpdate() {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        document.getElementById('last-update').textContent = timeString;
    }
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(style);

// Add SVG gradient definition
const svgGradient = `
    <svg style="position: absolute; width: 0; height: 0;">
        <defs>
            <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#ff4466" />
                <stop offset="50%" style="stop-color:#ffd700" />
                <stop offset="100%" style="stop-color:#00ff88" />
            </linearGradient>
        </defs>
    </svg>
`;
document.body.insertAdjacentHTML('afterbegin', svgGradient);

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.mcpDashboard = new MCPDashboard();
});
