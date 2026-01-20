
# ChatControllerChat500Response


## Properties

Name | Type
------------ | -------------
`statusCode` | number
`message` | string

## Example

```typescript
import type { ChatControllerChat500Response } from ''

// TODO: Update the object below with actual values
const example = {
  "statusCode": 500,
  "message": Failed to get response from AI: Connection timeout,
} satisfies ChatControllerChat500Response

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ChatControllerChat500Response
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


