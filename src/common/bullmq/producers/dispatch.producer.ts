import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueNames, JobNames } from '../bull.constants';

export interface AutoAssignDriverJobData {
  shipmentId: string;
  legId?: string;
}

@Injectable()
export class DispatchProducer {
  private readonly logger = new Logger(DispatchProducer.name);

  constructor(
    @InjectQueue(QueueNames.DISPATCH)
    private readonly dispatchQueue: Queue,
  ) {}

  /**
   * Schedule auto-assignment of a driver after a delay
   * If admin manually assigns before the delay, the job will be ignored
   */
  async scheduleAutoAssign(data: AutoAssignDriverJobData, delayMinutes: number = 5): Promise<void> {
    try {
      await this.dispatchQueue.add(JobNames.AUTO_ASSIGN_DRIVER, data, {
        delay: delayMinutes * 60 * 1000, // Convert minutes to milliseconds
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000, // 1 minute initial delay
        },
        removeOnComplete: true,
        removeOnFail: false,
      });
      this.logger.log(
        `Scheduled auto-assignment for shipment ${data.shipmentId} in ${delayMinutes} minutes`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to schedule auto-assignment for shipment ${data.shipmentId}: ${String(error)}`,
      );
    }
  }

  /**
   * Remove pending auto-assignment job (when admin manually assigns)
   */
  async cancelAutoAssign(shipmentId: string): Promise<void> {
    try {
      const jobs = await this.dispatchQueue.getJobs(['waiting', 'delayed']);
      for (const job of jobs) {
        if (job.data.shipmentId === shipmentId && job.name === JobNames.AUTO_ASSIGN_DRIVER) {
          await job.remove();
          this.logger.log(`Cancelled pending auto-assignment for shipment ${shipmentId}`);
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to cancel auto-assignment for shipment ${shipmentId}: ${String(error)}`,
      );
    }
  }
}
