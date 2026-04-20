import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { JobNames, QueueNames } from '../bull.constants';
import { AutoAssignDriverJobData } from '../producers/dispatch.producer';
import { DispatchService } from '../../../modules/dispatch/service/dispatch.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ShipmentLegStatusEnum,
  ShipmentLegTypeEnum,
  TransactionStatusEnum,
  TransactionTypeEnum,
} from '@prisma/client';

@Processor(QueueNames.DISPATCH)
export class DispatchProcessor extends WorkerHost {
  private readonly logger = new Logger(DispatchProcessor.name);

  constructor(
    private readonly dispatchService: DispatchService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    switch (job.name) {
      case JobNames.AUTO_ASSIGN_DRIVER:
        return this.handleAutoAssignDriver(job.data as AutoAssignDriverJobData);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  /**
   * Handle auto-assignment of a driver
   * Only assign if no driver has been manually assigned yet
   */
  private async handleAutoAssignDriver(data: AutoAssignDriverJobData): Promise<void> {
    const { shipmentId, legId } = data;
    this.logger.log(`Processing auto-assignment for shipment ${shipmentId}`);

    try {
      // Check if shipment still exists and has a pending leg
      const shipment = await this.prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          legs: true,
        },
      });

      if (!shipment) {
        this.logger.warn(`Shipment ${shipmentId} not found - skipping auto-assignment`);
        return;
      }

      const successfulCourierPayment = await this.prisma.transaction.findFirst({
        where: {
          shipmentId,
          type: TransactionTypeEnum.COURIER_PAYMENT,
          status: TransactionStatusEnum.SUCCESS,
        },
        select: { id: true },
      });

      if (shipment.shipmentSource === 'pure_courier' && !successfulCourierPayment) {
        this.logger.warn(`Shipment ${shipmentId} is not paid - skipping auto-assignment`);
        return;
      }

      // Find pending leg(s)
      const pendingLegs =
        shipment.legs?.filter(
          (l) =>
            l.status === ShipmentLegStatusEnum.pending &&
            (legId ? l.id === legId : l.legType === ShipmentLegTypeEnum.pickup),
        ) || [];

      if (!pendingLegs || pendingLegs.length === 0) {
        this.logger.warn(`No pending legs for shipment ${shipmentId} - skipping auto-assignment`);
        return;
      }

      const targetLeg = legId ? pendingLegs.find((l) => l.id === legId) : pendingLegs[0];

      if (!targetLeg) {
        this.logger.warn(`Target leg not found for shipment ${shipmentId}`);
        return;
      }

      // Check if already assigned
      if (targetLeg.assignedDriverId) {
        this.logger.log(
          `Shipment ${shipmentId} already has driver ${targetLeg.assignedDriverId} - skipping auto-assignment`,
        );
        return;
      }

      // Proceed with auto-assignment
      const result = await this.dispatchService.autoAssign(shipmentId, { legId: targetLeg.id });
      this.logger.log(`Auto-assigned driver ${result.driverId} for shipment ${shipmentId}`);
    } catch (error) {
      this.logger.error(
        `Failed to auto-assign driver for shipment ${shipmentId}: ${String(error)}`,
      );
      throw error; // Re-throw to trigger retry
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Job ${job.id} completed for shipment ${job.data.shipmentId}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed for shipment ${job.data.shipmentId}: ${error.message}`);
  }
}
