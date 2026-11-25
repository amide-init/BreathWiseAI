"""Node 2: Environment Agent — fetches cache-first normalized AQI, weather, and forecasts."""

from __future__ import annotations

from app.graph.state import BreatheWiseState
from app.services.air_quality_service import AirQualityService


def build_environment_node(air_quality_service: AirQualityService | None = None):
    """Create Node 2 (`environment_agent`) with injectable AirQualityService."""
    service = air_quality_service or AirQualityService()

    def environment_agent(state: BreatheWiseState) -> dict[str, object]:
        env_data = service.get_air_quality(
            location_id=state["location_id"],
            lat=state["lat"],
            lng=state["lng"],
            location_label=state.get("location_label") or state["location_id"],
            force_refresh=bool(state.get("force_refresh_aqi", False)),
        )
        return {"environment_data": env_data}

    return environment_agent
