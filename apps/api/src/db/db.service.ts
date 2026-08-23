import { Injectable } from '@nestjs/common';
import { prisma } from '@repo/db';

@Injectable()
export class DbService {
  readonly client = prisma;
}
