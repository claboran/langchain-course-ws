import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatService {
  async chat(message: string): Promise<string> {
    // Placeholder for actual chat implementation
    return `Echo: ${message}`;
  }
}
