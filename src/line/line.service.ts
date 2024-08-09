import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AssistantService } from '../assistant/assistant.service';

@Injectable()
export class LineService {
  constructor(
    private readonly httpService: HttpService,
    private readonly assistantService: AssistantService,
  ) {}

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
  getContent(id: string): Promise<Buffer> {
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
  convertToBase64(buffer: Buffer): string {
    return buffer.toString('base64');
  }

  async handleLineWebhook(body: any): Promise<string> {
    const events = body.events;
    if (events.length > 0) {
      for (const event of events) {
        switch (event.type) {
          case 'message':
            if (event.message.type === 'text') {
              const userMessage = event.message.text;
              const answer = await this.handeTextMessage(userMessage);
              await this.reply(event.replyToken, [
                { type: 'text', text: answer },
              ]);
            }
            if (event.message.type === 'image') {
              const data = await this.getContent(body.events[0].message.id);
              const base64Image = this.convertToBase64(data);
              const answer = await this.handleImageMessage(base64Image);
              await this.reply(event.replyToken, [
                { type: 'text', text: answer },
              ]);
            }
            break;
        }
      }
    } else {
      return 'Complete Webhook';
    }
  }
  async handeTextMessage(text: string): Promise<string> {
    return await this.assistantService.handleTextCompletion(text);
  }
  async handleImageMessage(base64Image: string): Promise<string> {
    return await this.assistantService.handleImageCompletion(base64Image);
  }
}
