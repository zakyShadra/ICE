import { PrismaClient } from '@prisma/client';
import {
  AiRouter,
  AnthropicProviderAdapter,
  Agent,
  Brain,
  CapabilityBasedStrategy,
  ContextBuilder,
  ConversationManager,
  Executor,
  GoogleProviderAdapter,
  IceEventBus,
  type IMemory,
  ModelRegistry,
  Observer,
  OllamaProviderAdapter,
  OpenAiProviderAdapter,
  OpenRouterProviderAdapter,
  Planner,
  PermissionManager,
  PrismaMemoryRepository,
  ProviderRegistry,
  PromptBuilder,
  ToolRegistry,
  WorkflowEngine,
  textTruncateTool,
} from '@ice/core';
import type { IceConfig } from '@ice/config';
import { PinoObserverSink } from '../logging/logger.js';
import type pino from 'pino';
import { AuthService } from '../modules/auth/application/auth.service.js';
import { SupabaseIdentityProvider } from '../modules/auth/infrastructure/supabase-identity-provider.js';
import { ProfileService } from '../modules/profile/application/profile.service.js';
import { PrismaProfileRepository } from '../modules/profile/infrastructure/prisma-profile.repository.js';
import { ChatService } from '../modules/chat/application/chat.service.js';
import { PrismaChatRepository } from '../modules/chat/infrastructure/prisma-chat.repository.js';
import { ProjectService } from '../modules/projects/application/project.service.js';
import { PrismaProjectRepository } from '../modules/projects/infrastructure/prisma-project.repository.js';
import { FileService } from '../modules/files/application/file.service.js';
import { PrismaFileMetadataRepository } from '../modules/files/infrastructure/prisma-file-metadata.repository.js';
import { SupabaseObjectStorage } from '../modules/files/infrastructure/supabase-object-storage.js';
import { SettingsService } from '../modules/settings/application/settings.service.js';
import { PrismaSettingsRepository } from '../modules/settings/infrastructure/prisma-settings.repository.js';
import {
  BackendFileContextProvider,
  BackendProjectContextProvider,
  BackendUserProfileContextProvider,
} from './context-providers.js';

/**
 * Composition root — Document 2, Section 7.2: the ONLY place in the
 * entire backend allowed to instantiate concrete implementations
 * (Prisma client, provider adapters, identity provider) and wire them
 * into interfaces. Every other file receives what it needs through
 * constructor injection.
 */
export interface Container {
  prisma: PrismaClient;
  brain: Brain;
  memory: IMemory;
  router: AiRouter;
  modelRegistry: ModelRegistry;
  authService: AuthService;
  profileService: ProfileService;
  chatService: ChatService;
  projectService: ProjectService;
  fileService: FileService;
  settingsService: SettingsService;
}

export function buildContainer(config: IceConfig, logger: pino.Logger): Container {
  const prisma = new PrismaClient();

  const events = new IceEventBus();
  new Observer(events, new PinoObserverSink(logger)); // subscribes as a side effect of construction

  // Phase 3: production Postgres-backed Memory implementation.
  const memory = new PrismaMemoryRepository(prisma);

  // Phase 4: ModelRegistry + ProviderRegistry — five providers behind
  // one interface; adding a provider is a register() call here, not a
  // change to AiRouter, Brain, or any strategy.
  const modelRegistry = new ModelRegistry();

  const providerRegistry = new ProviderRegistry();
  providerRegistry.register(new AnthropicProviderAdapter(config.ANTHROPIC_API_KEY, modelRegistry), {
    asDefault: true,
  });
  providerRegistry.register(new OpenAiProviderAdapter(config.OPENAI_API_KEY, modelRegistry));
  providerRegistry.register(new GoogleProviderAdapter(config.GEMINI_API_KEY, modelRegistry));
  providerRegistry.register(new OpenRouterProviderAdapter(config.OPENROUTER_API_KEY, modelRegistry));
  providerRegistry.register(new OllamaProviderAdapter(config.OLLAMA_BASE_URL, modelRegistry));

  const router = new AiRouter(providerRegistry, new CapabilityBasedStrategy(), events);

  // Backend-owned services that ContextBuilder's optional collaborators
  // (Phase 4) need — constructed here, before ContextBuilder, so they
  // can be wired straight in rather than patched in after the fact.
  const profileRepository = new PrismaProfileRepository(prisma);
  const profileService = new ProfileService(profileRepository);

  const projectRepository = new PrismaProjectRepository(prisma);
  const projectService = new ProjectService(projectRepository);

  const contextBuilder = new ContextBuilder(memory, {
    userProfileProvider: new BackendUserProfileContextProvider(profileService),
    projectProvider: new BackendProjectContextProvider(projectService, prisma),
    fileProvider: new BackendFileContextProvider(prisma),
  });
  const promptBuilder = new PromptBuilder();
  const planner = new Planner();
  const conversationManager = new ConversationManager(router);

  const tools = new ToolRegistry();
  tools.register(textTruncateTool);
  const permissions = new PermissionManager();
  const executor = new Executor(tools, permissions);
  const workflow = new WorkflowEngine();
  const agent = new Agent(workflow, executor);

  const brain = new Brain(
    planner,
    contextBuilder,
    promptBuilder,
    router,
    memory,
    agent,
    events,
    conversationManager,
  );

  const identityProvider = new SupabaseIdentityProvider(config);
  const authService = new AuthService(identityProvider, prisma);

  const chatRepository = new PrismaChatRepository(prisma);
  const chatService = new ChatService(chatRepository, brain);

  const fileMetadataRepository = new PrismaFileMetadataRepository(prisma);
  const objectStorage = new SupabaseObjectStorage(config);
  const fileService = new FileService(fileMetadataRepository, objectStorage);

  const settingsRepository = new PrismaSettingsRepository(prisma);
  const settingsService = new SettingsService(settingsRepository);

  return {
    prisma,
    brain,
    memory,
    router,
    modelRegistry,
    authService,
    profileService,
    chatService,
    projectService,
    fileService,
    settingsService,
  };
}
