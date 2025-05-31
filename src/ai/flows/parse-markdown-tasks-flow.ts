
'use server';
/**
 * @fileOverview Parses markdown text to extract structured task information using the 'marked' library.
 *
 * - parseMarkdownToTasks - A function that takes markdown and returns structured tasks.
 * - ParseMarkdownInput - The input type for the parseMarkdownToTasks function.
 * - ParseMarkdownOutput - The return type for the parseMarkdownToTasks function.
 */

import { marked, type Tokens } from 'marked';
import { z } from 'genkit/zod'; // Using genkit's Zod for consistency if other flows use it

const ParseMarkdownInputSchema = z.object({
  markdownContent: z.string().describe('The markdown string containing task definitions.'),
});
export type ParseMarkdownInput = z.infer<typeof ParseMarkdownInputSchema>;

const SubTaskSchema = z.object({
  title: z.string().describe('The title of the sub-task.'),
  description: z.string().optional().describe('The description of the sub-task.'),
});
export type SubTask = z.infer<typeof SubTaskSchema>;

const ParsedTaskSchema = z.object({
  title: z.string().describe('The title of the main task.'),
  description: z.string().optional().describe('The description of the main task.'),
  dueDateString: z.string().optional().describe('This field will not be populated by the non-AI parser.'),
  assignedRolesString: z.string().optional().describe('This field will not be populated by the non-AI parser.'),
  subTasks: z.array(SubTaskSchema).optional().describe('An array of sub-tasks for this main task.'),
});
export type ParsedTask = z.infer<typeof ParsedTaskSchema>;

const ParseMarkdownOutputSchema = z.object({
  parsedTasks: z.array(ParsedTaskSchema).describe('An array of parsed main tasks and their sub-tasks.'),
});
export type ParseMarkdownOutput = z.infer<typeof ParseMarkdownOutputSchema>;

export async function parseMarkdownToTasks(
  input: ParseMarkdownInput
): Promise<ParseMarkdownOutput> {
  const { markdownContent } = input;
  if (!markdownContent || markdownContent.trim() === "") {
    return { parsedTasks: [] };
  }

  const tokens = marked.lexer(markdownContent);
  const resultingTasks: ParsedTask[] = [];
  let currentMainTask: ParsedTask | null = null;
  let collectingDescriptionForMainTask = false;

  for (const token of tokens) {
    if (token.type === 'heading' && (token.depth === 1 || token.depth === 2 || token.depth === 3)) {
      if (currentMainTask) {
        resultingTasks.push(currentMainTask);
      }
      currentMainTask = {
        title: token.text.trim(),
        subTasks: [],
      };
      collectingDescriptionForMainTask = true; // Start collecting description for this new main task
    } else if (currentMainTask) {
      if (collectingDescriptionForMainTask && (token.type === 'paragraph' || token.type === 'text' || token.type === 'space')) {
        if (token.type === 'paragraph' || token.type === 'text') {
           currentMainTask.description = (currentMainTask.description || '') + token.text.trim() + ' ';
        }
        // If it's just a space token, we continue, description might span multiple text/paragraph tokens separated by space.
      } else if (token.type === 'list') {
        collectingDescriptionForMainTask = false; // Stop collecting description once a list starts
        if (!currentMainTask.subTasks) {
          currentMainTask.subTasks = [];
        }
        for (const item of token.items) {
          // item.text often contains the core content for simple list items.
          // For items with nested paragraphs, item.tokens is more reliable.
          let subTaskTitle = '';
          if (item.tokens && item.tokens.length > 0) {
            // Concatenate text from all paragraph/text tokens within the list item's direct children
            // This aims to capture multi-line list items as a single title.
            let textContent = '';
            function extractTextFromTokens(subTokens: Tokens.Token[]) {
              for (const subToken of subTokens) {
                if (subToken.type === 'text' || subToken.type === 'paragraph') {
                   textContent += (subToken as Tokens.Text | Tokens.Paragraph).text + ' ';
                } else if ('tokens' in subToken && subToken.tokens) { // Recurse for nested structures like blockquotes in list items
                    extractTextFromTokens(subToken.tokens);
                }
              }
            }
            extractTextFromTokens(item.tokens);
            subTaskTitle = textContent.trim();
          } else {
             subTaskTitle = item.text.trim(); // Fallback for very simple list items
          }
          
          if (subTaskTitle) {
            currentMainTask.subTasks.push({ title: subTaskTitle });
          }
        }
      } else if (token.type !== 'space') {
        // If we encounter something other than a heading, list, paragraph, text, or space after a main task,
        // stop collecting description for the current main task.
        collectingDescriptionForMainTask = false;
      }
      if (currentMainTask.description) {
        currentMainTask.description = currentMainTask.description.trim();
      }
    }
  }

  if (currentMainTask) {
    if (currentMainTask.description) {
      currentMainTask.description = currentMainTask.description.trim();
    }
    resultingTasks.push(currentMainTask);
  }
  
  return { parsedTasks: resultingTasks };
}
