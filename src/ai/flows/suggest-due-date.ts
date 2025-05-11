// Suggests a due date for a task based on its description.
//
// - suggestDueDate - A function that suggests a due date for a task.
// - SuggestDueDateInput - The input type for the suggestDueDate function.
// - SuggestDueDateOutput - The return type for the suggestDueDate function.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestDueDateInputSchema = z.object({
  taskDescription: z
    .string()
    .describe('The description of the task for which a due date is needed.'),
});
export type SuggestDueDateInput = z.infer<typeof SuggestDueDateInputSchema>;

const SuggestDueDateOutputSchema = z.object({
  suggestedDueDate: z
    .string()
    .describe(
      'The suggested due date for the task, in ISO 8601 format (YYYY-MM-DD).'
    ),
  reasoning: z
    .string()
    .describe(
      'The reasoning behind the suggested due date, explaining why that date is appropriate.'
    ),
});
export type SuggestDueDateOutput = z.infer<typeof SuggestDueDateOutputSchema>;

export async function suggestDueDate(
  input: SuggestDueDateInput
): Promise<SuggestDueDateOutput> {
  return suggestDueDateFlow(input);
}

const suggestDueDatePrompt = ai.definePrompt({
  name: 'suggestDueDatePrompt',
  input: {schema: SuggestDueDateInputSchema},
  output: {schema: SuggestDueDateOutputSchema},
  prompt: `You are a helpful assistant that suggests due dates for tasks.

  Given the following task description, suggest a due date in ISO 8601 format (YYYY-MM-DD) and explain your reasoning.

  Task Description: {{{taskDescription}}}`,
});

const suggestDueDateFlow = ai.defineFlow(
  {
    name: 'suggestDueDateFlow',
    inputSchema: SuggestDueDateInputSchema,
    outputSchema: SuggestDueDateOutputSchema,
  },
  async input => {
    const {output} = await suggestDueDatePrompt(input);
    return output!;
  }
);
