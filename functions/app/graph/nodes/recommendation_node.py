"""Node 6: Recommendation Agent — RAG grounding + Google Gemini structured synthesis."""

from __future__ import annotations

import logging
from typing import Any

from app.graph.prompts import (
    build_chat_agent_system_prompt,
    build_chat_prompts,
    build_daily_plan_prompts,
    build_indoor_advisor_prompts,
)
from app.graph.state import BreatheWiseState
from app.graph.tools.chat_tools import CHAT_TOOL_LABELS, build_chat_tool_runtime
from app.providers.base import StructuredLLMProvider
from app.providers.gemini_provider import GeminiStructuredProvider
from app.rag.retriever import KnowledgeRetriever, docs_to_citations
from app.schemas.chat import ChatReply
from app.schemas.planner import (
    DailyPlanSections,
    IndoorAssessmentResponse,
    IndoorQuestionnaire,
)
from app.services.impact_service import ImpactService
from app.utils.errors import UpstreamProviderError
from app.utils.logger import log_event


def _invoke_structured_llm(
    llm: StructuredLLMProvider,
    *,
    system_prompt: str,
    user_prompt: str,
    response_schema: type[Any],
    max_output_tokens: int,
    operation_name: str,
) -> Any:
    """Pass token-budget hints to GeminiStructuredProvider while keeping test stubs compatible."""
    if isinstance(llm, GeminiStructuredProvider):
        return llm.generate_structured(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_schema=response_schema,
            max_output_tokens=max_output_tokens,
            thinking_level="MINIMAL",
            operation_name=operation_name,
        )
    return llm.generate_structured(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        response_schema=response_schema,
    )


def build_recommendation_node(
    *,
    llm_provider: StructuredLLMProvider | None = None,
    retriever: KnowledgeRetriever | None = None,
    impact_service: ImpactService | None = None,
):
    """Create Node 6 (`recommendation_agent`) with injectable LLM, RAG retriever & ImpactService."""
    llm = llm_provider or GeminiStructuredProvider()
    rag = retriever or KnowledgeRetriever()

    def recommendation_agent(state: BreatheWiseState) -> dict[str, Any]:
        mode = state["workflow_mode"]
        context = state["sanitized_context"]
        env = state["environment_data"]
        risk = state["risk_assessment"]
        reasoning_plan = state.get("reasoning_plan")
        tool_results = state.get("tool_results")
        validation_errors = state.get("validation_errors") or []
        trace = list(state.get("agent_trace") or [])

        # Dynamic pull-on-demand Gemini Function Calling path for live conversational Chat
        if mode == "chat" and isinstance(llm, GeminiStructuredProvider):
            chat_history = state.get("chat_history") or []
            user_query = state.get("user_query") or ""
            runtime = build_chat_tool_runtime(
                state=state,
                retriever=rag,
                impact_service=impact_service,
            )
            chat_sys_prompt = build_chat_agent_system_prompt(
                context=context,
                env=env,
                risk=risk,
                is_follow_up=bool(chat_history),
            )
            try:
                generated_chat, called_tools = llm.generate_structured_with_tools(
                    system_prompt=chat_sys_prompt,
                    user_message=user_query,
                    chat_history=chat_history,
                    tool_declarations=runtime.declarations,
                    tool_handlers=runtime.handlers,
                    response_schema=ChatReply,
                    validation_errors=validation_errors,
                    temperature=0.45,
                    max_output_tokens=750,
                    thinking_level="MINIMAL",
                    operation_name="chat_with_tools",
                )
                docs = list(runtime.collected_docs)
                if not docs:
                    docs = rag.retrieve(
                        workflow_mode="chat",
                        risk_tier=risk.severity_tier,
                        sensitive_groups_present=risk.sensitive_groups_present,
                        medical_escalation_required=risk.constraints.medical_escalation_required,
                        user_query=user_query,
                        top_k=2 if not risk.constraints.medical_escalation_required else 3,
                    )

                # Replace generic Node 5 tool trace with the exact tools Gemini dynamically chose
                updated_trace = [step for step in trace if not step.startswith("Ran ")]
                if called_tools:
                    pretty = [CHAT_TOOL_LABELS.get(name, name) for name in called_tools]
                    updated_trace.append(
                        f"AI selected {len(called_tools)} tool"
                        f"{'' if len(called_tools) == 1 else 's'}: {', '.join(pretty)}"
                    )
                else:
                    updated_trace.append("Answered directly from live city AQI & conversation context")

                generated_chat.citations = docs_to_citations(docs)
                generated_chat.environmental_snapshot = env.current
                generated_chat.agent_trace = updated_trace
                generated_chat.medical_disclaimer_shown = True
                generated_chat.fallback_mode = False
                return {
                    "retrieved_docs": docs,
                    "agent_trace": updated_trace,
                    "draft_output": generated_chat.model_dump(by_alias=True),
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
                fallback_docs = state.get("retrieved_docs") or rag.retrieve(
                    workflow_mode="chat",
                    risk_tier=risk.severity_tier,
                    sensitive_groups_present=risk.sensitive_groups_present,
                    medical_escalation_required=risk.constraints.medical_escalation_required,
                    user_query=user_query,
                    top_k=2,
                )
                return {
                    "retrieved_docs": fallback_docs,
                    "draft_output": None,
                    "llm_failed": True,
                }

        # Adaptive RAG top_k: 2 concise docs for normal chat, 3 for plans/indoor/medical escalation
        rag_top_k = (
            2 if (mode == "chat" and not risk.constraints.medical_escalation_required) else 3
        )
        docs = state.get("retrieved_docs") or rag.retrieve(
            workflow_mode=mode,
            risk_tier=risk.severity_tier,
            sensitive_groups_present=risk.sensitive_groups_present,
            medical_escalation_required=risk.constraints.medical_escalation_required,
            user_query=state.get("user_query"),
            top_k=rag_top_k,
        )

        try:
            if mode == "daily_plan":
                sys_prompt, usr_prompt = build_daily_plan_prompts(
                    context=context,
                    env=env,
                    risk=risk,
                    docs=docs,
                    reasoning_plan=reasoning_plan,
                    tool_results=tool_results,
                    validation_errors=validation_errors,
                )
                generated = _invoke_structured_llm(
                    llm,
                    system_prompt=sys_prompt,
                    user_prompt=usr_prompt,
                    response_schema=DailyPlanSections,
                    max_output_tokens=2200,
                    operation_name="daily_plan",
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
                    reasoning_plan=reasoning_plan,
                    tool_results=tool_results,
                    validation_errors=validation_errors,
                )
                generated_indoor = _invoke_structured_llm(
                    llm,
                    system_prompt=sys_prompt,
                    user_prompt=usr_prompt,
                    response_schema=IndoorAssessmentResponse,
                    max_output_tokens=1400,
                    operation_name="indoor_advisor",
                )
                generated_indoor.assessment_basis = "estimated_questionnaire"
                generated_indoor.citations = docs_to_citations(docs)
                generated_indoor.agent_trace = trace
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
                    reasoning_plan=reasoning_plan,
                    tool_results=tool_results,
                    validation_errors=validation_errors,
                )
                generated_chat = _invoke_structured_llm(
                    llm,
                    system_prompt=sys_prompt,
                    user_prompt=usr_prompt,
                    response_schema=ChatReply,
                    max_output_tokens=700,
                    operation_name="chat",
                )
                generated_chat.citations = docs_to_citations(docs)
                generated_chat.environmental_snapshot = env.current
                generated_chat.agent_trace = trace
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
