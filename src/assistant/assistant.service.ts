import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { HttpService } from '@nestjs/axios';
import { image_assistance_role, text_assistance_role } from './constants';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class AssistantService {
  openAI: OpenAI;
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.openAI = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  reply(token: string, payload: { type: string; text: string }[]) {
    return this.httpService.axiosRef({
      method: 'post',
      url: `https://api.line.me/v2/bot/message/reply`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      data: { replyToken: token, messages: payload },
    });
  }

  getContentData(id: string): Promise<Buffer> {
    return this.httpService.axiosRef({
      method: 'get',
      url: `https://api-data.line.me/v2/bot/message/${id}/content`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      responseType: 'arraybuffer',
    });
  }

  async convertToBase64(buffer: Buffer): Promise<string> {
    return buffer.toString('base64');
  }

  async handleLineWebhook(body: any): Promise<string> {
    if (body.events.length > 0) {
      if (body.events[0].message.type === 'text') {
        const answer = await this.handleTextCompletion(
          body.events[0].message.text,
        );
        await this.reply(body.events[0].replyToken, [
          { type: 'text', text: answer },
        ]);
      }
      if (body.events[0].message.type === 'image') {
        const data = (await this.getContentData(
          body.events[0].message.id,
        )) as any;
        const base64Image = await this.convertToBase64(data.data);
        const answer = await this.handleImageCompletion(base64Image);
        await this.reply(body.events[0].replyToken, [
          { type: 'text', text: answer },
        ]);
      }
    }

    return 'Hello, World!';
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
