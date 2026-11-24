import { MessageSquareText, Sparkles } from 'lucide-react';

import { MedicalDisclaimer } from '@/components/shared/MedicalDisclaimer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const STARTER_PROMPTS = [
  'What is the current air quality in my location?',
  'Can my child play outside today?',
  'Should I go jogging this morning?',
  'How can I improve indoor air quality?',
  'How can I reduce pollution from my commute?',
] as const;

export function AssistantPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI Assistant</h1>
        <p className="text-sm text-slate-600">
          Ask natural-language questions grounded in live local AQI, your family profile, and
          verified health/environmental guidance.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-teal-700" aria-hidden="true" />
            Suggested Questions
          </CardTitle>
          <CardDescription>
            Responses include source citations and follow-up actions via the 5-node LangGraph RAG
            workflow.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {STARTER_PROMPTS.map((prompt) => (
            <span
              key={prompt}
              className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50/70 px-3.5 py-2 text-xs font-medium text-teal-900"
            >
              <Sparkles className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
              {prompt}
            </span>
          ))}
        </CardContent>
      </Card>

      <MedicalDisclaimer />
    </div>
  );
}
