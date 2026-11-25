"""Node 3: Risk Assessment Node — 100% deterministic Python rules, ZERO LLM calls."""

from __future__ import annotations

from app.domain.risk_engine import assess_risk
from app.graph.state import BreatheWiseState


def risk_assessment_node(state: BreatheWiseState) -> dict[str, object]:
    """Compute immutable RiskConstraints from CPCB NAQI, freshness, household, and query."""
    env = state["environment_data"]
    context = state["sanitized_context"]
    assessment = assess_risk(
        current_aqi=env.current,
        context=context,
        forecasts=env.forecasts,
        user_query=state.get("user_query"),
    )
    return {"risk_assessment": assessment}
