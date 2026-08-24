import { Body, Controller, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "@/common/decorators/roles.decorator";
import {
  CurrentUser,
  type AuthUser,
} from "@/common/decorators/current-user.decorator";
import { GenerateBillDto, PayBillDto } from "./dto/service.dto";
import { ServiceService } from "./service.service";

@ApiTags("Waiter")
@Controller("waiter")
@Roles("WAITER")
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Post("items/:id/served")
  @ApiOperation({ summary: "Mark ready item as served" })
  markServed(@Param("id") id: string) {
    return this.serviceService.markItemServed(id);
  }

  @Post("fires/:id/served")
  @ApiOperation({ summary: "Mark a fully ready fire as served" })
  markFireServed(@Param("id") id: string) {
    return this.serviceService.markFireServed(id);
  }

  @Post("tables/:tableId/bill")
  @ApiOperation({ summary: "Generate bill for open check" })
  generateBill(
    @Param("tableId") tableId: string,
    @Body() body: Omit<GenerateBillDto, "tableId">,
    @CurrentUser() user: AuthUser,
  ) {
    return this.serviceService.generateBill(
      { ...body, tableId },
      { userId: user.userId, name: user.name },
    );
  }

  @Post("tables/:tableId/pay")
  @ApiOperation({ summary: "Mark bill as paid" })
  payBill(
    @Param("tableId") tableId: string,
    @Body() body: Omit<PayBillDto, "tableId">,
    @CurrentUser() user: AuthUser,
  ) {
    return this.serviceService.markBillPaid(
      { ...body, tableId },
      { userId: user.userId, name: user.name },
    );
  }
}
