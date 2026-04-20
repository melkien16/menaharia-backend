import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class HubSeeder {
  private readonly logger = new Logger(HubSeeder.name);

  constructor(private readonly prisma: PrismaService) {}

  async run() {
    await this.seedHubs();
  }

  private async seedHubs() {
    const hubs = [
      {
        name: 'Addis Central Hub',
        city: 'Addis Ababa',
        address: 'Bole Atlas, Ring Road',
        phone: '+251911000001',
        managerName: 'Hana Bekele',
        capacity: 1000,
        isActive: true,
      },
      {
        name: 'Hawassa Hub',
        city: 'Hawassa',
        address: 'Central Business District',
        phone: '+251911000002',
        managerName: 'Tadesse Lemma',
        capacity: 500,
        isActive: true,
      },
      {
        name: 'Bahir Dar Hub',
        city: 'Bahir Dar',
        address: 'Lake Tana Area',
        phone: '+251911000003',
        managerName: 'Aster Yohannes',
        capacity: 400,
        isActive: true,
      },
      {
        name: 'Adama Hub',
        city: 'Adama',
        address: 'East Gate',
        phone: '+251911000004',
        managerName: 'Solomon Tadesse',
        capacity: 300,
        isActive: true,
      },
      {
        name: 'Dire Dawa Hub',
        city: 'Dire Dawa',
        address: 'Central Station',
        phone: '+251911000005',
        managerName: 'Fatuma Ali',
        capacity: 350,
        isActive: true,
      },
    ];

    for (const hubData of hubs) {
      // Check if hub with same name already exists
      const existingHub = await this.prisma.hub.findFirst({
        where: { name: hubData.name },
      });

      if (existingHub) {
        this.logger.log(`Hub "${hubData.name}" already exists, skipping...`);
        continue;
      }

      try {
        await this.prisma.hub.create({
          data: hubData,
        });
        this.logger.log(`✅ Hub "${hubData.name}" seeded successfully`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`❌ Failed to seed hub "${hubData.name}": ${errorMessage}`);
      }
    }

    // Now update locations using raw SQL
    await this.updateHubLocations();
  }

  private async updateHubLocations() {
    const hubLocations = [
      { name: 'Addis Central Hub', lon: 38.787, lat: 8.997 },
      { name: 'Hawassa Hub', lon: 38.47, lat: 7.05 },
      { name: 'Bahir Dar Hub', lon: 37.39, lat: 11.6 },
      { name: 'Adama Hub', lon: 39.27, lat: 8.42 },
      { name: 'Dire Dawa Hub', lon: 41.86, lat: 9.59 },
    ];

    for (const hub of hubLocations) {
      try {
        await this.prisma.$executeRaw`
          UPDATE hubs 
          SET location = ST_SetSRID(ST_MakePoint(${hub.lon}, ${hub.lat}), 4326)::geography
          WHERE name = ${hub.name}
        `;
        this.logger.log(`✅ Updated location for "${hub.name}"`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`⚠️ Could not update location for "${hub.name}": ${errorMessage}`);
      }
    }
  }
}
