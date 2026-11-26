"""Use-case service for the Conversational AI Clean-Air Assistant (PRD Module 6 / FR-08)."""

from __future__ import annotations

from typing import Any

from app.graph.workflow import compile_breathewise_graph
from app.repositories.chat_repo import ChatRepository


class ChatService:
    """Orchestrates grounded conversational Q&A via the 5-node LangGraph workflow."""

    def __init__(
        self,
        *,
        chat_repo: ChatRepository | None = None,
        graph: Any | None = None,
    ) -> None:
        self._chat_repo = chat_repo or ChatRepository()
        self._graph = graph or compile_breathewise_graph()

    def send_message(
        self,
        *,
        user_id: str,
        location_id: str,
        lat: float,
        lng: float,
        location_label: str,
        message: str,
        session_id: str | None = None,
        family_id: str | None = None,
    ) -> dict[str, Any]:
        active_session_id = self._chat_repo.ensure_session(
            user_id=user_id,
            session_id=session_id,
            family_id=family_id,
            location_id=location_id,
            first_message=message,
        )
        history = self._chat_repo.get_recent_history(session_id=active_session_id, limit=6)

        # Persist the user turn before/alongside generation
        self._chat_repo.append_message(
            session_id=active_session_id,
            user_id=user_id,
            role="user",
            content=message,
        )

        result_state = self._graph.invoke(
            {
                "workflow_mode": "chat",
                "user_id": user_id,
                "family_id": family_id,
                "location_id": location_id,
                "lat": lat,
                "lng": lng,
                "location_label": location_label,
                "user_query": message,
                "chat_history": history,
                "retry_count": 0,
            }
        )

        reply_payload = dict(result_state["final_output"])
        risk = result_state["risk_assessment"]
        reply_payload["fallbackMode"] = bool(result_state.get("fallback_mode", False))
        reply_payload["medicalDisclaimerShown"] = True
        reply_payload["agentTrace"] = list(
            reply_payload.get("agentTrace") or result_state.get("agent_trace") or []
        )

        saved_assistant = self._chat_repo.append_message(
            session_id=active_session_id,
            user_id=user_id,
            role="assistant",
            content=str(reply_payload.get("content") or ""),
            metadata={
                "citations": reply_payload.get("citations") or [],
                "followUpSuggestions": reply_payload.get("followUpSuggestions") or [],
                "environmentalSnapshot": reply_payload.get("environmentalSnapshot"),
                "agentTrace": reply_payload["agentTrace"],
                "medicalDisclaimerShown": True,
                "medicalEscalationRequired": bool(risk.constraints.medical_escalation_required),
                "fallbackMode": reply_payload["fallbackMode"],
            },
        )

        return {
            "sessionId": active_session_id,
            "messageId": saved_assistant["messageId"],
            "createdAt": saved_assistant["createdAt"],
            "medicalEscalationRequired": bool(risk.constraints.medical_escalation_required),
            "reply": reply_payload,
        }
