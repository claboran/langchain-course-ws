
# ChatControllerRemoveConversation400Response


## Properties

Name | Type
------------ | -------------
`statusCode` | number
`message` | Array&lt;string&gt;
`error` | string

## Example

```typescript
import type { ChatControllerRemoveConversation400Response } from ''

// TODO: Update the object below with actual values
const example = {
  "statusCode": 400,
  "message": ["conversationId must be a UUID"],
  "error": Bad Request,
} satisfies ChatControllerRemoveConversation400Response

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ChatControllerRemoveConversation400Response
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


