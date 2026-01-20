# ChatApi

All URIs are relative to *http://localhost:3311*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**chatControllerChat**](ChatApi.md#chatcontrollerchat) | **POST** /api/chat | Send a message to the chat assistant |



## chatControllerChat

> ChatResponseDto chatControllerChat(chatRequestDto)

Send a message to the chat assistant

Send a message to the AI assistant and receive a response. The conversation is maintained using the conversationId, allowing for multi-turn conversations with context. The assistant has access to user information for personalization.

### Example

```ts
import {
  Configuration,
  ChatApi,
} from '';
import type { ChatControllerChatRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ChatApi();

  const body = {
    // ChatRequestDto | Chat request containing the message, user name, and conversation ID
    chatRequestDto: {"message":"Hello! What can you help me with?","user":"John Doe","conversationId":"550e8400-e29b-41d4-a716-446655440000"},
  } satisfies ChatControllerChatRequest;

  try {
    const data = await api.chatControllerChat(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **chatRequestDto** | [ChatRequestDto](ChatRequestDto.md) | Chat request containing the message, user name, and conversation ID | |

### Return type

[**ChatResponseDto**](ChatResponseDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successfully received a response from the assistant |  -  |
| **400** | Bad request - invalid input data (e.g., missing required fields, invalid UUID format) |  -  |
| **500** | Internal server error - failed to get response from AI |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

