import { Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "@/common/decorators/roles.decorator";
import { ServiceRequestsService } from "./service-requests.service";

@ApiTags("Waiter")
@Controller("waiter/service-requests")
@Roles("WAITER")
export class ServiceRequestsController {
  constructor(
    private readonly serviceRequestsService: ServiceRequestsService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Open guest service requests" })
  list() {
    return this.serviceRequestsService.getOpenServiceRequests();
  }

  @Get(":id")
  @ApiOperation({ summary: "Service request with lines for POS prefill" })
  getOne(@Param("id") id: string) {
    return this.serviceRequestsService.getServiceRequest(id);
  }

  @Post(":id/acknowledge")
  @ApiOperation({ summary: "Acknowledge service request" })
  acknowledge(@Param("id") id: string) {
    return this.serviceRequestsService.acknowledgeServiceRequest(id);
  }
}
