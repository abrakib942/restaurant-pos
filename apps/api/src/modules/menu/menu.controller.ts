import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CreateMenuItemDto, MenuQueryDto, UpdateMenuItemDto } from './dto/menu.dto';
import { MenuService } from './menu.service';

@ApiTags('Admin')
@Controller('admin/menu')
@Roles('ADMIN')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @ApiOperation({ summary: 'List menu items and categories' })
  list(@Query() query: MenuQueryDto) {
    return this.menuService.listMenu(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create menu item' })
  create(@Body() body: CreateMenuItemDto) {
    return this.menuService.createMenuItem(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update menu item' })
  update(@Param('id') id: string, @Body() body: UpdateMenuItemDto) {
    return this.menuService.updateMenuItem(id, body);
  }

  @Post(':id/toggle')
  @ApiOperation({ summary: 'Toggle menu item availability' })
  toggle(@Param('id') id: string) {
    return this.menuService.toggleAvailability(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete menu item' })
  delete(@Param('id') id: string) {
    return this.menuService.deleteMenuItem(id);
  }
}
