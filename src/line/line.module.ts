import { Module } from '@nestjs/common';
import { LineService } from './line.service';
import { LineController } from './line.controller';
import { HttpModule } from '@nestjs/axios';
import { AssistantModule } from '../assistant/assistant.module';

@Module({
  imports: [AssistantModule, HttpModule],
  providers: [LineService],
  controllers: [LineController],
})
export class LineModule {}
