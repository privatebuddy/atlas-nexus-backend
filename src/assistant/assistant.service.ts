import { Inject, Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import {
  image_assistance_role,
  text_assistance_role,
  USER_MODEL,
} from './constants';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { ManualChatDto } from './dto/manual-chat.dto';
import { User } from './interfaces/user.interface';

@Injectable()
export class AssistantService {
  openAI: OpenAI;

  constructor(
    @Inject(USER_MODEL)
    private userModel: Model<User>,
    private readonly configService: ConfigService,
  ) {
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

  async checkUserThread(userId: string): Promise<string> {
    const user = await this.userModel.findOne({ userId, status: 'WIP' }).exec();
    return user ? user.threadId : 'not found';
  }

  async createNewUserThread(userId: string): Promise<string> {
    const emptyThread = await this.openAI.beta.threads.create();
    const user = new this.userModel({
      userId,
      threadId: emptyThread.id,
      status: 'WIP',
    });
    await user.save();
    return emptyThread.id;
  }

  async completeManualChat(manualChat: ManualChatDto): Promise<{
    message: string;
    isPR?: boolean;
  }> {
    let threadId = '';
    let isPR = false;
    threadId = await this.checkUserThread(manualChat.userId);
    if (threadId === 'not found') {
      threadId = await this.createNewUserThread(manualChat.userId);
    }
    await this.openAI.beta.threads.messages.create(threadId, {
      role: 'user',
      content: manualChat.message,
    });
    let run = await this.openAI.beta.threads.runs.create(threadId, {
      assistant_id: 'asst_USQ88HLGWP81vix6pWk0eWgI',
    });
    // Wait for completion
    while (run.status !== 'completed') {
      if (
        run.status === 'requires_action' &&
        run.required_action.type === 'submit_tool_outputs'
      ) {
        const toolOutputs = await this.getToolOutputs(run);
        await this.openAI.beta.threads.runs.submitToolOutputs(
          threadId,
          run.id,
          {
            tool_outputs: [toolOutputs],
          },
        );
        isPR = true;
      }

      // Be nice to the API
      await this.sleep(500);
      run = await this.openAI.beta.threads.runs.retrieve(threadId, run.id);
    }
    const threadMessages =
      await this.openAI.beta.threads.messages.list(threadId);
    const firstMessageContent = threadMessages.data[0].content[0];

    if ('text' in firstMessageContent) {
      const messageText = firstMessageContent.text.value;

      // Check if the response contains a request to create a PR
      // if (messageText.includes('createPR')) {
      //   const { uid, userId, items } = this.parsePRRequest(messageText);
      //
      //   // Call the createPR function
      //   const prResponse = await this.createPR(uid, userId, items);
      //
      //   console.log(`PR Created: ${JSON.stringify(prResponse)}`);
      //   return `PR created with UID: ${prResponse.uid}`;
      // }

      return {
        message: messageText,
        isPR: isPR,
      };
    } else {
      throw new Error(
        'Text content or function call not found in the first message',
      );
    }
  }

  private async handleRequiredAction(run: any): Promise<string | null> {
    console.log(run);
    // Example of how to handle a required action. Adjust based on your specific case.
    if (run.required_action === 'confirm') {
      // Automatically confirm action
      return 'Confirmed'; // or some logic to generate the appropriate response
    } else if (run.required_action === 'provide_more_info') {
      // You might need to gather more info from the user
      return 'Please provide additional information on ...';
    }

    // If the action can't be handled automatically, return null or throw an error
    return null;
  }

  private async createPR(
    uid: string,
    userId: string,
    items: { name: string; amount: number }[],
  ): Promise<any> {
    const pr = {
      uid,
      userId,
      items,
      status: 'created',
      createdAt: new Date(),
    };

    console.log('PR Created:', pr);

    return pr;
  }

  private parsePRRequest(message: string): {
    uid: string;
    userId: string;
    items: { name: string; amount: number }[];
  } {
    // Placeholder logic for extracting PR data from the message
    const uid = 'extracted-uid'; // Extract the UID from the message
    const userId = 'extracted-userid'; // Extract the User ID from the message
    const items = [{ name: 'item1', amount: 10 }]; // Extract the items from the message

    return { uid, userId, items };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async getToolOutputs(run: any): Promise<any> {
    const toolCall = run.required_action.submit_tool_outputs.tool_calls[0];
    const toolCallId = toolCall.id;
    const functionName = toolCall.function.name;
    const functionArguments = toolCall.function.arguments;
    if (functionName === 'createPR') {
      const { uid, userId, items } = JSON.parse(functionArguments);
      const pr = this.createPR(uid, userId, items);
      return {
        tool_call_id: toolCallId,
        output: JSON.stringify(pr),
      };
    }
    // Logic to extract or generate the outputs expected by the assistant
    // This will depend on the specific tool used and what outputs it generates
    return {
      tool_call_id: toolCallId,
      output: 'Error tool call not found',
    };
  }
}
