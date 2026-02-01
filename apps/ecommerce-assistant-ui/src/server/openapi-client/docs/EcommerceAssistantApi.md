# EcommerceAssistantApi

All URIs are relative to *http://localhost:3312*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**ecommerceAssistantControllerContinueConversation**](EcommerceAssistantApi.md#ecommerceassistantcontrollercontinueconversation) | **PUT** /api/ecommerce-assistant/{conversationId} | Continue an existing conversation |
| [**ecommerceAssistantControllerCreateConversation**](EcommerceAssistantApi.md#ecommerceassistantcontrollercreateconversation) | **POST** /api/ecommerce-assistant | Start a new e-commerce conversation |
| [**ecommerceAssistantControllerRemoveConversation**](EcommerceAssistantApi.md#ecommerceassistantcontrollerremoveconversation) | **DELETE** /api/ecommerce-assistant/{conversationId} | Remove a conversation |



## ecommerceAssistantControllerContinueConversation

> ConversationResponseDto ecommerceAssistantControllerContinueConversation(conversationId, continueConversationRequestDto)

Continue an existing conversation

Send follow-up messages using the conversationId from the initial request

### Example

```ts
import {
  Configuration,
  EcommerceAssistantApi,
} from '';
import type { EcommerceAssistantControllerContinueConversationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new EcommerceAssistantApi();

  const body = {
    // string | The conversation ID returned from the initial request
    conversationId: 38400000-8cf0-11bd-b23e-10b96e4ef00d,
    // ContinueConversationRequestDto
    continueConversationRequestDto: {"message":"Do you have anything by Agatha Christie?"},
  } satisfies EcommerceAssistantControllerContinueConversationRequest;

  try {
    const data = await api.ecommerceAssistantControllerContinueConversation(body);
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
| **conversationId** | `string` | The conversation ID returned from the initial request | [Defaults to `undefined`] |
| **continueConversationRequestDto** | [ContinueConversationRequestDto](ContinueConversationRequestDto.md) |  | |

### Return type

[**ConversationResponseDto**](ConversationResponseDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Conversation continued |  -  |
| **400** | Bad request |  -  |
| **404** | Conversation not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## ecommerceAssistantControllerCreateConversation

> ConversationResponseDto ecommerceAssistantControllerCreateConversation(newConversationRequestDto)

Start a new e-commerce conversation

Create a new conversation with the e-commerce assistant. Ask about products or shop categories.

### Example

```ts
import {
  Configuration,
  EcommerceAssistantApi,
} from '';
import type { EcommerceAssistantControllerCreateConversationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new EcommerceAssistantApi();

  const body = {
    // NewConversationRequestDto
    newConversationRequestDto: {"message":"I need a good mystery book"},
  } satisfies EcommerceAssistantControllerCreateConversationRequest;

  try {
    const data = await api.ecommerceAssistantControllerCreateConversation(body);
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
| **newConversationRequestDto** | [NewConversationRequestDto](NewConversationRequestDto.md) |  | |

### Return type

[**ConversationResponseDto**](ConversationResponseDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Conversation created |  -  |
| **400** | Bad request |  -  |
| **500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## ecommerceAssistantControllerRemoveConversation

> EcommerceAssistantControllerRemoveConversation200Response ecommerceAssistantControllerRemoveConversation(conversationId)

Remove a conversation

Delete conversation and its history from memory

### Example

```ts
import {
  Configuration,
  EcommerceAssistantApi,
} from '';
import type { EcommerceAssistantControllerRemoveConversationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new EcommerceAssistantApi();

  const body = {
    // string | The conversation ID to delete
    conversationId: 38400000-8cf0-11bd-b23e-10b96e4ef00d,
  } satisfies EcommerceAssistantControllerRemoveConversationRequest;

  try {
    const data = await api.ecommerceAssistantControllerRemoveConversation(body);
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
| **conversationId** | `string` | The conversation ID to delete | [Defaults to `undefined`] |

### Return type

[**EcommerceAssistantControllerRemoveConversation200Response**](EcommerceAssistantControllerRemoveConversation200Response.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Conversation removed |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

