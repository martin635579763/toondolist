import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-due-date.ts';
import '@/ai/flows/suggest-task-breakdown.ts';
import '@/ai/flows/parse-markdown-tasks-flow.ts';
