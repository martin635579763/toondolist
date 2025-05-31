
'use server';
/**
 * @fileOverview An AI agent that parses markdown text to extract structured task information.
 *
 * - parseMarkdownToTasks - A function that takes markdown and returns structured tasks.
 * - ParseMarkdownInput - The input type for the parseMarkdownToTasks function.
 * - ParseMarkdownOutput - The return type for the parseMarkdownToTasks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ParseMarkdownInputSchema = z.object({
  markdownContent: z.string().describe('The markdown string containing task definitions.'),
});
export type ParseMarkdownInput = z.infer<typeof ParseMarkdownInputSchema>;

const SubTaskSchema = z.object({
  title: z.string().describe('The title of the sub-task.'),
  description: z.string().optional().describe('The description of the sub-task.'),
});

const ParsedTaskSchema = z.object({
  title: z.string().describe('The title of the main task.'),
  description: z.string().optional().describe('The description of the main task.'),
  dueDateString: z.string().optional().describe('A textual representation of a due date found in the markdown (e.g., "next Friday", "2024-12-25", "in 2 weeks"). The AI should extract this if present but not attempt to convert it to ISO format.'),
  assignedRolesString: z.string().optional().describe('Comma-separated list of roles or people mentioned for this task (e.g., "designer, developer", "needs a writer").'),
  subTasks: z.array(SubTaskSchema).optional().describe('An array of sub-tasks for this main task. Sub-tasks are typically bullet points under a main task heading (before the next main task heading) should be considered direct sub-tasks of that main task.'),
});

const ParseMarkdownOutputSchema = z.object({
  parsedTasks: z.array(ParsedTaskSchema).describe('An array of parsed main tasks and their sub-tasks.'),
});
export type ParseMarkdownOutput = z.infer<typeof ParseMarkdownOutputSchema>;

export async function parseMarkdownToTasks(
  input: ParseMarkdownInput
): Promise<ParseMarkdownOutput> {
  if (!ai || !ai.plugins || ai.plugins.length === 0) {
    console.warn("AI plugin not configured or unavailable. Markdown parsing will be skipped.");
    return {
        parsedTasks: [],
    };
  }
  return parseMarkdownToTasksFlow(input);
}

const parseMarkdownPrompt = ai.definePrompt({
  name: 'parseMarkdownPrompt',
  input: {schema: ParseMarkdownInputSchema},
  output: {schema: ParseMarkdownOutputSchema},
  prompt: `You are an expert at parsing markdown text to extract structured task information.
The user will provide markdown text. Your goal is to identify main tasks and any associated sub-tasks.

Guidelines for identification:
- Main Tasks: Often start with H1, H2, H3 headings (e.g., "# Task Title"), or could be simple lines of text intended as a main task.
- Sub-Tasks: Typically bullet points (e.g., "- Sub-task 1", "* Sub-task 2") appearing under a main task. All identified bullet points under a main task heading (before the next main task heading) should be considered direct sub-tasks of that main task.
- Descriptions: Text following a task/sub-task title, or on subsequent lines before the next distinct task/sub-task, should be captured as its description.
- Due Dates: Look for phrases like "due by tomorrow", "deadline next Monday", "due Dec 25", "in 3 days". Extract the textual phrase as 'dueDateString'. Do not attempt to convert it to a specific date format.
- Roles: Look for mentions of roles or assignments like "needs a designer", "assign to dev team", "requires a proofreader", or lists of people. Extract these as a comma-separated string for 'assignedRolesString' for the main task. Sub-tasks generally do not have roles parsed separately in this simplified context.

Output Format:
Return a JSON object that conforms to the output schema.
Specifically, provide an array called 'parsedTasks'. Each element in this array should be a main task object.
Each main task object can have a 'subTasks' array for its corresponding sub-tasks.
If no tasks are found, return an empty 'parsedTasks' array.

Example Markdown:
# Project Alpha
This is the main project.
- Design phase
  - Create mockups for UI
- Development phase (needs a developer, designer)
  - Build frontend due next Friday
  - Develop backend
## Quick errand
Pick up dry cleaning due by 5 PM

Expected Output Structure (Conceptual - AI should fill values):
{
  "parsedTasks": [
    {
      "title": "Project Alpha",
      "description": "This is the main project.",
      "assignedRolesString": "developer, designer",
      "subTasks": [
        { "title": "Design phase" },
        { "title": "Create mockups for UI" },
        { "title": "Development phase" },
        { "title": "Build frontend", "dueDateString": "next Friday" },
        { "title": "Develop backend" }
      ]
    },
    {
      "title": "Quick errand",
      "description": "Pick up dry cleaning",
      "dueDateString": "by 5 PM"
    }
  ]
}

Markdown Input:
{{{markdownContent}}}
`,
});


const parseMarkdownToTasksFlow = ai.defineFlow(
  {
    name: 'parseMarkdownToTasksFlow',
    inputSchema: ParseMarkdownInputSchema,
    outputSchema: ParseMarkdownOutputSchema,
  },
  async (input: ParseMarkdownInput) => {
    const {output} = await parseMarkdownPrompt(input);
    if (!output) {
        // If the model returns nothing or an unexpected format, provide an empty valid response.
        return { parsedTasks: [] };
    }
    return output;
  }
);

