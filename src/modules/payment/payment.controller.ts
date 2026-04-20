import { Body, Controller, Get, Param, Post, Query, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from 'src/common/authorization/decorators/public.decorator';
import { Roles } from 'src/common/authorization/decorators/roles.decorator';
import { SystemRolesEnum } from 'src/common/enums/users/roles.enum';
import {
  InitiatePaymentDto,
  PaymentCallbackDto,
  PaymentQueryDto,
} from './dto/payment.dto';
import { PaymentService } from './payment.service';

@ApiTags('payments')
@Controller({ path: 'payments', version: '1' })
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  @ApiBearerAuth()
  @Roles(SystemRolesEnum.ADMIN, SystemRolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'List payments' })
  list(@Query() query: PaymentQueryDto) {
    return this.paymentService.list(query);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment by id' })
  getById(@Param('id') id: string) {
    return this.paymentService.getById(id);
  }

  @Post('initiate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate payment for a pending booking' })
  initiate(@Body() dto: InitiatePaymentDto) {
    return this.paymentService.initiatePayment(dto);
  }

  @Post('callback')
  @AllowAnonymous()
  @ApiOperation({ summary: 'Receive payment provider callback' })
  callback(@Body() dto: PaymentCallbackDto) {
    return this.paymentService.handleCallback(dto);
  }
}
