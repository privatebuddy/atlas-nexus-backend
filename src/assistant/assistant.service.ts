import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { image_assistance_role, text_assistance_role } from './constants';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class AssistantService {
  openAI: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.openAI = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async handleTextCompletion(prompt: string): Promise<string> {
    const chat = await this.openAI.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: text_assistance_role.content,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return chat.choices[0].message.content;
  }
  async handleImageCompletion(base64Image: string): Promise<string> {
    const response = await this.openAI.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: image_assistance_role.content,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
    });

    return response.choices[0].message.content;
  }
}
