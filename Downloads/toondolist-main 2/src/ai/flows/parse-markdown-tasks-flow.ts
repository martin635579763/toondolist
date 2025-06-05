
'use server';
/**
 * @fileOverview Parses markdown text to extract structured task information using the 'marked' library.
 *
 * - parseMarkdownToTasks - A function that takes markdown and returns structured tasks.
 * - ParseMarkdownInput - The input type for the parseMarkdownToTasks function.
 * - ParseMarkdownOutput - The return type for the parseMarkdownToTasks function.
 */

import { marked, type Tokens } from 'marked';
import { z } from 'zod'; // Using Zod directly

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
        if (currentMainTask.description) {
          currentMainTask.description = currentMainTask.description.trim();
        }
        resultingTasks.push(currentMainTask);
      }
      currentMainTask = {
        title: token.text.trim(),
        subTasks: [],
      };
      collectingDescriptionForMainTask = true;
    } else if (currentMainTask) {
      if (collectingDescriptionForMainTask && (token.type === 'paragraph' || token.type === 'text' || token.type === 'space')) {
        if (token.type === 'paragraph' || token.type === 'text') {
           currentMainTask.description = (currentMainTask.description || '') + token.text.trim() + ' ';
        }
      } else if (token.type === 'list') {
        collectingDescriptionForMainTask = false;
        if (!currentMainTask.subTasks) {
          currentMainTask.subTasks = [];
        }
        for (const item of token.items) {
          let subTaskTitle = '';
          let subTaskDescription = '';
          let titleFound = false;

          if (item.tokens && item.tokens.length > 0) {
            let firstTextContent = '';
            // Process item.tokens to separate title and description
            for (let i = 0; i < item.tokens.length; i++) {
              const subToken = item.tokens[i];
              if (subToken.type === 'text' || subToken.type === 'paragraph') {
                const tokenText = (subToken as Tokens.Text | Tokens.Paragraph).text;
                if (!titleFound) {
                  // The first non-empty text or paragraph block is part of the title
                  firstTextContent += tokenText;
                  // If the token text contains newlines, only the first line is title
                  const lines = firstTextContent.trim().split('\n');
                  if (lines[0].trim()) {
                    subTaskTitle = lines[0].trim();
                    titleFound = true;
                    if (lines.length > 1) {
                      subTaskDescription += lines.slice(1).join('\n').trim() + ' ';
                    }
                    // If the current token had more lines, they are description.
                    // Any subsequent text/paragraph tokens are also description.
                    for (let j = i + 1; j < item.tokens.length; j++) {
                        const descToken = item.tokens[j];
                        if (descToken.type === 'text' || descToken.type === 'paragraph') {
                            subTaskDescription += (descToken as Tokens.Text | Tokens.Paragraph).text.trim() + ' ';
                        } else if (descToken.type === 'space' && subTaskDescription.length > 0 && !subTaskDescription.endsWith(' ')) {
                            subTaskDescription += ' ';
                        }
                    }
                    break; // Broke out of inner loop processing item.tokens
                  }
                }
              }
            }
             // If title was found this way, description is already populated or empty
          }

          if (!titleFound) {
            // Fallback: use item.text, split by newline for title and description
            const lines = item.text.trim().split('\n');
            subTaskTitle = lines[0].trim();
            if (lines.length > 1) {
              subTaskDescription = lines.slice(1).join('\n').trim();
            }
          }
          
          subTaskTitle = subTaskTitle.trim();
          subTaskDescription = subTaskDescription.trim();

          if (subTaskTitle) {
            currentMainTask.subTasks.push({ 
              title: subTaskTitle, 
              description: subTaskDescription || undefined 
            });
          }
        }
      } else if (token.type !== 'space') {
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

