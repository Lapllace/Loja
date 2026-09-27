import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ImageSearchController } from './image-search.controller';
import { ImageSearchService } from './image-search.service';
import { DeveloperGuard } from './developer.guard';

@Module({
  imports: [ConfigModule],
  controllers: [ImageSearchController],
  providers: [ImageSearchService, DeveloperGuard],
  exports: [ImageSearchService],
})
export class ImageSearchModule {}
