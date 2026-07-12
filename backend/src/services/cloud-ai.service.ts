import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HfInference } from '@huggingface/inference';
import { Observable } from 'rxjs';

@Injectable()
export class CloudAiService {
  private readonly logger = new Logger(CloudAiService.name);
  private hf: HfInference | null = null;
  private chatModel = 'Qwen/Qwen2.5-72B-Instruct';
  private imageModel = 'black-forest-labs/FLUX.1-schnell';
  private speechModel = 'openai/whisper-large-v3';

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('HF_TOKEN');
    this.chatModel = this.configService.get<string>('HF_CHAT_MODEL') || this.chatModel;
    this.imageModel = this.configService.get<string>('HF_IMAGE_MODEL') || this.imageModel;
    this.speechModel = this.configService.get<string>('HF_SPEECH_MODEL') || this.speechModel;

    if (token) {
      this.hf = new HfInference(token);
      this.logger.log(`HuggingFace Client initialized with token. Chat model: ${this.chatModel}`);
    } else {
      this.logger.warn('HF_TOKEN is missing. Cloud AI will run in DEMO mode.');
    }
  }

  public isTokenConfigured(): boolean {
    return this.hf !== null;
  }

  streamChat(
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
    options?: { temperature?: number; topP?: number; maxTokens?: number }
  ): Observable<{ content: string; done: boolean }> {
    return new Observable((subscriber) => {
      if (!this.hf) {
        // Simulated Demo Mode Response
        this.streamDemoResponse(subscriber);
        return;
      }

      const temperature = options?.temperature ?? 0.7;
      const topP = options?.topP ?? 0.9;
      const maxTokens = options?.maxTokens ?? 1024;

      (async () => {
        try {
          const stream = this.hf!.chatCompletionStream({
            model: this.chatModel,
            messages,
            max_tokens: maxTokens,
            temperature,
            top_p: topP,
          });

          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content || '';
            if (delta) {
              subscriber.next({ content: delta, done: false });
            }
          }
          subscriber.next({ content: '', done: true });
          subscriber.complete();
        } catch (error) {
          this.logger.error('Error in HuggingFace streaming chat:', error);
          subscriber.next({
            content: `\n\n[Error from Hugging Face Inference API]: ${error.message || error}. Ensure your HF_TOKEN is valid and the model is loaded.`,
            done: true,
          });
          subscriber.complete();
        }
      })();
    });
  }

  private streamDemoResponse(subscriber: any) {
    const demoMessage = `⚠️ **Demo Mode Active** (HF_TOKEN is not configured in backend/.env).\n\nHere is a simulated response to demonstrate markdown support:\n\n### 📦 Shared Interface Code\n\`\`\`typescript\ninterface Message {\n  id: string;\n  role: 'user' | 'assistant';\n  content: string;\n}\n\`\`\`\n\n- To use the live cloud LLM, add your \`HF_TOKEN\` to the \`.env\` file.\n- In local mode, you can connect directly to your local **Ollama** server.\n\nWhat would you like to explore next?`;
    let index = 0;
    const interval = setInterval(() => {
      if (index < demoMessage.length) {
        const chunk = demoMessage.slice(index, index + 8);
        index += 8;
        subscriber.next({ content: chunk, done: false });
      } else {
        clearInterval(interval);
        subscriber.next({ content: '', done: true });
        subscriber.complete();
      }
    }, 30);
  }

  async generateImage(prompt: string): Promise<{ base64Url: string }> {
    if (!this.hf) {
      // Return a simulated image (e.g. placeholder or nice default generated UI image)
      this.logger.warn('HF_TOKEN missing - returning demo image placeholder');
      // A small base64 transparent pixel or SVG placeholder
      return {
        base64Url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="%231f2937"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="sans-serif" font-size="20">Demo Image: HF_TOKEN required</text></svg>`,
      };
    }

    try {
      this.logger.log(`Generating image for prompt: "${prompt}" using model ${this.imageModel}`);
      const blob = await this.hf.textToImage({
        model: this.imageModel,
        inputs: prompt,
      });

      const buffer = Buffer.from(await (blob as any).arrayBuffer());
      const base64 = buffer.toString('base64');
      return {
        base64Url: `data:image/png;base64,${base64}`,
      };
    } catch (error) {
      this.logger.error('Error generating image from HuggingFace:', error);
      throw new Error(`Failed to generate image: ${error.message || error}`);
    }
  }

  async transcribeSpeech(audioBuffer: Buffer, mimeType: string): Promise<{ text: string }> {
    if (!this.hf) {
      this.logger.warn('HF_TOKEN missing - returning demo audio text');
      return {
        text: 'Speech transcription demo mode (HF_TOKEN not set). Set the token in .env to transcribe live audio recordings.',
      };
    }

    try {
      this.logger.log(`Transcribing audio buffer using model ${this.speechModel}`);
      const audioBlob = new Blob([audioBuffer as any], { type: mimeType || 'audio/wav' });
      const result = await this.hf.automaticSpeechRecognition({
        model: this.speechModel,
        data: audioBlob as any,
      });
      return {
        text: result.text || '',
      };
    } catch (error) {
      this.logger.error('Error transcribing audio from HuggingFace:', error);
      throw new Error(`Failed to transcribe audio: ${error.message || error}`);
    }
  }
}
