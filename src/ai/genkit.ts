
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai'; // Import the Google AI plugin

export const ai = genkit({
  plugins: [
    googleAI(), // Add the Google AI plugin to enable Gemini models
  ],
  model: 'googleai/gemini-1.5-flash-latest', // Set a default model for text generation
  // You can remove the 'model' line if you prefer to specify the model in each flow/prompt,
  // or if different flows use different models.
  // If you need image generation, you might use 'googleai/gemini-2.0-flash-exp' for those specific flows.
});
