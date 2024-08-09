import { Controller, Post, Req } from '@nestjs/common';
import { LineService } from './line.service';

@Controller('line')
export class LineController {
  constructor(private readonly lineService: LineService) {}

  @Post('/webhook')
  async lineWebhook(@Req() request: any): Promise<string> {
    return this.lineService.handleLineWebhook(request.body);
  }
}
