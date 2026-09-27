import { Body, Controller, Post, UseGuards } from '@nestjs/common';
// Ajuste este import para o JwtAuthGuard real do seu backend.
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { DeveloperGuard } from './developer.guard';
import { DownloadSelectedImagesDto, SearchProductImagesDto } from './image-search.dto';
import { ImageSearchService } from './image-search.service';

@Controller('developer/image-search')
@UseGuards(JwtAuthGuard, DeveloperGuard)
export class ImageSearchController {
  constructor(private readonly service: ImageSearchService) {}

  @Post('search')
  search(@Body() dto: SearchProductImagesDto) {
    return this.service.search(dto);
  }

  @Post('download')
  download(@Body() dto: DownloadSelectedImagesDto) {
    return this.service.downloadSelected(dto, dto.images);
  }
}
