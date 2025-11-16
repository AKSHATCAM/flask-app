"""
MCP (Model Context Protocol) Data Models for AI-DJ System
Defines the structure for Claude's analysis and recommendations
"""

from dataclasses import dataclass, asdict
from typing import List, Dict, Optional
from datetime import datetime
import json

@dataclass
class Track:
    """Represents a track in the DJ set"""
    id: int
    title: str
    artist: str
    bpm: int
    energy: float  # 0.0 to 1.0
    valence: float  # 0.0 to 1.0 (musical positiveness)
    status: str  # 'played', 'playing', 'upcoming'
    duration: Optional[str] = None
    key: Optional[str] = None

    def to_dict(self):
        return asdict(self)

@dataclass
class VibeMetrics:
    """Vibe metrics from various sources"""
    movement: List[float]  # Movement/dance detection scores
    audio: List[float]  # Audio analysis scores
    crowd_energy: List[float]  # Crowd energy levels
    overall: List[float]  # Combined vibe score
    timestamps: Optional[List[str]] = None

    def to_dict(self):
        return asdict(self)

    def get_current_vibe(self) -> Dict[str, float]:
        """Get the most recent vibe readings"""
        return {
            "movement": self.movement[-1] if self.movement else 0.0,
            "audio": self.audio[-1] if self.audio else 0.0,
            "crowd_energy": self.crowd_energy[-1] if self.crowd_energy else 0.0,
            "overall": self.overall[-1] if self.overall else 0.0
        }

@dataclass
class Recommendation:
    """AI recommendation from Claude"""
    type: str  # 'track_suggestion', 'tempo_adjustment', 'vibe_analysis', 'warning'
    priority: str  # 'high', 'medium', 'low', 'info'
    message: str
    confidence: float  # 0.0 to 1.0
    action: Optional[Dict] = None

    def to_dict(self):
        return asdict(self)

@dataclass
class SessionStats:
    """Statistics for the current DJ session"""
    avg_movement: float
    avg_audio: float
    avg_crowd_energy: float
    peak_vibe: float
    session_duration: str
    tracks_played: int = 0

    def to_dict(self):
        return asdict(self)

@dataclass
class MCPDataPacket:
    """Complete MCP data packet for Claude analysis"""
    session_id: str
    timestamp: str
    vibe_metrics: VibeMetrics
    tracklist: List[Track]
    recommendations: List[Recommendation]
    current_stats: SessionStats

    def to_dict(self):
        return {
            "session_id": self.session_id,
            "timestamp": self.timestamp,
            "vibe_metrics": self.vibe_metrics.to_dict(),
            "tracklist": [track.to_dict() for track in self.tracklist],
            "recommendations": [rec.to_dict() for rec in self.recommendations],
            "current_stats": self.current_stats.to_dict()
        }

    def to_json(self):
        return json.dumps(self.to_dict(), indent=2)

@dataclass
class ClaudeAnalysis:
    """Claude's analysis of the current vibe state"""
    vibe_description: str
    energy_trend: str  # 'rising', 'falling', 'stable', 'peaking'
    crowd_mood: str
    recommended_action: str
    next_track_suggestions: List[str]
    confidence_score: float

    def to_dict(self):
        return asdict(self)

def create_mcp_context(data_packet: MCPDataPacket) -> str:
    """
    Create MCP context string for Claude to analyze
    """
    context = f"""
    === AI-DJ System MCP Data ===
    Session: {data_packet.session_id}
    Time: {data_packet.timestamp}

    CURRENT VIBE METRICS:
    {json.dumps(data_packet.vibe_metrics.get_current_vibe(), indent=2)}

    SESSION STATISTICS:
    {json.dumps(data_packet.current_stats.to_dict(), indent=2)}

    TRACKLIST:
    {json.dumps([t.to_dict() for t in data_packet.tracklist], indent=2)}

    Based on this data, analyze the current vibe and provide recommendations.
    """
    return context
