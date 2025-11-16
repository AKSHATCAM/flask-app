from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, emit
import json
import random
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'ai-dj-secret-key'
socketio = SocketIO(app, cors_allowed_origins="*")

# Global MCP Data Store - will be updated by external sources
current_mcp_data = None

def generate_sample_data():
    """Generate sample MCP data for testing"""
    tracks = [
        {"id": 1, "title": "Midnight Groove", "artist": "DJ Shadow", "bpm": 128, "energy": 0.75, "valence": 0.8, "status": "played", "duration": "4:32"},
        {"id": 2, "title": "Electric Dreams", "artist": "Synthwave Master", "bpm": 130, "energy": 0.85, "valence": 0.9, "status": "playing", "duration": "5:15"},
        {"id": 3, "title": "Deep House Journey", "artist": "House Collective", "bpm": 124, "energy": 0.7, "valence": 0.75, "status": "upcoming", "duration": "6:00"},
        {"id": 4, "title": "Bass Drop Supreme", "artist": "Bass Legion", "bpm": 140, "energy": 0.95, "valence": 0.85, "status": "upcoming", "duration": "4:45"},
        {"id": 5, "title": "Chill Vibes Only", "artist": "Ambient Flow", "bpm": 110, "energy": 0.5, "valence": 0.6, "status": "upcoming", "duration": "7:20"},
    ]

    movement_data = []
    audio_data = []
    crowd_energy_data = []
    overall_data = []

    for i in range(20):
        base = 0.5 + (i / 40)
        movement_data.append(round(min(1.0, base + random.uniform(-0.1, 0.15)), 2))
        audio_data.append(round(min(1.0, base + random.uniform(-0.05, 0.1)), 2))
        crowd_energy_data.append(round(min(1.0, base + random.uniform(-0.08, 0.12)), 2))
        overall_data.append(round((movement_data[-1] + audio_data[-1] + crowd_energy_data[-1]) / 3, 2))

    recommendations = [
        {
            "type": "track_suggestion",
            "priority": "high",
            "message": "Crowd energy is peaking! Consider transitioning to 'Bass Drop Supreme' to maintain momentum.",
            "confidence": 0.92,
            "timestamp": datetime.now().strftime("%H:%M:%S")
        },
        {
            "type": "tempo_adjustment",
            "priority": "medium",
            "message": "Movement patterns suggest increasing BPM by 5-10 to match crowd rhythm.",
            "confidence": 0.87,
            "timestamp": datetime.now().strftime("%H:%M:%S")
        },
        {
            "type": "vibe_analysis",
            "priority": "info",
            "message": "Current vibe: Energetic & Euphoric. Audience engagement at 85%. Peak moment approaching.",
            "confidence": 0.94,
            "timestamp": datetime.now().strftime("%H:%M:%S")
        },
        {
            "type": "warning",
            "priority": "low",
            "message": "Audio levels slightly unbalanced. Consider boosting mid frequencies.",
            "confidence": 0.78,
            "timestamp": datetime.now().strftime("%H:%M:%S")
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
            "current_vibe": overall_data[-1],
            "session_duration": "01:45:32",
            "total_tracks": len(tracks),
            "tracks_played": sum(1 for t in tracks if t["status"] == "played")
        }
    }

@app.route('/')
def index():
    """Main dashboard view"""
    return render_template('dashboard.html')

@app.route('/api/mcp-data')
def get_mcp_data():
    """Get current MCP data"""
    global current_mcp_data
    if current_mcp_data is None:
        current_mcp_data = generate_sample_data()
    return jsonify(current_mcp_data)

@app.route('/api/mcp-data', methods=['POST'])
def update_mcp_data():
    """Receive MCP data updates from external source (Claude/MCP)"""
    global current_mcp_data
    try:
        data = request.get_json()
        if data:
            # Merge with existing data or replace entirely
            current_mcp_data = data
            current_mcp_data['timestamp'] = datetime.now().isoformat()
            # Broadcast to all connected clients
            socketio.emit('mcp_update', current_mcp_data)
            return jsonify({"status": "success", "message": "MCP data updated"})
        else:
            return jsonify({"status": "error", "message": "No data provided"}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/add-recommendation', methods=['POST'])
def add_recommendation():
    """Add a new recommendation from Claude"""
    global current_mcp_data
    try:
        rec = request.get_json()
        if current_mcp_data is None:
            current_mcp_data = generate_sample_data()

        rec['timestamp'] = datetime.now().strftime("%H:%M:%S")
        current_mcp_data['recommendations'].insert(0, rec)
        # Keep only last 10 recommendations
        current_mcp_data['recommendations'] = current_mcp_data['recommendations'][:10]

        socketio.emit('new_recommendation', rec)
        return jsonify({"status": "success", "message": "Recommendation added"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/update-vibe', methods=['POST'])
def update_vibe():
    """Update vibe metrics with new data point"""
    global current_mcp_data
    try:
        vibe_data = request.get_json()
        if current_mcp_data is None:
            current_mcp_data = generate_sample_data()

        # Add new data points
        if 'movement' in vibe_data:
            current_mcp_data['vibe_metrics']['movement'].append(vibe_data['movement'])
            current_mcp_data['vibe_metrics']['movement'] = current_mcp_data['vibe_metrics']['movement'][-20:]

        if 'audio' in vibe_data:
            current_mcp_data['vibe_metrics']['audio'].append(vibe_data['audio'])
            current_mcp_data['vibe_metrics']['audio'] = current_mcp_data['vibe_metrics']['audio'][-20:]

        if 'crowd_energy' in vibe_data:
            current_mcp_data['vibe_metrics']['crowd_energy'].append(vibe_data['crowd_energy'])
            current_mcp_data['vibe_metrics']['crowd_energy'] = current_mcp_data['vibe_metrics']['crowd_energy'][-20:]

        # Calculate overall
        if current_mcp_data['vibe_metrics']['movement'] and current_mcp_data['vibe_metrics']['audio'] and current_mcp_data['vibe_metrics']['crowd_energy']:
            overall = (current_mcp_data['vibe_metrics']['movement'][-1] +
                      current_mcp_data['vibe_metrics']['audio'][-1] +
                      current_mcp_data['vibe_metrics']['crowd_energy'][-1]) / 3
            current_mcp_data['vibe_metrics']['overall'].append(round(overall, 2))
            current_mcp_data['vibe_metrics']['overall'] = current_mcp_data['vibe_metrics']['overall'][-20:]

        current_mcp_data['timestamp'] = datetime.now().isoformat()
        socketio.emit('vibe_update', current_mcp_data)
        return jsonify({"status": "success", "data": current_mcp_data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/update-track', methods=['POST'])
def update_track():
    """Update track status"""
    global current_mcp_data
    try:
        track_update = request.get_json()
        if current_mcp_data is None:
            current_mcp_data = generate_sample_data()

        track_id = track_update.get('id')
        new_status = track_update.get('status')

        for track in current_mcp_data['tracklist']:
            if track['id'] == track_id:
                track['status'] = new_status

        socketio.emit('track_update', current_mcp_data['tracklist'])
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    global current_mcp_data
    print('Client connected')
    if current_mcp_data is None:
        current_mcp_data = generate_sample_data()
    emit('initial_data', current_mcp_data)

@socketio.on('request_update')
def handle_update_request():
    """Handle client request for data update"""
    global current_mcp_data
    if current_mcp_data is None:
        current_mcp_data = generate_sample_data()
    emit('mcp_update', current_mcp_data)

if __name__ == '__main__':
    print("Starting AI-DJ System MCP Vibe Meter...")
    print("Dashboard: http://localhost:5000")
    print("API Endpoints:")
    print("  GET  /api/mcp-data - Get current MCP data")
    print("  POST /api/mcp-data - Update MCP data (from Claude)")
    print("  POST /api/add-recommendation - Add Claude recommendation")
    print("  POST /api/update-vibe - Update vibe metrics")
    print("  POST /api/update-track - Update track status")
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
