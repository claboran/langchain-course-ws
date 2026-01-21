# LangChain Course Workspace

Welcome to the **LangChain Course Workspace**, a comprehensive monorepo showcasing a full-stack AI-powered chat application. This project demonstrates the integration of modern web technologies with advanced AI orchestration using LangChain and LangGraph.

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

---

## 🚀 Overview

This repository is built as an [Nx workspace](https://nx.dev) and contains a suite of applications and libraries designed to provide a seamless multi-turn conversation experience. It leverages **NestJS** for the backend, **AnalogJS/Angular** for the frontend, and **LangChain/LangGraph** for AI logic.

### Key Features
- **Multi-turn Conversations**: Context-aware chat with memory persistence using LangGraph.
- **AI Orchestration**: Advanced agent logic with LangChain, featuring custom tools for personalization.
- **Reactive Frontend**: A modern UI built with Angular Signals and NgRx Signal Store.
- **Type-Safe API**: Shared Zod schemas for end-to-end type safety between the UI and API.
- **MistralAI Integration**: Dedicated model provider library for Mistral AI services.

---

## 🏗️ Project Structure

The workspace is organized into several applications and libraries:

### Applications
- **`chat-api` (`apps/chat-api`)**: A NestJS backend providing the AI chat logic.
  - Implements LangGraph `MemorySaver` for conversation threading.
  - Custom LangChain tools for user personalization.
  - Swagger UI for interactive API documentation.
- **`chat-ui` (`apps/chat-ui`)**: An AnalogJS/Angular frontend.
  - Uses NgRx Signal Store for reactive state management.
  - Shared Zod schemas for validation and type safety.
  - Proxy-based integration with the backend.
- **`hello-agent` (`apps/hello-agent`)**: A CLI tool built with Nest Commander for quick AI interactions.

### Libraries
- **`chat-components` (`libs/chat-components`)**: Reusable Angular UI components (message bubbles, markdown rendering).
- **`model-provider` (`libs/model-provider`)**: A shared library for MistralAI configuration and integration.

---

## 🛠️ Tech Stack

- **Frameworks**: [Nx](https://nx.dev), [NestJS](https://nestjs.com/), [Angular](https://angular.io/) (via [AnalogJS](https://analogjs.org/))
- **AI Logic**: [LangChain](https://js.langchain.com/), [LangGraph](https://langchain-ai.github.io/langgraphjs/)
- **State Management**: NgRx Signal Store
- **Styling**: Tailwind CSS, DaisyUI
- **Validation**: Zod, class-validator
- **Database/Memory**: LangGraph Checkpointers (In-memory)
- **API Documentation**: Swagger/OpenAPI

---

## 🚦 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn
- A Mistral AI API Key

### Installation

1. Clone the repository:
   ```sh
   git clone <repository-url>
   cd langchain-course-ws
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your Mistral API key:
   ```env
   MISTRAL_API_KEY=your_api_key_here
   ```

### Running the Application

You can run both the frontend and backend simultaneously using Nx:

```sh
# Start both chat-api and chat-ui
npm run dev
```

Alternatively, run them individually:
```sh
# Start Backend (API)
npm run chat-api:dev

# Start Frontend (UI)
npm run chat-ui:dev
```

### Using the CLI Agent
```sh
npm run hello-agent:dev -- chat "Hello, how are you?"
```

---

## 🧪 Testing

The workspace uses Vitest for unit testing and Playwright for E2E testing.

```sh
# Run all tests
npx nx run-many -t test

# Run specific project tests
npm run chat-api:test
npm run chat-ui:test
npm run chat-components:test
```

---

## 🔧 Useful Nx Commands

- **Visual Graph**: `npx nx graph` - See how projects depend on each other.
- **Generate Code**: `npx nx g @nx/angular:component my-component --project=chat-ui`
- **Linting**: `npx nx run-many -t lint`

---

## 📖 Documentation & Links

- [Nx Documentation](https://nx.dev)
- [LangChain JS Docs](https://js.langchain.com/)
- [LangGraph JS Docs](https://langchain-ai.github.io/langgraphjs/)
- [AnalogJS Docs](https://analogjs.org/)

Made with ❤️ as part of the LangChain Course.
