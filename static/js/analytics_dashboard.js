
class AnalyticsDashboard {
    constructor() {
        this.metrics = {};
        this.charts = {};
        this.ws = null;
        this.updateInterval = 5000;
    }

    async initialize() {
        await this.setupWebSocket();
        await this.initializeCharts();
        this.startMetricsPolling();
    }

    setupWebSocket() {
        this.ws = new WebSocket('ws://0.0.0.0:81/ws');
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.updateMetrics(data);
        };
    }

    async initializeCharts() {
        const data = await fetch('/api/metrics/initial').then(r => r.json());
        this.createCharts(data);
    }

    startMetricsPolling() {
        setInterval(() => {
            fetch('/api/metrics/current')
                .then(r => r.json())
                .then(data => this.updateMetrics(data));
        }, this.updateInterval);
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new AnalyticsDashboard();
    dashboard.initialize();
});
