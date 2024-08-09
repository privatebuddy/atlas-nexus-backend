import { Module } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { AssistantController } from './assistant.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [AssistantService],
  controllers: [AssistantController],
  exports: [AssistantService],
})
export class AssistantModule {}
