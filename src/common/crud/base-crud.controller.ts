import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { BaseCrudService } from './base-crud.service';
import { FetchQuery } from '../fetch-query/crud.types';
import { FetchQueryParam } from '../decorators/fetch-query.decorator';

export type CrudControllerOptions = {
  createDto?: any;
  updateDto?: any;
};

export function BaseCrudController<TEntity>(options: CrudControllerOptions) {
  @Controller()
  class BaseCrudControllerHost {
    constructor(public readonly service: BaseCrudService<TEntity>) {}

    @Post()
    @ApiBody({ type: options.createDto })
    async create(@Body() dto: any): Promise<TEntity> {
      return await this.service.create(dto);
    }

    @Get()
    @ApiQuery({
      name: 'query',
      required: false,
      type: 'string',
    })
    async findAll(@FetchQueryParam() query: FetchQuery) {
      return await this.service.findAll(query);
    }

    @Get(':id')
    @ApiParam({ name: 'id' })
    async findOne(@Param('id') id: string): Promise<TEntity | null> {
      return await this.service.findOne(id);
    }

    @Put(':id')
    @ApiParam({ name: 'id' })
    @ApiBody({ type: options.updateDto })
    async update(@Param('id') id: string, @Body() dto: any): Promise<TEntity> {
      return await this.service.update(id, dto);
    }

    @Patch(':id')
    @ApiParam({ name: 'id' })
    @ApiBody({ type: options.updateDto })
    async patch(@Param('id') id: string, @Body() dto: any): Promise<TEntity> {
      return await this.service.update(id, dto);
    }

    @Delete(':id')
    @ApiParam({ name: 'id' })
    async softDelete(@Param('id') id: string): Promise<void> {
      await this.service.softDelete(id);
    }
  }

  return BaseCrudControllerHost;
}
