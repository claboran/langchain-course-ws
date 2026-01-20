
# ChatRequestDto


## Properties

Name | Type
------------ | -------------
`message` | string
`user` | string
`conversationId` | string

## Example

```typescript
import type { ChatRequestDto } from ''

// TODO: Update the object below with actual values
const example = {
  "message": Hello! Can you help me understand how multi-turn conversations work?,
  "user": Alice Johnson,
  "conversationId": 550e8400-e29b-41d4-a716-446655440000,
} satisfies ChatRequestDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ChatRequestDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


