import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CategoriesService } from './categories.service';

@ApiTags('Admin')
@Controller('admin/categories')
@Roles('ADMIN')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List menu categories' })
  list() {
    return this.categoriesService.listCategories();
  }

  @Post()
  @ApiOperation({ summary: 'Create category' })
  create(@Body() body: CreateCategoryDto) {
    return this.categoriesService.createCategory(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update category' })
  update(@Param('id') id: string, @Body() body: UpdateCategoryDto) {
    return this.categoriesService.updateCategory(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete category' })
  delete(@Param('id') id: string) {
    return this.categoriesService.deleteCategory(id);
  }
}
