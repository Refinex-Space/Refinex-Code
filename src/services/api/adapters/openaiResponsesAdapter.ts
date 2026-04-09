import type { BetaContentBlock } from "@anthropic-ai/sdk/resources/beta/messages/messages.mjs";
import type { ClientOptions } from "@anthropic-ai/sdk";
import { randomUUID } from "crypto";
import {
  getEmptyToolPermissionContext,
  type Tool,
  type Tools,
} from "../../../Tool.js";
import { EMPTY_USAGE } from "../../../services/api/logging.js";
import type { AgentDefinition } from "../../../tools/AgentTool/loadAgentsDir.js";
import type {
  AssistantMessage,
  Message,
  StreamEvent,
  SystemAPIErrorMessage,
} from "../../../types/message.js";
import { safeParseJSON } from "../../../utils/json.js";
import {
  createAssistantAPIErrorMessage,
  createAssistantMessage,
  createUserMessage,
  ensureToolResultPairing,
  extractTextContent,
  normalizeMessagesForAPI,
} from "../../../utils/messages.js";
import {
  getConfiguredModelProviderInfo,
  type ProviderDefinition,
  type ProviderDriver,
} from "../../../utils/providerRegistry.js";
import {
  getProviderAuth,
  type ProviderAuthEntry,
} from "../../../utils/providerAuthStore.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import {
  asSystemPrompt,
  type SystemPrompt,
} from "../../../utils/systemPromptType.js";
import { zodToJsonSchema } from "../../../utils/zodToJsonSchema.js";
import { resolveAppliedEffort } from "../../../utils/effort.js";
import {
  getDefaultVerbosityForConfiguredProviderModel,
  getOpenAIReasoningEffortForAPI,
} from "../../../utils/model/providerCatalog.js";
import {
  accumulateUsage,
  getCacheControl,
  getMaxOutputTokensForModel,
  type Options,
  type queryModelWithStreaming as QueryModelWithStreamingSignature,
  type queryModelWithoutStreaming as QueryModelWithoutStreamingSignature,
  type queryHaiku as QueryHaikuSignature,
  type queryWithModel as QueryWithModelSignature,
  updateUsage,
  verifyApiKey as verifyAnthropicApiKey,
} from "../claude.js";

export const OPENAI_RESPONSES_ADAPTER_ID = "openai-responses";

const getOpenAIMetadata = () => ({});

type OpenAIInputText = {
  type: "input_text";
  text: string;
};

type OpenAIMessageItem = {
  type: "message";
  role: "user" | "assistant";
  content: string | OpenAIInputText[];
};

type OpenAIFunctionCallItem = {
  type: "function_call";
  call_id: string;
  name: string;
  arguments: string;
};

type OpenAIFunctionCallOutputItem = {
  type: "function_call_output";
  call_id: string;
  output: string;
};

type OpenAIInputItem =
  | OpenAIMessageItem
  | OpenAIFunctionCallItem
  | OpenAIFunctionCallOutputItem;

type OpenAIFunctionTool = {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  strict?: boolean;
};

type OpenAIWebSearchTool = {
  type: "web_search";
  filters?: {
    allowed_domains?: string[];
  };
  search_context_size?: "low" | "medium" | "high";
};

type OpenAITool = OpenAIFunctionTool | OpenAIWebSearchTool;

type OpenAIResponseOutputText = {
  type: "output_text";
  text: string;
  annotations?: Array<Record<string, unknown>>;
};

type OpenAIResponseMessageItem = {
  id?: string;
  type: "message";
  role: "assistant";
  content: OpenAIResponseOutputText[];
};

type OpenAIResponseFunctionCallItem = {
  id?: string;
  type: "function_call";
  call_id?: string;
  name: string;
  arguments: string;
};

type OpenAIResponseWebSearchSource = {
  title?: string;
  url?: string;
};

type OpenAIResponseWebSearchCallItem = {
  id?: string;
  type: "web_search_call";
  action?: {
    sources?: OpenAIResponseWebSearchSource[];
  };
  sources?: OpenAIResponseWebSearchSource[];
};

type OpenAIResponseReasoningItem = {
  type: "reasoning";
  summary?: Array<{ text?: string }>;
};

type OpenAIResponseOutputItem =
  | OpenAIResponseMessageItem
  | OpenAIResponseFunctionCallItem
  | OpenAIResponseWebSearchCallItem
  | OpenAIResponseReasoningItem
  | Record<string, unknown>;

type OpenAIResponse = {
  id: string;
  model: string;
  output?: OpenAIResponseOutputItem[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    output_tokens_details?: {
      reasoning_tokens?: number;
    };
  };
  service_tier?: string | null;
  error?: {
    message?: string;
  } | null;
};

type OpenAIStreamFrame = {
  event?: string;
  data?: string;
};

function parseSSEFrames(buffer: string): {
  frames: OpenAIStreamFrame[];
  remaining: string;
} {
  const frames: OpenAIStreamFrame[] = [];
  let pos = 0;
  let idx = -1;

  while ((idx = buffer.indexOf("\n\n", pos)) !== -1) {
    const rawFrame = buffer.slice(pos, idx);
    pos = idx + 2;

    if (!rawFrame.trim()) continue;

    const frame: OpenAIStreamFrame = {};
    for (const line of rawFrame.split("\n")) {
      if (line.startsWith(":")) continue;
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      const field = line.slice(0, colonIdx);
      const value =
        line[colonIdx + 1] === " "
          ? line.slice(colonIdx + 2)
          : line.slice(colonIdx + 1);
      if (field === "event") {
        frame.event = value;
      } else if (field === "data") {
        frame.data = frame.data ? `${frame.data}\n${value}` : value;
      }
    }

    if (frame.data) {
      frames.push(frame);
    }
  }

  return { frames, remaining: buffer.slice(pos) };
}

function ensureTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

function buildResponsesUrl(provider: ProviderDefinition): string {
  const baseUrl = provider.baseUrl ?? "https://api.openai.com/v1";
  const url = new URL("responses", ensureTrailingSlash(baseUrl));

  for (const [key, value] of Object.entries(provider.queryParams ?? {})) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

function getProviderCredential(providerId: string): ProviderAuthEntry | null {
  return getProviderAuth(providerId);
}

function getAuthorizationHeader(providerId: string): string | null {
  const auth = getProviderCredential(providerId);
  if (auth?.bearerToken) {
    return `Bearer ${auth.bearerToken}`;
  }
  if (auth?.apiKey) {
    return `Bearer ${auth.apiKey}`;
  }
  if (process.env.OPENAI_API_KEY) {
    return `Bearer ${process.env.OPENAI_API_KEY}`;
  }
  return null;
}

function createMissingAuthMessage(providerId: string): AssistantMessage {
  return createAssistantAPIErrorMessage({
    content: `API Error: Missing credentials for provider '${providerId}'. Configure ~/.claude/auth.json or set OPENAI_API_KEY.`,
  });
}

function mapEffortToOpenAI(
  model: string,
  effortValue: Options["effortValue"],
): ReturnType<typeof getOpenAIReasoningEffortForAPI> {
  if (typeof effortValue !== "string") {
    return undefined;
  }
  return getOpenAIReasoningEffortForAPI(model, effortValue);
}

function mapOutputFormat(
  outputFormat: Options["outputFormat"],
): Record<string, unknown> | undefined {
  if (!outputFormat) {
    return undefined;
  }
  if (outputFormat.type === "json_schema") {
    return {
      format: {
        type: "json_schema",
        name: "structured_output",
        schema: outputFormat.schema,
        strict: true,
      },
    };
  }
  return undefined;
}

function buildTextConfig(
  model: string,
  outputFormat: Options["outputFormat"],
): Record<string, unknown> | undefined {
  const formatConfig = mapOutputFormat(outputFormat)?.format;
  const verbosity = getDefaultVerbosityForConfiguredProviderModel(model);
  const textConfig: Record<string, unknown> = {};

  if (formatConfig) {
    textConfig.format = formatConfig;
  }

  if (verbosity) {
    textConfig.verbosity = verbosity;
  }

  return Object.keys(textConfig).length > 0 ? textConfig : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableSchema(schema: Record<string, unknown>): boolean {
  const type = schema.type;
  if (type === "null") {
    return true;
  }
  if (Array.isArray(type) && type.includes("null")) {
    return true;
  }
  if (Array.isArray(schema.enum) && schema.enum.includes(null)) {
    return true;
  }

  const variants = ["anyOf", "oneOf"]
    .map((key) => schema[key])
    .filter(Array.isArray)
    .flat();

  return variants.some(
    (variant) => isRecord(variant) && isNullableSchema(variant),
  );
}

function normalizeSchemaForOpenAIFunctions(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema)) {
    if (key === "properties" && isRecord(value)) {
      normalized[key] = Object.fromEntries(
        Object.entries(value).map(([propertyName, propertySchema]) => [
          propertyName,
          isRecord(propertySchema)
            ? normalizeSchemaForOpenAIFunctions(propertySchema)
            : propertySchema,
        ]),
      );
      continue;
    }

    if (key === "items") {
      normalized[key] = isRecord(value)
        ? normalizeSchemaForOpenAIFunctions(value)
        : Array.isArray(value)
          ? value.map((item) =>
              isRecord(item) ? normalizeSchemaForOpenAIFunctions(item) : item,
            )
          : value;
      continue;
    }

    if (
      (key === "anyOf" ||
        key === "oneOf" ||
        key === "allOf" ||
        key === "prefixItems") &&
      Array.isArray(value)
    ) {
      normalized[key] = value.map((item) =>
        isRecord(item) ? normalizeSchemaForOpenAIFunctions(item) : item,
      );
      continue;
    }

    if ((key === "$defs" || key === "definitions") && isRecord(value)) {
      normalized[key] = Object.fromEntries(
        Object.entries(value).map(([definitionName, definitionSchema]) => [
          definitionName,
          isRecord(definitionSchema)
            ? normalizeSchemaForOpenAIFunctions(definitionSchema)
            : definitionSchema,
        ]),
      );
      continue;
    }

    normalized[key] = value;
  }

  if (
    normalized.type === "object" ||
    (Array.isArray(normalized.type) && normalized.type.includes("object"))
  ) {
    normalized.properties = isRecord(normalized.properties)
      ? normalized.properties
      : {};
  }

  return normalized;
}

function makeSchemaNullable(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  if (isNullableSchema(schema)) {
    return schema;
  }

  if (typeof schema.type === "string") {
    return {
      ...schema,
      type: [schema.type, "null"],
      ...(Array.isArray(schema.enum) ? { enum: [...schema.enum, null] } : {}),
    };
  }

  if (Array.isArray(schema.type)) {
    return {
      ...schema,
      type: schema.type.includes("null")
        ? schema.type
        : [...schema.type, "null"],
      ...(Array.isArray(schema.enum) && !schema.enum.includes(null)
        ? { enum: [...schema.enum, null] }
        : {}),
    };
  }

  if (Array.isArray(schema.enum)) {
    return {
      ...schema,
      enum: schema.enum.includes(null) ? schema.enum : [...schema.enum, null],
    };
  }

  return {
    anyOf: [schema, { type: "null" }],
  };
}

function normalizeSchemaForOpenAIStrict(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const normalized = normalizeSchemaForOpenAIFunctions(schema);

  if (isRecord(normalized.properties)) {
    const propertyKeys = Object.keys(normalized.properties);
    const existingRequired = Array.isArray(normalized.required)
      ? normalized.required.filter(
          (value): value is string =>
            typeof value === "string" && propertyKeys.includes(value),
        )
      : [];

    normalized.properties = Object.fromEntries(
      Object.entries(normalized.properties).map(
        ([propertyName, propertySchema]) => [
          propertyName,
          isRecord(propertySchema) && !existingRequired.includes(propertyName)
            ? makeSchemaNullable(propertySchema)
            : propertySchema,
        ],
      ),
    );
    normalized.required = propertyKeys;
    normalized.additionalProperties = false;
  } else if (
    normalized.type === "object" ||
    (Array.isArray(normalized.type) && normalized.type.includes("object"))
  ) {
    normalized.additionalProperties = false;
    normalized.required = Array.isArray(normalized.required)
      ? normalized.required
      : [];
  }

  return normalized;
}

async function toolToOpenAIFunctionTool(
  tool: Tool,
  options: {
    getToolPermissionContext: () => Promise<unknown>;
    tools: Tools;
    agents: AgentDefinition[];
    allowedAgentTypes?: string[];
  },
): Promise<OpenAIFunctionTool> {
  const parameters =
    "inputJSONSchema" in tool && tool.inputJSONSchema
      ? (tool.inputJSONSchema as Record<string, unknown>)
      : (zodToJsonSchema(tool.inputSchema) as Record<string, unknown>);
  const strict = tool.strict === true;
  const normalizedParameters = strict
    ? normalizeSchemaForOpenAIStrict(parameters)
    : normalizeSchemaForOpenAIFunctions(parameters);

  return {
    type: "function",
    name: tool.name,
    description: await tool.prompt({
      getToolPermissionContext: options.getToolPermissionContext,
      tools: options.tools,
      agents: options.agents,
      allowedAgentTypes: options.allowedAgentTypes,
    }),
    parameters: normalizedParameters,
    strict,
  };
}

function mapExtraToolSchema(
  extraToolSchema: Record<string, unknown>,
): OpenAITool | null {
  const type =
    typeof extraToolSchema.type === "string" ? extraToolSchema.type : "";

  if (type === "web_search_20250305") {
    const domains = Array.isArray(extraToolSchema.allowed_domains)
      ? extraToolSchema.allowed_domains.filter(
          (value): value is string => typeof value === "string",
        )
      : undefined;
    return {
      type: "web_search",
      ...(domains && domains.length > 0
        ? { filters: { allowed_domains: domains } }
        : {}),
      search_context_size: "medium",
    };
  }

  if (
    typeof extraToolSchema.name === "string" &&
    typeof extraToolSchema.description === "string" &&
    extraToolSchema.input_schema &&
    typeof extraToolSchema.input_schema === "object"
  ) {
    const strict = extraToolSchema.strict === true;
    const parameters = strict
      ? normalizeSchemaForOpenAIStrict(
          extraToolSchema.input_schema as Record<string, unknown>,
        )
      : normalizeSchemaForOpenAIFunctions(
          extraToolSchema.input_schema as Record<string, unknown>,
        );

    return {
      type: "function",
      name: extraToolSchema.name,
      description: extraToolSchema.description,
      parameters,
      strict,
    };
  }

  return null;
}

async function buildOpenAITools(
  tools: Tools,
  options: Options,
): Promise<OpenAITool[]> {
  const functionTools = await Promise.all(
    tools.map((tool) =>
      toolToOpenAIFunctionTool(tool, {
        getToolPermissionContext:
          options.getToolPermissionContext as () => Promise<unknown>,
        tools,
        agents: options.agents,
        allowedAgentTypes: options.allowedAgentTypes,
      }),
    ),
  );

  const extraTools = (options.extraToolSchemas ?? [])
    .map((schema) => mapExtraToolSchema(schema as Record<string, unknown>))
    .filter((tool): tool is OpenAITool => tool !== null);

  return [...functionTools, ...extraTools];
}

function convertUserContentToInputTextBlocks(
  content: unknown,
): OpenAIInputText[] {
  if (typeof content === "string") {
    return [{ type: "input_text", text: content }];
  }

  if (!Array.isArray(content)) {
    return [];
  }

  return content
    .filter(
      (block): block is { type: string; text?: string } =>
        typeof block === "object" && block !== null && "type" in block,
    )
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => ({ type: "input_text", text: block.text! }));
}

function flattenToolResultOutput(block: Record<string, unknown>): string {
  const content = block.content;
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .filter(
      (item): item is { type: string; text?: string } =>
        typeof item === "object" && item !== null && "type" in item,
    )
    .filter((item) => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text!)
    .join("\n");
}

function convertMessagesToResponsesInputItems(
  messages: Message[],
  tools: Tools,
): OpenAIInputItem[] {
  const normalized = ensureToolResultPairing(
    normalizeMessagesForAPI(messages, tools),
  );
  const items: OpenAIInputItem[] = [];

  for (const message of normalized) {
    if (message.type === "user") {
      const content = message.message.content;
      const textBlocks = convertUserContentToInputTextBlocks(content);

      if (Array.isArray(content)) {
        for (const block of content) {
          if (
            typeof block === "object" &&
            block !== null &&
            "type" in block &&
            block.type === "tool_result" &&
            typeof (block as { tool_use_id?: unknown }).tool_use_id === "string"
          ) {
            items.push({
              type: "function_call_output",
              call_id: (block as { tool_use_id: string }).tool_use_id,
              output: flattenToolResultOutput(block as Record<string, unknown>),
            });
          }
        }
      }

      if (textBlocks.length > 0) {
        items.push({
          type: "message",
          role: "user",
          content: textBlocks,
        });
      }
      continue;
    }

    if (message.type !== "assistant" || !message.message) {
      continue;
    }

    const content = Array.isArray(message.message.content)
      ? message.message.content
      : [];

    const assistantText = extractTextContent(
      content.filter(
        (block): block is { type: "text"; text: string } =>
          typeof block === "object" &&
          block !== null &&
          "type" in block &&
          block.type === "text" &&
          typeof (block as { text?: unknown }).text === "string",
      ),
      "\n",
    ).trim();

    if (assistantText) {
      items.push({
        type: "message",
        role: "assistant",
        content: assistantText,
      });
    }

    for (const block of content) {
      if (
        typeof block === "object" &&
        block !== null &&
        "type" in block &&
        block.type === "tool_use"
      ) {
        const toolUseBlock = block as {
          id?: string;
          name?: string;
          input?: unknown;
        };
        if (toolUseBlock.id && toolUseBlock.name) {
          items.push({
            type: "function_call",
            call_id: toolUseBlock.id,
            name: toolUseBlock.name,
            arguments: jsonStringify(toolUseBlock.input ?? {}),
          });
        }
      }
    }
  }

  return items;
}

function mapResponseUsage(
  response: OpenAIResponse,
): AssistantMessage["message"]["usage"] {
  const webSearchRequests =
    response.output?.filter(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "type" in item &&
        item.type === "web_search_call",
    ).length ?? 0;

  return {
    ...EMPTY_USAGE,
    input_tokens: response.usage?.input_tokens ?? 0,
    output_tokens: response.usage?.output_tokens ?? 0,
    server_tool_use: {
      ...EMPTY_USAGE.server_tool_use,
      web_search_requests: webSearchRequests,
    },
    service_tier:
      response.service_tier === "priority"
        ? "priority"
        : response.service_tier === "flex"
          ? "flex"
          : "standard",
  };
}

function mapResponseOutputToBlocks(
  response: OpenAIResponse,
): BetaContentBlock[] {
  const blocks: BetaContentBlock[] = [];
  const annotationSources =
    extractWebSearchSourcesFromMessageAnnotations(response);
  let annotationSourcesUsed = false;

  for (const item of response.output ?? []) {
    if (
      typeof item !== "object" ||
      item === null ||
      !("type" in item) ||
      typeof item.type !== "string"
    ) {
      continue;
    }

    if (item.type === "message") {
      const messageItem = item as OpenAIResponseMessageItem;
      for (const part of messageItem.content ?? []) {
        if (part.type === "output_text" && part.text) {
          blocks.push({
            type: "text",
            text: part.text,
          } as BetaContentBlock);
        }
      }
      continue;
    }

    if (item.type === "function_call") {
      const functionCall = item as OpenAIResponseFunctionCallItem;
      blocks.push({
        type: "tool_use",
        id: functionCall.call_id ?? functionCall.id ?? randomUUID(),
        name: functionCall.name,
        input:
          (safeParseJSON(functionCall.arguments, false) as Record<
            string,
            unknown
          >) ?? {},
      } as BetaContentBlock);
      continue;
    }

    if (item.type === "web_search_call") {
      const webSearchCall = item as OpenAIResponseWebSearchCallItem;
      const toolUseId = webSearchCall.id ?? randomUUID();
      blocks.push({
        type: "server_tool_use",
        id: toolUseId,
        name: "web_search",
        input: {},
      } as BetaContentBlock);

      const sources =
        webSearchCall.action?.sources ?? webSearchCall.sources ?? [];

      const effectiveSources =
        sources.length > 0
          ? sources
          : !annotationSourcesUsed && annotationSources.length > 0
            ? annotationSources
            : [];

      if (sources.length === 0 && effectiveSources.length > 0) {
        annotationSourcesUsed = true;
      }

      if (effectiveSources.length > 0) {
        blocks.push({
          type: "web_search_tool_result",
          tool_use_id: toolUseId,
          content: effectiveSources
            .filter(
              (source): source is OpenAIResponseWebSearchSource =>
                !!source && typeof source === "object",
            )
            .map((source) => ({
              title: source.title ?? source.url ?? "Untitled",
              url: source.url ?? "",
            }))
            .filter((result) => result.url.length > 0),
        } as BetaContentBlock);
      }
      continue;
    }
  }

  return blocks;
}

function extractWebSearchSourcesFromMessageAnnotations(
  response: OpenAIResponse,
): OpenAIResponseWebSearchSource[] {
  const sources: OpenAIResponseWebSearchSource[] = [];

  for (const item of response.output ?? []) {
    if (!isRecord(item) || item.type !== "message") {
      continue;
    }

    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (!isRecord(part) || part.type !== "output_text") {
        continue;
      }
      const annotations = Array.isArray(part.annotations)
        ? part.annotations
        : [];
      for (const annotation of annotations) {
        if (!isRecord(annotation)) {
          continue;
        }

        let url: string | undefined;
        let title: string | undefined;

        if (typeof annotation.url === "string") {
          url = annotation.url;
        }
        if (typeof annotation.title === "string") {
          title = annotation.title;
        }

        if (!url && isRecord(annotation.url_citation)) {
          if (typeof annotation.url_citation.url === "string") {
            url = annotation.url_citation.url;
          }
          if (typeof annotation.url_citation.title === "string") {
            title = annotation.url_citation.title;
          }
        }

        if (url) {
          sources.push({ title, url });
        }
      }
    }
  }

  const deduped = new Map<string, OpenAIResponseWebSearchSource>();
  for (const source of sources) {
    const url = source.url?.trim();
    if (!url) {
      continue;
    }
    if (!deduped.has(url)) {
      deduped.set(url, {
        title: source.title?.trim() || url,
        url,
      });
    }
  }

  return [...deduped.values()];
}

function mapStopReason(blocks: BetaContentBlock[]): string {
  return blocks.some(
    (block) =>
      block.type === "tool_use" ||
      block.type === "server_tool_use" ||
      block.type === "mcp_tool_use",
  )
    ? "tool_use"
    : "stop_sequence";
}

function mapResponseToAssistantMessage(
  response: OpenAIResponse,
): AssistantMessage {
  const blocks = mapResponseOutputToBlocks(response);
  const assistantMessage = createAssistantMessage({
    content: blocks.length > 0 ? blocks : "",
    usage: mapResponseUsage(response),
  });

  assistantMessage.requestId = response.id;
  if (assistantMessage.message) {
    assistantMessage.message.id =
      response.output?.find(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          "type" in item &&
          item.type === "message" &&
          "id" in item &&
          typeof (item as { id?: unknown }).id === "string",
      )?.id ?? response.id;
    assistantMessage.message.model = response.model;
    assistantMessage.message.stop_reason = mapStopReason(blocks);
    assistantMessage.message.stop_sequence = "";
    assistantMessage.message.usage = mapResponseUsage(response);
  }

  return assistantMessage;
}

function createOpenAIErrorMessage(error: unknown): AssistantMessage {
  if (error instanceof Error) {
    return createAssistantAPIErrorMessage({
      content: `API Error: ${error.message}`,
    });
  }

  return createAssistantAPIErrorMessage({
    content: `API Error: ${String(error)}`,
  });
}

async function parseErrorResponse(response: Response): Promise<Error> {
  const text = await response.text();
  const parsed = safeParseJSON(text, false) as {
    error?: { message?: string };
  } | null;
  const message =
    parsed?.error?.message ||
    text ||
    `HTTP ${response.status} ${response.statusText}`;
  return new Error(message);
}

function buildToolChoice(
  tools: OpenAITool[],
  toolChoice: Options["toolChoice"],
): string | Record<string, unknown> | undefined {
  if (!toolChoice) {
    return tools.length > 0 ? "auto" : undefined;
  }

  if (toolChoice.type === "auto") {
    return "auto";
  }

  if (toolChoice.type === "tool") {
    const functionTool = tools.find(
      (tool) => tool.type === "function" && tool.name === toolChoice.name,
    );
    if (functionTool && functionTool.type === "function") {
      return {
        type: "function",
        name: functionTool.name,
      };
    }
    return "required";
  }

  return undefined;
}

async function makeOpenAIRequest({
  messages,
  systemPrompt,
  tools,
  signal,
  options,
  stream,
}: {
  messages: Message[];
  systemPrompt: SystemPrompt;
  tools: Tools;
  signal: AbortSignal;
  options: Options;
  stream: boolean;
}): Promise<Response> {
  const configured = getConfiguredModelProviderInfo();
  const provider = configured.provider;
  const authorization = getAuthorizationHeader(configured.resolvedId);

  if (!authorization) {
    throw new Error(
      `Missing credentials for provider '${configured.resolvedId}'`,
    );
  }

  const requestTools = await buildOpenAITools(tools, options);
  const resolvedEffort = resolveAppliedEffort(
    options.model,
    options.effortValue,
  );
  const reasoningEffort = mapEffortToOpenAI(options.model, resolvedEffort);
  const textConfig = buildTextConfig(options.model, options.outputFormat);
  const requestBody: Record<string, unknown> = {
    model: options.model,
    input: convertMessagesToResponsesInputItems(messages, tools),
    instructions: systemPrompt.join("\n\n"),
    parallel_tool_calls: true,
    max_output_tokens:
      options.maxOutputTokensOverride ??
      getMaxOutputTokensForModel(options.model),
    store: false,
    stream,
    truncation: "disabled",
    ...(requestTools.length > 0 ? { tools: requestTools } : {}),
    ...(buildToolChoice(requestTools, options.toolChoice)
      ? { tool_choice: buildToolChoice(requestTools, options.toolChoice) }
      : {}),
    ...(reasoningEffort
      ? {
          reasoning: {
            effort: reasoningEffort,
          },
        }
      : {}),
    ...(textConfig ? { text: textConfig } : {}),
    ...(options.temperatureOverride !== undefined
      ? { temperature: options.temperatureOverride }
      : {}),
  };

  const hasBuiltInWebSearch = requestTools.some(
    (tool) => tool.type === "web_search",
  );
  if (hasBuiltInWebSearch) {
    requestBody.include = ["web_search_call.action.sources"];
  }

  const fetchImplementation =
    options.fetchOverride ?? (globalThis.fetch as ClientOptions["fetch"]);
  if (!fetchImplementation) {
    throw new Error("Fetch is not available in this runtime");
  }

  const headers = new Headers({
    Authorization: authorization,
    "Content-Type": "application/json",
    ...provider.httpHeaders,
  });

  return fetchImplementation(buildResponsesUrl(provider), {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
    signal,
  } as RequestInit);
}

const queryModelWithoutStreaming: QueryModelWithoutStreamingSignature = async ({
  messages,
  systemPrompt,
  tools,
  signal,
  options,
}) => {
  try {
    const response = await makeOpenAIRequest({
      messages,
      systemPrompt,
      tools,
      signal,
      options,
      stream: false,
    });

    if (!response.ok) {
      return createOpenAIErrorMessage(await parseErrorResponse(response));
    }

    const json = (await response.json()) as OpenAIResponse;
    return mapResponseToAssistantMessage(json);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Missing credentials for provider")
    ) {
      return createMissingAuthMessage(
        getConfiguredModelProviderInfo().resolvedId,
      );
    }
    return createOpenAIErrorMessage(error);
  }
};

const queryModelWithStreaming: QueryModelWithStreamingSignature =
  async function* ({
    messages,
    systemPrompt,
    tools,
    signal,
    options,
  }): AsyncGenerator<
    StreamEvent | AssistantMessage | SystemAPIErrorMessage,
    void
  > {
    const configured = getConfiguredModelProviderInfo();
    try {
      const response = await makeOpenAIRequest({
        messages,
        systemPrompt,
        tools,
        signal,
        options,
        stream: true,
      });

      if (!response.ok) {
        yield createOpenAIErrorMessage(await parseErrorResponse(response));
        return;
      }

      if (!response.body) {
        yield createAssistantAPIErrorMessage({
          content: "API Error: Responses stream did not include a body",
        });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResponse: OpenAIResponse | null = null;
      let sawMessageStart = false;
      let sawTextStart = false;
      let ttftMs: number | undefined;
      const startedAt = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { frames, remaining } = parseSSEFrames(buffer);
        buffer = remaining;

        for (const frame of frames) {
          if (!frame.data || frame.data === "[DONE]") {
            continue;
          }

          const payload = safeParseJSON(frame.data, false) as {
            type?: string;
            delta?: string;
            response?: OpenAIResponse;
          } | null;
          if (!payload) {
            continue;
          }

          const eventType = frame.event ?? payload.type;

          if (!sawMessageStart) {
            sawMessageStart = true;
            yield {
              type: "stream_event",
              event: {
                type: "message_start",
                message: { usage: EMPTY_USAGE },
              },
              ttftMs: ttftMs ?? Date.now() - startedAt,
            };
          }

          if (eventType === "response.output_text.delta") {
            if (!ttftMs) {
              ttftMs = Date.now() - startedAt;
            }
            if (!sawTextStart) {
              sawTextStart = true;
              yield {
                type: "stream_event",
                event: {
                  type: "content_block_start",
                  index: 0,
                  content_block: {
                    type: "text",
                    text: "",
                  },
                },
              };
            }
            yield {
              type: "stream_event",
              event: {
                type: "content_block_delta",
                index: 0,
                delta: {
                  type: "text_delta",
                  text: payload.delta ?? "",
                },
              },
            };
            continue;
          }

          if (eventType === "response.completed" && payload.response) {
            finalResponse = payload.response;
          }
        }
      }

      if (!finalResponse) {
        yield createAssistantAPIErrorMessage({
          content: `API Error: Provider '${configured.resolvedId}' stream finished without a completed response`,
        });
        return;
      }

      const assistantMessage = mapResponseToAssistantMessage(finalResponse);
      const toolBlocks = Array.isArray(assistantMessage.message?.content)
        ? assistantMessage.message.content.filter(
            (block) =>
              block.type === "tool_use" || block.type === "server_tool_use",
          )
        : [];

      let syntheticIndex = sawTextStart ? 1 : 0;
      for (const toolBlock of toolBlocks) {
        yield {
          type: "stream_event",
          event: {
            type: "content_block_start",
            index: syntheticIndex,
            content_block:
              toolBlock.type === "tool_use"
                ? {
                    type: "tool_use",
                    id: toolBlock.id,
                    name: toolBlock.name,
                    input: {},
                  }
                : {
                    type: "server_tool_use",
                    id: toolBlock.id,
                    name: toolBlock.name,
                    input: {},
                  },
          },
        };
        yield {
          type: "stream_event",
          event: {
            type: "content_block_delta",
            index: syntheticIndex,
            delta: {
              type: "input_json_delta",
              partial_json:
                toolBlock.type === "tool_use"
                  ? jsonStringify(toolBlock.input ?? {})
                  : "{}",
            },
          },
        };
        syntheticIndex++;
      }

      yield {
        type: "stream_event",
        event: {
          type: "message_delta",
          usage: assistantMessage.message?.usage ?? EMPTY_USAGE,
          delta: {
            stop_reason:
              assistantMessage.message?.stop_reason ?? "stop_sequence",
          },
        },
      };
      yield {
        type: "stream_event",
        event: {
          type: "message_stop",
        },
      };
      yield assistantMessage;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Missing credentials for provider")
      ) {
        yield createMissingAuthMessage(configured.resolvedId);
        return;
      }
      yield createOpenAIErrorMessage(error);
    }
  };

const queryHaiku: QueryHaikuSignature = async ({
  systemPrompt = asSystemPrompt([]),
  userPrompt,
  outputFormat,
  signal,
  options,
}) => {
  const configured = getConfiguredModelProviderInfo();
  return queryModelWithoutStreaming({
    messages: [createUserMessage({ content: userPrompt })],
    systemPrompt,
    thinkingConfig: { type: "disabled" },
    tools: [],
    signal,
    options: {
      ...options,
      model: configured.provider.defaultModel ?? "gpt-5.4",
      outputFormat,
      enablePromptCaching: false,
      async getToolPermissionContext() {
        return getEmptyToolPermissionContext();
      },
    },
  });
};

const queryWithModel: QueryWithModelSignature = async ({
  systemPrompt = asSystemPrompt([]),
  userPrompt,
  outputFormat,
  signal,
  options,
}) =>
  queryModelWithoutStreaming({
    messages: [createUserMessage({ content: userPrompt })],
    systemPrompt,
    thinkingConfig: { type: "disabled" },
    tools: [],
    signal,
    options: {
      ...options,
      outputFormat,
      enablePromptCaching: false,
      async getToolPermissionContext() {
        return getEmptyToolPermissionContext();
      },
    },
  });

const verifyApiKey: typeof verifyAnthropicApiKey = async (
  apiKey,
  _isNonInteractiveSession,
) => {
  const configured = getConfiguredModelProviderInfo();
  const provider = configured.provider;
  const fetchImplementation = globalThis.fetch as ClientOptions["fetch"];
  if (!fetchImplementation) {
    throw new Error("Fetch is not available in this runtime");
  }

  const response = await fetchImplementation(buildResponsesUrl(provider), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...provider.httpHeaders,
    },
    body: JSON.stringify({
      model: provider.defaultModel ?? "gpt-5.4",
      input: "ping",
      max_output_tokens: 1,
      store: false,
    }),
  } as RequestInit);

  if (response.ok) {
    return true;
  }

  if (response.status === 401 || response.status === 403) {
    return false;
  }

  throw await parseErrorResponse(response);
};

export const openaiResponsesAdapter = {
  id: OPENAI_RESPONSES_ADAPTER_ID,
  driver: "openai-responses" as ProviderDriver,
  verifyApiKey,
  getAPIMetadata: getOpenAIMetadata,
  getCacheControl,
  queryModelWithoutStreaming,
  queryModelWithStreaming,
  updateUsage,
  accumulateUsage,
  queryHaiku,
  queryWithModel,
};
