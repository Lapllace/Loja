import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ImageSearchService } from './image-search.service';
import { ImageSuggestionsService } from './image-suggestions.service';
import {
  SearchProductImagesDto,
  DownloadSelectedImagesDto,
  ImportSelectedImagesDto,
} from './image-search.dto';

@Controller('developer/image-search')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER)
export class ImageSearchController {
  constructor(
    private readonly imageSearchService: ImageSearchService,
    private readonly suggestionsService: ImageSuggestionsService,
  ) {}

  /**
   * Sugestões de pesquisa (Google Autocomplete via SerpApi).
   *
   * Auxilia a UX do campo de busca — é SEPARADO da pesquisa de imagens, que
   * continua em POST /search. Retorna no máximo 3 sugestões.
   */
  @Get('suggestions')
  suggestions(@Query('q') q?: string) {
    return this.suggestionsService.suggest(q ?? '');
  }

  @Post('search')
  search(@Body() dto: SearchProductImagesDto) {
    return this.imageSearchService.search(dto);
  }

  @Post('download')
  download(@Body() dto: DownloadSelectedImagesDto) {
    return this.imageSearchService.downloadSelected(dto);
  }

  /**
   * Importa imagens selecionadas para um produto.
   *
   * Usado pelo formulario de produto DEPOIS que o Product ja existe (criado no
   * passo anterior). Aceita o mesmo contrato de `download`; exposto como rota
   * propria para o fluxo de cadastro/edicao ficar explicito.
   */
  @Post('import')
  import(@Body() dto: ImportSelectedImagesDto) {
    return this.imageSearchService.downloadSelected(dto);
  }
}
