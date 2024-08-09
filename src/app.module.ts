import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssistantModule } from './assistant/assistant.module';
import { ConfigModule } from '@nestjs/config';
import { LineModule } from './line/line.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AssistantModule, LineModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
