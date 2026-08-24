import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "@/common/decorators/public.decorator";
import {
  CreateGuestServiceRequestDto,
  SubmitGuestOrderDto,
} from "./dto/guest.dto";
import { GuestService } from "./guest.service";

@ApiTags("Guest")
@Controller("guest")
@Public()
export class GuestController {
  constructor(private readonly guestService: GuestService) {}

  @Get("menu/:qrSlug")
  @ApiOperation({ summary: "Public guest menu by QR slug" })
  getMenu(@Param("qrSlug") qrSlug: string) {
    return this.guestService.getGuestMenu(qrSlug);
  }

  @Get("order-status/:qrSlug")
  @ApiOperation({
    summary: "Guest order status, queue position, and pending waiter request",
  })
  getOrderStatus(@Param("qrSlug") qrSlug: string) {
    return this.guestService.getGuestOrderStatus(qrSlug);
  }

  @Post("orders")
  @ApiOperation({
    summary: "Deprecated — guests cannot send orders to the kitchen",
    deprecated: true,
  })
  submitOrder(@Body() body: SubmitGuestOrderDto) {
    return this.guestService.submitGuestOrder(body);
  }

  @Post("service-requests")
  @ApiOperation({ summary: "Call waiter (optional cart) or request bill" })
  createServiceRequest(@Body() body: CreateGuestServiceRequestDto) {
    return this.guestService.createGuestServiceRequest(body);
  }
}
