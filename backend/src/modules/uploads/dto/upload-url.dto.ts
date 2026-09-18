import { IsUrl, MaxLength } from 'class-validator';

export class UploadUrlDto {
  /** URL remota (http/https) da imagem a ser baixada e armazenada localmente. */
  @IsUrl(
    { require_protocol: true, protocols: ['http', 'https'] },
    { message: 'imageUrl must be a valid http(s) URL' },
  )
  @MaxLength(2048)
  imageUrl!: string;
}
