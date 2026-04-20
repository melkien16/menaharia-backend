import { Module } from '@nestjs/common';
import { DataSeeder } from './data-seeder.seed';
import { HubSeeder } from './hub.seeder';

@Module({
  providers: [DataSeeder, HubSeeder],
  exports: [DataSeeder, HubSeeder],
})
export class SeedModule {}
