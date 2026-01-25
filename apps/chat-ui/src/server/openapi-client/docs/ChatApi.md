# ChatApi

All URIs are relative to *http://localhost:3311*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**chatControllerContinueConversation**](ChatApi.md#chatcontrollercontinueconversation) | **PUT** /api/chat/{conversationId} | Continue an existing conversation |
| [**chatControllerCreateConversation**](ChatApi.md#chatcontrollercreateconversation) | **POST** /api/chat | Start a new conversation |
| [**chatControllerRemoveConversation**](ChatApi.md#chatcontrollerremoveconversation) | **DELETE** /api/chat/{conversationId} | Remove a conversation |



## chatControllerContinueConversation

> ChatResponseDto chatControllerContinueConversation(conversationId, continueChatRequestDto)

Continue an existing conversation

Send a follow-up message to an existing conversation. Use the conversationId returned from the initial POST request.

### Example

```ts
import {
  Configuration,
  ChatApi,
} from '';
import type { ChatControllerContinueConversationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ChatApi();

  const body = {
    // string | UUID of the conversation to continue
    conversationId: 550e8400-e29b-41d4-a716-446655440000,
    // ContinueChatRequestDto | Chat request containing the message and user name
    continueChatRequestDto: {"message":"Can you tell me more about that?","user":"John Doe"},
  } satisfies ChatControllerContinueConversationRequest;

  try {
    const data = await api.chatControllerContinueConversation(body);
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
| **conversationId** | `string` | UUID of the conversation to continue | [Defaults to `undefined`] |
| **continueChatRequestDto** | [ContinueChatRequestDto](ContinueChatRequestDto.md) | Chat request containing the message and user name | |

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


## chatControllerCreateConversation

> ChatResponseDto chatControllerCreateConversation(newChatRequestDto)

Start a new conversation

Create a new conversation with the AI assistant. The server will generate and return a conversationId that should be used for follow-up messages.

### Example

```ts
import {
  Configuration,
  ChatApi,
} from '';
import type { ChatControllerCreateConversationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ChatApi();

  const body = {
    // NewChatRequestDto | New chat request containing the first message and user name
    newChatRequestDto: {"message":"Hello! What can you help me with?","user":"John Doe"},
  } satisfies ChatControllerCreateConversationRequest;

  try {
    const data = await api.chatControllerCreateConversation(body);
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
| **newChatRequestDto** | [NewChatRequestDto](NewChatRequestDto.md) | New chat request containing the first message and user name | |

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
| **201** | Successfully created a new conversation and received a response |  -  |
| **400** | Bad request - invalid input data (e.g., missing required fields) |  -  |
| **500** | Internal server error - failed to get response from AI |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## chatControllerRemoveConversation

> ChatControllerRemoveConversation200Response chatControllerRemoveConversation(conversationId)

Remove a conversation

Delete a conversation and its entire message history by conversationId

### Example

```ts
import {
  Configuration,
  ChatApi,
} from '';
import type { ChatControllerRemoveConversationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ChatApi();

  const body = {
    // string | UUID of the conversation to remove
    conversationId: 550e8400-e29b-41d4-a716-446655440000,
  } satisfies ChatControllerRemoveConversationRequest;

  try {
    const data = await api.chatControllerRemoveConversation(body);
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
| **conversationId** | `string` | UUID of the conversation to remove | [Defaults to `undefined`] |

### Return type

[**ChatControllerRemoveConversation200Response**](ChatControllerRemoveConversation200Response.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Conversation successfully removed |  -  |
| **400** | Bad request - invalid UUID format |  -  |
| **500** | Internal server error - failed to remove conversation |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

