import { Controller, Post, Req } from '@nestjs/common';
import { AssistantService } from './assistant.service';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('/webhook')
  async lineWebhook(@Req() request: any): Promise<string> {
    return this.assistantService.handleLineWebhook(request.body);
  }
}
