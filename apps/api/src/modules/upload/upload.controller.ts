import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { UploadService, type UploadedMenuImage } from './upload.service';

@ApiTags('Admin')
@Controller('admin/menu')
@Roles('ADMIN')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload menu item image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: UploadedMenuImage) {
    return this.uploadService.uploadMenuImage(file);
  }
}
