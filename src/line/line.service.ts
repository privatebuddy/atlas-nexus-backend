import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AssistantService } from '../assistant/assistant.service';
import axios from 'axios';

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
              await this.showLoading(event.source.userId);
              // await this.answerAsFlexMessage(event.replyToken, userMessage);
              const answer = await this.handeTextMessage(
                userMessage,
                event.source.userId,
              );
              if (answer.isPR) {
                await this.answerAsFlexMessage(
                  event.replyToken,
                  answer.message,
                );
              } else {
                await this.reply(event.replyToken, [
                  { type: 'text', text: answer.message },
                ]);
              }
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
  async handeTextMessage(
    text: string,
    userId: string,
  ): Promise<{
    message: string;
    isPR?: boolean;
  }> {
    return await this.assistantService.completeManualChat({
      userId,
      message: text,
    });
    // return await this.assistantService.handleTextCompletion(text);
  }
  async handleImageMessage(base64Image: string): Promise<string> {
    return await this.assistantService.handleImageCompletion(base64Image);
  }

  async answerAsFlexMessage(replyToken: string, answer: string) {
    const flexMessage = {
      type: 'bubble',
      hero: {
        type: 'image',
        url: 'https://developers-resource.landpress.line.me/fx/img/01_1_cafe.png',
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover',
        action: {
          type: 'uri',
          uri: 'https://line.me/',
        },
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'PR ของคุณพร้อมแล้ว',
            weight: 'bold',
            size: 'xl',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'link',
            height: 'sm',
            action: {
              type: 'uri',
              label: 'เปิด',
              uri: 'https://line.me/',
            },
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [],
            margin: 'sm',
          },
        ],
        flex: 0,
      },
    };
    await this.httpService
      .axiosRef({
        method: 'post',
        url: `https://api.line.me/v2/bot/message/reply`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        data: {
          replyToken: replyToken,
          messages: [
            {
              type: 'flex',
              altText: 'This is a Flex Message',
              contents: flexMessage,
            },
          ],
        },
      })
      .catch((err) => {
        console.log(err);
      });
  }

  async showLoading(userId: string) {
    return axios({
      method: 'post',
      url: 'https://api.line.me/v2/bot/chat/loading/start',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      data: { chatId: userId },
    }).catch((err) => {
      console.log(err);
    });
  }
}
