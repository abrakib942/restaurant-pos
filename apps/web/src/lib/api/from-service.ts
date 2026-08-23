import {
  handleRouteError,
  jsonError,
  jsonOk,
} from "@/lib/api/envelope";
import {
  serviceToHttpStatus,
  type ServiceResult,
} from "@/lib/services/result";

export function fromService<T>(result: ServiceResult<T>) {
  if (!result.ok) {
    return jsonError(result.error, serviceToHttpStatus(result));
  }
  return jsonOk(result.data, { message: result.message });
}

export { handleRouteError };
