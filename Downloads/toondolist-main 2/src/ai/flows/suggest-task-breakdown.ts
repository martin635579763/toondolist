
'use server';
/**
 * @fileOverview An AI agent that suggests a breakdown for a complex task.
 *
 * - suggestTaskBreakdown - A function that suggests sub-steps and roles for a task.
 * - SuggestTaskBreakdownInput - The input type for the suggestTaskBreakdown function.
 * - SuggestTaskBreakdownOutput - The return type for the suggestTaskBreakdown function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTaskBreakdownInputSchema = z.object({
  taskTitle: z.string().describe('The title of the main task.'),
  taskDescription: z.string().optional().describe('The detailed description of the main task.'),
});
export type SuggestTaskBreakdownInput = z.infer<typeof SuggestTaskBreakdownInputSchema>;

const BreakdownStepSchema = z.object({
  step: z.string().describe('A concise description of this sub-step or component task.'),
  details: z.string().optional().describe('Optional further details for this step.'),
  requiredRole: z.string().optional().describe('A suggested role or skill needed for this step (e.g., "designer", "developer", "musician").'),
});

const SuggestTaskBreakdownOutputSchema = z.object({
  summary: z.string().describe('A brief summary of why this task might need breaking down or involves multiple components/roles. If the task is simple, this should state that.'),
  breakdown: z.array(BreakdownStepSchema).describe('A list of suggested sub-steps or components for the task. Should be an empty array if no breakdown is needed.'),
});
export type SuggestTaskBreakdownOutput = z.infer<typeof SuggestTaskBreakdownOutputSchema>;


export async function suggestTaskBreakdown(
  input: SuggestTaskBreakdownInput
): Promise<SuggestTaskBreakdownOutput> {
  // Check if AI capabilities are available (e.g., if genkit is configured with a model)
  // This is a placeholder for actual capability check or if ai.generate would throw.
  // For now, we assume if genkit.ts is not configured with plugins/model, this would not work as expected.
  if (ai.plugins.length === 0) {
    console.warn("AI plugin not configured. Task breakdown suggestion will be skipped.");
    return {
        summary: "AI features are currently unavailable. Task breakdown cannot be suggested.",
        breakdown: [],
    };
  }
  return suggestTaskBreakdownFlow(input);
}

const suggestTaskBreakdownPrompt = ai.definePrompt({
  name: 'suggestTaskBreakdownPrompt',
  input: {schema: SuggestTaskBreakdownInputSchema},
  output: {schema: SuggestTaskBreakdownOutputSchema},
  prompt: `You are an expert project planner. Given a task title and description, analyze it to identify if it's a complex task that might require multiple steps, components, or different roles/skills to complete.

If the task is simple and doesn't need breaking down, state that in the summary and provide an empty breakdown array.

If the task is complex:
1.  Provide a brief 'summary' explaining why it's complex or needs a breakdown (e.g., "This task involves multiple distinct activities like design and implementation.").
2.  Suggest a 'breakdown' into a few logical sub-steps or components.
3.  For each step in the breakdown:
    *   Provide a concise 'step' description.
    *   Optionally, add 'details' if more clarification is needed for that step.
    *   If a specific 'requiredRole' or skill (e.g., "graphic designer", "bass player", "copywriter", "QA tester", "sound engineer") seems necessary for a step, suggest it. Keep roles general.

Example: For a task "Play Music" with description "Need bass and guitar players", you might suggest:
Summary: "This task requires coordination between different musicians."
Breakdown:
- Step: "Bass Performance", Required Role: "Bass Player"
- Step: "Guitar Performance", Required Role: "Guitar Player"
- Step: "Song Rehearsal", Details: "Coordinate parts and timing."

Main Task Title: {{{taskTitle}}}
Main Task Description: {{{taskDescription}}}`,
});

const suggestTaskBreakdownFlow = ai.defineFlow(
  {
    name: 'suggestTaskBreakdownFlow',
    inputSchema: SuggestTaskBreakdownInputSchema,
    outputSchema: SuggestTaskBreakdownOutputSchema,
  },
  async (input: SuggestTaskBreakdownInput) => {
    const {output} = await suggestTaskBreakdownPrompt(input);
    return output!;
  }
);
