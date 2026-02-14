import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import {
  safeParseOrThrow,
  validateConversationIdOrThrow,
  callWithErrorHandling,
} from './utils';

describe('Communication Utils', () => {
  describe('safeParseOrThrow', () => {
    const TestSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    it('should return parsed data when validation succeeds', () => {
      const data = { name: 'John', age: 30 };
      const result = safeParseOrThrow(TestSchema, data);
      expect(result).toEqual(data);
    });

    it('should throw error with default options when validation fails', () => {
      const invalidData = { name: 'John', age: 'thirty' };

      expect(() => safeParseOrThrow(TestSchema, invalidData)).toThrow();

      try {
        safeParseOrThrow(TestSchema, invalidData);
      } catch (error: any) {
        expect(error.statusCode).toBe(400);
        expect(error.statusMessage).toBe('Validation Error');
        expect(error.data.message).toBe('Validation failed');
        expect(error.data.errors).toBeDefined();
      }
    });

    it('should throw error with custom options when validation fails', () => {
      const invalidData = { name: 'John' };
      const customOpts = {
        statusCode: 422,
        statusMessage: 'Custom Error',
        message: 'Custom validation message',
      };

      try {
        safeParseOrThrow(TestSchema, invalidData, customOpts);
      } catch (error: any) {
        expect(error.statusCode).toBe(422);
        expect(error.statusMessage).toBe('Custom Error');
        expect(error.data.message).toBe('Custom validation message');
      }
    });

    it('should handle complex nested schemas', () => {
      const NestedSchema = z.object({
        user: z.object({
          profile: z.object({
            email: z.string().email(),
          }),
        }),
      });

      const validData = {
        user: { profile: { email: 'test@example.com' } },
      };

      const result = safeParseOrThrow(NestedSchema, validData);
      expect(result).toEqual(validData);
    });
  });

  describe('validateConversationIdOrThrow', () => {
    const UuidSchema = z.string().uuid();

    it('should return valid UUID string when validation succeeds', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const result = validateConversationIdOrThrow(validUuid, UuidSchema);
      expect(result).toBe(validUuid);
    });

    it('should throw error with default message when UUID is invalid', () => {
      const invalidUuid = 'not-a-uuid';

      try {
        validateConversationIdOrThrow(invalidUuid, UuidSchema);
      } catch (error: any) {
        expect(error.statusCode).toBe(400);
        expect(error.statusMessage).toBe('Bad Request');
        expect(error.data.message).toBe('conversationId must be a valid UUID');
      }
    });

    it('should throw error with custom param name', () => {
      const invalidUuid = 'not-a-uuid';

      try {
        validateConversationIdOrThrow(invalidUuid, UuidSchema, {
          paramName: 'threadId',
        });
      } catch (error: any) {
        expect(error.data.message).toBe('threadId must be a valid UUID');
      }
    });

    it('should handle null and undefined values', () => {
      expect(() => validateConversationIdOrThrow(null, UuidSchema)).toThrow();
      expect(() =>
        validateConversationIdOrThrow(undefined, UuidSchema),
      ).toThrow();
    });

    it('should handle non-string values', () => {
      expect(() => validateConversationIdOrThrow(12345, UuidSchema)).toThrow();
      expect(() => validateConversationIdOrThrow({}, UuidSchema)).toThrow();
    });
  });

  describe('callWithErrorHandling', () => {
    it('should return result when function succeeds', async () => {
      const successFn = async () => 'success result';
      const result = await callWithErrorHandling(successFn);
      expect(result).toBe('success result');
    });

    it('should return complex objects when function succeeds', async () => {
      const complexResult = { data: [1, 2, 3], meta: { count: 3 } };
      const successFn = async () => complexResult;
      const result = await callWithErrorHandling(successFn);
      expect(result).toEqual(complexResult);
    });

    it('should handle errors with response object', async () => {
      const mockError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          text: async () => 'Resource not found',
        },
      };

      const errorFn = async () => {
        throw mockError;
      };

      try {
        await callWithErrorHandling(errorFn, 'TestAPI');
      } catch (error: any) {
        expect(error.statusCode).toBe(404);
        expect(error.statusMessage).toBe('TestAPI Error');
        expect(error.data.message).toBe('Failed to get response from TestAPI');
        expect(error.data.details).toBe('Not Found');
      }
    });

    it('should handle errors with default name when name not provided', async () => {
      const mockError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => 'Server error',
        },
      };

      const errorFn = async () => {
        throw mockError;
      };

      try {
        await callWithErrorHandling(errorFn);
      } catch (error: any) {
        expect(error.statusMessage).toBe('API Error');
        expect(error.data.message).toBe('Failed to get response from API');
      }
    });

    it('should handle errors without status code', async () => {
      const mockError = {
        response: {
          statusText: 'Unknown Error',
          text: async () => 'Unknown error occurred',
        },
      };

      const errorFn = async () => {
        throw mockError;
      };

      try {
        await callWithErrorHandling(errorFn, 'CustomAPI');
      } catch (error: any) {
        expect(error.statusCode).toBe(500);
        expect(error.statusMessage).toBe('CustomAPI Error');
      }
    });

    it('should handle errors when response.text() throws', async () => {
      const mockError = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          text: async () => {
            throw new Error('Cannot read response');
          },
        },
      };

      const errorFn = async () => {
        throw mockError;
      };

      try {
        await callWithErrorHandling(errorFn, 'ErrorAPI');
      } catch (error: any) {
        expect(error.statusCode).toBe(400);
        expect(error.statusMessage).toBe('ErrorAPI Error');
      }
    });

    it('should handle unexpected errors without response object', async () => {
      const unexpectedError = new Error('Network failure');
      const errorFn = async () => {
        throw unexpectedError;
      };

      try {
        await callWithErrorHandling(errorFn, 'FailingAPI');
      } catch (error: any) {
        expect(error.statusCode).toBe(500);
        expect(error.statusMessage).toBe('FailingAPI Error');
        expect(error.data.message).toBe(
          'Failed to get response from FailingAPI',
        );
      }
    });

    it('should handle string errors', async () => {
      const errorFn = async () => {
        throw 'String error message';
      };

      try {
        await callWithErrorHandling(errorFn);
      } catch (error: any) {
        expect(error.statusCode).toBe(500);
        expect(error.statusMessage).toBe('API Error');
      }
    });

    it('should preserve console.error calls', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const mockError = {
        response: {
          status: 403,
          statusText: 'Forbidden',
          text: async () => 'Access denied',
        },
      };

      const errorFn = async () => {
        throw mockError;
      };

      try {
        await callWithErrorHandling(errorFn, 'SecureAPI');
      } catch {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'SecureAPI Error:',
          expect.objectContaining({
            status: 403,
            statusText: 'Forbidden',
          }),
        );
      }

      consoleErrorSpy.mockRestore();
    });
  });
});
