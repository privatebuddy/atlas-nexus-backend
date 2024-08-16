import { Body, Controller, Post } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { ManualChatDto } from './dto/manual-chat.dto';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('manual-chat')
  async handleManualChat(@Body() manualChat: ManualChatDto) {
    return await this.assistantService.completeManualChat(manualChat);
  }
}
