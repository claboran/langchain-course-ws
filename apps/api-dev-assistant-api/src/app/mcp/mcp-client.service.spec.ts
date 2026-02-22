import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MCPClientService } from './mcp-client.service';

/**
 * Simplified MCP Client Service tests
 * For real MCP integration testing, use a proper MCP server in integration tests
 */
describe('MCPClientService Unit Tests', () => {
  let service: MCPClientService;
  const originalEnv = process.env.MCP_SERVERS_CONFIG;

  afterEach(() => {
    // Restore original env
    if (originalEnv !== undefined) {
      process.env.MCP_SERVERS_CONFIG = originalEnv;
    } else {
      delete process.env.MCP_SERVERS_CONFIG;
    }
  });

  describe('basic functionality', () => {
    beforeEach(async () => {
      delete process.env.MCP_SERVERS_CONFIG;

      const module: TestingModule = await Test.createTestingModule({
        providers: [MCPClientService],
      }).compile();

      service = module.get<MCPClientService>(MCPClientService);
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should return empty tools when no config provided', async () => {
      await service.onModuleInit();

      const tools = service.getAvailableTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBe(0);
    });

    it('should return empty LangChain tools when no MCP servers connected', async () => {
      await service.onModuleInit();

      const langchainTools = service.getLangChainTools();
      expect(Array.isArray(langchainTools)).toBe(true);
      expect(langchainTools.length).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle invalid JSON in MCP_SERVERS_CONFIG', async () => {
      process.env.MCP_SERVERS_CONFIG = 'invalid-json';

      const module: TestingModule = await Test.createTestingModule({
        providers: [MCPClientService],
      }).compile();

      const testService = module.get<MCPClientService>(MCPClientService);
      await testService.onModuleInit();

      expect(testService).toBeDefined();
      expect(testService.getAvailableTools()).toEqual([]);
    });

    it('should handle non-array MCP_SERVERS_CONFIG', async () => {
      process.env.MCP_SERVERS_CONFIG = JSON.stringify({ notAnArray: true });

      const module: TestingModule = await Test.createTestingModule({
        providers: [MCPClientService],
      }).compile();

      const testService = module.get<MCPClientService>(MCPClientService);
      await testService.onModuleInit();

      expect(testService).toBeDefined();
      expect(testService.getAvailableTools()).toEqual([]);
    });

    it('should throw error when calling tool on non-existent server', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [MCPClientService],
      }).compile();

      const testService = module.get<MCPClientService>(MCPClientService);
      await testService.onModuleInit();

      await expect(
        testService.callTool('non-existent', 'tool', {})
      ).rejects.toThrow('MCP server not connected');
    });
  });
});
