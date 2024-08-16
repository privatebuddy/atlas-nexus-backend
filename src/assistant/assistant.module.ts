import { Module } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { AssistantController } from './assistant.controller';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';
import { assistantProviders } from './assistant.providers';

@Module({
  imports: [HttpModule, DatabaseModule],
  providers: [AssistantService, ...assistantProviders],
  controllers: [AssistantController],
  exports: [AssistantService],
})
export class AssistantModule {}
