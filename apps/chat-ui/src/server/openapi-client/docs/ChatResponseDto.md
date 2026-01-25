
# ChatResponseDto


## Properties

Name | Type
------------ | -------------
`message` | string
`conversationId` | string
`confidence` | number
`hasMarkdown` | boolean

## Example

```typescript
import type { ChatResponseDto } from ''

// TODO: Update the object below with actual values
const example = {
  "message": Hello Alice Johnson! I'd be happy to help you understand multi-turn conversations. They allow us to maintain context across multiple exchanges, so I can remember what we've discussed earlier in our conversation.,
  "conversationId": 550e8400-e29b-41d4-a716-446655440000,
  "confidence": 0.95,
  "hasMarkdown": false,
} satisfies ChatResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ChatResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


