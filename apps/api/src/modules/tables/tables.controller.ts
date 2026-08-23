import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CreateTableDto, UpdateTableDto } from './dto/table.dto';
import { TablesService } from './tables.service';

@ApiTags('Admin')
@Controller('admin/tables')
@Roles('ADMIN')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  @ApiOperation({ summary: 'List floor tables' })
  list() {
    return this.tablesService.listTables();
  }

  @Post()
  @ApiOperation({ summary: 'Create table' })
  create(@Body() body: CreateTableDto) {
    return this.tablesService.createTable(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update table' })
  update(@Param('id') id: string, @Body() body: UpdateTableDto) {
    return this.tablesService.updateTable(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete table' })
  delete(@Param('id') id: string) {
    return this.tablesService.deleteTable(id);
  }
}
