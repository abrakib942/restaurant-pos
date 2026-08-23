import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  createErrorResult,
  createSuccessResult,
  ServiceResult,
} from '@/common/interfaces/service-result.interface';

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

export type UploadedMenuImage = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

@Injectable()
export class UploadService {
  async uploadMenuImage(
    file: UploadedMenuImage | undefined,
  ): Promise<ServiceResult<{ url: string }>> {
    if (!file || file.size === 0) {
      return createErrorResult(
        { name: 'badRequest', message: 'Choose an image file' },
        'Choose an image file',
      ) as ServiceResult<{ url: string }>;
    }
    if (file.size > MAX_BYTES) {
      return createErrorResult(
        { name: 'badRequest', message: 'Image must be 2 MB or smaller' },
        'Image must be 2 MB or smaller',
      ) as ServiceResult<{ url: string }>;
    }

    const ext = ALLOWED.get(file.mimetype);
    if (!ext) {
      return createErrorResult(
        { name: 'badRequest', message: 'Use JPEG, PNG, or WebP' },
        'Use JPEG, PNG, or WebP',
      ) as ServiceResult<{ url: string }>;
    }

    const dir = path.resolve(process.cwd(), '../web/public/uploads/menu');
    await mkdir(dir, { recursive: true });

    const filename = `${randomUUID()}.${ext}`;
    await writeFile(path.join(dir, filename), file.buffer);

    return createSuccessResult(
      { url: `/uploads/menu/${filename}` },
      'Image uploaded',
    );
  }
}
