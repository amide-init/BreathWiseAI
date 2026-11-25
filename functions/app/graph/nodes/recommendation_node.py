"""Node 4: Recommendation Agent — RAG grounding + Google Gemini structured generation."""

from __future__ import annotations

import logging
from typing import Any

from app.graph.prompts import (
    build_chat_prompts,
    build_daily_plan_prompts,
    build_indoor_advisor_prompts,
)
from app.graph.state import BreatheWiseState
from app.providers.base import StructuredLLMProvider
from app.providers.gemini_provider import GeminiStructuredProvider
from app.rag.retriever import KnowledgeRetriever, docs_to_citations
from app.schemas.chat import ChatReply
from app.schemas.planner import (
    DailyPlanSections,
    IndoorAssessmentResponse,
    IndoorQuestionnaire,
)
from app.utils.errors import UpstreamProviderError
from app.utils.logger import log_event


def build_recommendation_node(
    *,
    llm_provider: StructuredLLMProvider | None = None,
    retriever: KnowledgeRetriever | None = None,
):
    """Create Node 4 (`recommendation_agent`) with injectable LLM & RAG retriever."""
    llm = llm_provider or GeminiStructuredProvider()
    rag = retriever or KnowledgeRetriever()

    def recommendation_agent(state: BreatheWiseState) -> dict[str, Any]:
        mode = state["workflow_mode"]
        context = state["sanitized_context"]
        env = state["environment_data"]
        risk = state["risk_assessment"]
        validation_errors = state.get("validation_errors") or []

        docs = state.get("retrieved_docs") or rag.retrieve(
            workflow_mode=mode,
            risk_tier=risk.severity_tier,
            sensitive_groups_present=risk.sensitive_groups_present,
            medical_escalation_required=risk.constraints.medical_escalation_required,
            user_query=state.get("user_query"),
            top_k=4,
        )

        try:
            if mode == "daily_plan":
                sys_prompt, usr_prompt = build_daily_plan_prompts(
                    context=context,
                    env=env,
                    risk=risk,
                    docs=docs,
                    validation_errors=validation_errors,
                )
                generated = llm.generate_structured(
                    system_prompt=sys_prompt,
                    user_prompt=usr_prompt,
                    response_schema=DailyPlanSections,
                )
                draft = generated.model_dump(by_alias=True)

            elif mode == "indoor_advisor":
                q = state.get("indoor_answers") or IndoorQuestionnaire()
                sys_prompt, usr_prompt = build_indoor_advisor_prompts(
                    questionnaire=q,
                    context=context,
                    env=env,
                    risk=risk,
                    docs=docs,
                    validation_errors=validation_errors,
                )
                generated_indoor = llm.generate_structured(
                    system_prompt=sys_prompt,
                    user_prompt=usr_prompt,
                    response_schema=IndoorAssessmentResponse,
                )
                # Always force verifiable RAG citations and questionnaire basis
                generated_indoor.assessment_basis = "estimated_questionnaire"
                generated_indoor.citations = docs_to_citations(docs)
                generated_indoor.fallback_mode = False
                draft = generated_indoor.model_dump(by_alias=True)

            else:  # chat
                sys_prompt, usr_prompt = build_chat_prompts(
                    user_query=state.get("user_query") or "",
                    chat_history=state.get("chat_history") or [],
                    context=context,
                    env=env,
                    risk=risk,
                    docs=docs,
                    validation_errors=validation_errors,
                )
                generated_chat = llm.generate_structured(
                    system_prompt=sys_prompt,
                    user_prompt=usr_prompt,
                    response_schema=ChatReply,
                )
                generated_chat.citations = docs_to_citations(docs)
                generated_chat.environmental_snapshot = env.current
                generated_chat.medical_disclaimer_shown = True
                generated_chat.fallback_mode = False
                draft = generated_chat.model_dump(by_alias=True)

            return {
                "retrieved_docs": docs,
                "draft_output": draft,
                "llm_failed": False,
            }

        except UpstreamProviderError as exc:
            log_event(
                "recommendation_llm_fallback",
                level=logging.WARNING,
                mode=mode,
                provider=exc.provider,
                message=exc.message,
            )
            return {
                "retrieved_docs": docs,
                "draft_output": None,
                "llm_failed": True,
            }

    return recommendation_agent
