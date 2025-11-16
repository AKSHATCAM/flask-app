from flask import Flask, render_template, jsonify
from flask_socketio import SocketIO, emit
import json
import random
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'ai-dj-secret-key'
socketio = SocketIO(app, cors_allowed_origins="*")

# MCP Data Store
mcp_data = {
    "session_id": "dj_session_001",
    "timestamp": datetime.now().isoformat(),
    "vibe_metrics": {
        "movement": [],
        "audio": [],
        "crowd_energy": [],
        "overall": []
    },
    "tracklist": [],
    "recommendations": []
}

def generate_sample_data():
    """Generate sample MCP data for the AI-DJ system"""
    # Sample tracklist
    tracks = [
        {"id": 1, "title": "Midnight Groove", "artist": "DJ Shadow", "bpm": 128, "energy": 0.75, "valence": 0.8, "status": "played"},
        {"id": 2, "title": "Electric Dreams", "artist": "Synthwave Master", "bpm": 130, "energy": 0.85, "valence": 0.9, "status": "playing"},
        {"id": 3, "title": "Deep House Journey", "artist": "House Collective", "bpm": 124, "energy": 0.7, "valence": 0.75, "status": "upcoming"},
        {"id": 4, "title": "Bass Drop Supreme", "artist": "Bass Legion", "bpm": 140, "energy": 0.95, "valence": 0.85, "status": "upcoming"},
        {"id": 5, "title": "Chill Vibes Only", "artist": "Ambient Flow", "bpm": 110, "energy": 0.5, "valence": 0.6, "status": "upcoming"},
    ]

    # Generate vibe metrics over time (last 20 data points)
    movement_data = []
    audio_data = []
    crowd_energy_data = []
    overall_data = []

    for i in range(20):
        base = 0.5 + (i / 40)  # Gradual increase
        movement_data.append(round(min(1.0, base + random.uniform(-0.1, 0.15)), 2))
        audio_data.append(round(min(1.0, base + random.uniform(-0.05, 0.1)), 2))
        crowd_energy_data.append(round(min(1.0, base + random.uniform(-0.08, 0.12)), 2))
        overall_data.append(round((movement_data[-1] + audio_data[-1] + crowd_energy_data[-1]) / 3, 2))

    # AI Recommendations from Claude
    recommendations = [
        {
            "type": "track_suggestion",
            "priority": "high",
            "message": "Crowd energy is peaking! Consider transitioning to 'Bass Drop Supreme' to maintain momentum.",
            "confidence": 0.92
        },
        {
            "type": "tempo_adjustment",
            "priority": "medium",
            "message": "Movement patterns suggest increasing BPM by 5-10 to match crowd rhythm.",
            "confidence": 0.87
        },
        {
            "type": "vibe_analysis",
            "priority": "info",
            "message": "Current vibe: Energetic & Euphoric. Audience engagement at 85%. Peak moment approaching.",
            "confidence": 0.94
        },
        {
            "type": "warning",
            "priority": "low",
            "message": "Audio levels slightly unbalanced. Consider boosting mid frequencies.",
            "confidence": 0.78
        }
    ]

    return {
        "session_id": f"dj_session_{datetime.now().strftime('%H%M%S')}",
        "timestamp": datetime.now().isoformat(),
        "vibe_metrics": {
            "movement": movement_data,
            "audio": audio_data,
            "crowd_energy": crowd_energy_data,
            "overall": overall_data
        },
        "tracklist": tracks,
        "recommendations": recommendations,
        "current_stats": {
            "avg_movement": round(sum(movement_data) / len(movement_data), 2),
            "avg_audio": round(sum(audio_data) / len(audio_data), 2),
            "avg_crowd_energy": round(sum(crowd_energy_data) / len(crowd_energy_data), 2),
            "peak_vibe": max(overall_data),
            "session_duration": "01:45:32"
        }
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/mcp-data')
def get_mcp_data():
    """Get current MCP data"""
    return jsonify(generate_sample_data())

@app.route('/api/update-vibe', methods=['POST'])
def update_vibe():
    """Update vibe metrics with new data point"""
    data = generate_sample_data()
    socketio.emit('vibe_update', data)
    return jsonify({"status": "success", "data": data})

@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('initial_data', generate_sample_data())

@socketio.on('request_update')
def handle_update_request():
    emit('vibe_update', generate_sample_data())

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
