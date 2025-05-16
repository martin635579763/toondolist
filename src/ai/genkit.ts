import {genkit} from 'genkit';
// import {googleAI} from '@genkit-ai/googleai'; // Google AI plugin import commented out to prevent usage of Gemini API key.

export const ai = genkit({
  plugins: [], // Google AI plugin removed. AI features relying on Gemini will not work.
  // model: 'googleai/gemini-2.0-flash', // Default model commented out as it's provided by the Google AI plugin.
});
