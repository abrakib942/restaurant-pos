/**
 * Service Result Interface
 *
 * Best Practice Pattern for Service Return Values in NestJS:
 *
 * ERROR HANDLING STRATEGY:
 *
 * 1. SERVICE LAYER (try-catch):
 *    - Handle BUSINESS LOGIC ERRORS (validation, not found, unauthorized)
 *    - Return ServiceResult with success: false for expected errors
 *    - DO NOT catch unexpected errors (DB connection, system errors)
 *    - Let unexpected errors bubble up to Exception Filter
 *
 * 2. TRANSFORM INTERCEPTOR:
 *    - Convert ServiceResult to ApiResponse
 *    - Convert ServiceResult errors to HttpException
 *    - DO NOT catch exceptions - let them bubble to Exception Filter
 *
 * 3. EXCEPTION FILTER:
 *    - Handle ALL unhandled exceptions
 *    - Format error responses consistently
 *    - Log errors for monitoring
 *
 * ERROR TYPES:
 *
 * Business Logic Errors (handle in service, return ServiceResult):
 * - Validation errors (badRequest)
 * - Not found errors (badRequest)
 * - Unauthorized access (unauthorized)
 * - Forbidden access (forbidden)
 * - Business rule violations
 *
 * System Errors (let bubble up, handled by Exception Filter):
 * - Database connection errors
 * - Network errors
 * - Unexpected exceptions
 * - System failures
 *
 * @example
 * ```typescript
 * // GOOD: Handle business logic errors, let system errors bubble up
 * async getUser(id: number): Promise<ServiceResult<User>> {
 *   // Handle business logic error
 *   if (!id || id <= 0) {
 *     return createErrorResult(
 *       { name: 'badRequest', message: 'Invalid user ID' }
 *     );
 *   }
 *
 *   // Let unexpected errors bubble up (DB connection, etc.)
 *   const user = await this.db.user.findUnique({ where: { id } });
 *
 *   if (!user) {
 *     return createErrorResult(
 *       { name: 'badRequest', message: 'User not found' }
 *     );
 *   }
 *
 *   return createSuccessResult(user, 'User retrieved successfully');
 * }
 *
 * // BAD: Catching all errors
 * async getUser(id: number): Promise<ServiceResult<User>> {
 *   try {
 *     // This catches ALL errors including system errors
 *     const user = await this.db.user.findUnique({ where: { id } });
 *     return createSuccessResult(user);
 *   } catch (error) {
 *     // System errors should bubble up, not be caught here
 *     return createErrorResult(error);
 *   }
 * }
 * ```
 */

/**
 * Error structure for service results
 * Used for business logic errors that should be converted to HTTP responses
 */
export interface ServiceError {
  name: 'badRequest' | 'unauthorized' | 'forbidden' | 'notImplemented' | 'internalServerError';
  message: string;
}

/**
 * Service Result Type
 *
 * Services should return this structure for BUSINESS LOGIC ERRORS only.
 * System errors (DB connection, unexpected exceptions) should bubble up.
 *
 * @template T - The type of data being returned
 */
export interface ServiceResult<T = unknown> {
  /**
   * Indicates whether the operation was successful
   */
  success: boolean;

  /**
   * Optional success message (will be used in API response)
   */
  message?: string;

  /**
   * The actual data returned (only present when success is true)
   */
  data?: T;

  /**
   * Error information (only present when success is false)
   * Should be a ServiceError for business logic errors
   */
  error?: ServiceError;
}

/**
 * Helper function to create a successful service result
 *
 * @param data - The data to return
 * @param message - Optional success message
 * @returns ServiceResult with success: true
 */
export function createSuccessResult<T>(data: T, message?: string): ServiceResult<T> {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * Helper function to create a failed service result
 *
 * @param error - The ServiceError object (business logic error)
 * @param message - Optional error message (overrides error.message if provided)
 * @returns ServiceResult with success: false
 */
export function createErrorResult(error: ServiceError, message?: string): ServiceResult {
  return {
    success: false,
    error,
    message,
  };
}
