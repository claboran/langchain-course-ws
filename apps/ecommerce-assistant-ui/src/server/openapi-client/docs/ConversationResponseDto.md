
# ConversationResponseDto


## Properties

Name | Type
------------ | -------------
`summary` | string
`products` | Array&lt;object&gt;
`hasProducts` | boolean
`hasMarkdown` | boolean
`conversationId` | string

## Example

```typescript
import type { ConversationResponseDto } from ''

// TODO: Update the object below with actual values
const example = {
  "summary": I found 3 mystery books for you...,
  "products": [{"content":"The Murder of Roger Ackroyd by Agatha Christie...","metadata":{"id":"abc-123","category":"books"}}],
  "hasProducts": true,
  "hasMarkdown": true,
  "conversationId": 550e8400-e29b-41d4-a716-446655440000,
} satisfies ConversationResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ConversationResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


