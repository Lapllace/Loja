import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ImageSearchService } from './image-search.service';
import { ImageSuggestionsService } from './image-suggestions.service';
import { ImageSearchController } from './image-search.controller';
import { PrismaModule } from '../../database/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [ConfigModule, PrismaModule, UploadsModule],
  controllers: [ImageSearchController],
  providers: [ImageSearchService, ImageSuggestionsService],
  exports: [ImageSearchService, ImageSuggestionsService],
})
export class ImageSearchModule {}
