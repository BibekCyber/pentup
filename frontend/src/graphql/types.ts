import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
    ID: { input: string; output: string };
    String: { input: string; output: string };
    Boolean: { input: boolean; output: boolean };
    Int: { input: number; output: number };
    Float: { input: number; output: number };
    Time: { input: any; output: any };
};

export type ApiToken = {
    createdAt: Scalars['Time']['output'];
    id: Scalars['ID']['output'];
    name?: Maybe<Scalars['String']['output']>;
    roleId: Scalars['ID']['output'];
    status: TokenStatus;
    tokenId: Scalars['String']['output'];
    ttl: Scalars['Int']['output'];
    updatedAt: Scalars['Time']['output'];
    userId: Scalars['ID']['output'];
};

export type ApiTokenWithSecret = {
    createdAt: Scalars['Time']['output'];
    id: Scalars['ID']['output'];
    name?: Maybe<Scalars['String']['output']>;
    roleId: Scalars['ID']['output'];
    status: TokenStatus;
    token: Scalars['String']['output'];
    tokenId: Scalars['String']['output'];
    ttl: Scalars['Int']['output'];
    updatedAt: Scalars['Time']['output'];
    userId: Scalars['ID']['output'];
};

export type AgentConfig = {
    frequencyPenalty?: Maybe<Scalars['Float']['output']>;
    maxLength?: Maybe<Scalars['Int']['output']>;
    maxTokens?: Maybe<Scalars['Int']['output']>;
    minLength?: Maybe<Scalars['Int']['output']>;
    model: Scalars['String']['output'];
    presencePenalty?: Maybe<Scalars['Float']['output']>;
    price?: Maybe<ModelPrice>;
    reasoning?: Maybe<ReasoningConfig>;
    repetitionPenalty?: Maybe<Scalars['Float']['output']>;
    temperature?: Maybe<Scalars['Float']['output']>;
    topK?: Maybe<Scalars['Int']['output']>;
    topP?: Maybe<Scalars['Float']['output']>;
};

export type AgentConfigInput = {
    frequencyPenalty?: InputMaybe<Scalars['Float']['input']>;
    maxLength?: InputMaybe<Scalars['Int']['input']>;
    maxTokens?: InputMaybe<Scalars['Int']['input']>;
    minLength?: InputMaybe<Scalars['Int']['input']>;
    model: Scalars['String']['input'];
    presencePenalty?: InputMaybe<Scalars['Float']['input']>;
    price?: InputMaybe<ModelPriceInput>;
    reasoning?: InputMaybe<ReasoningConfigInput>;
    repetitionPenalty?: InputMaybe<Scalars['Float']['input']>;
    temperature?: InputMaybe<Scalars['Float']['input']>;
    topK?: InputMaybe<Scalars['Int']['input']>;
    topP?: InputMaybe<Scalars['Float']['input']>;
};

export enum AgentConfigType {
    Adviser = 'adviser',
    Assistant = 'assistant',
    Coder = 'coder',
    Enricher = 'enricher',
    Generator = 'generator',
    Installer = 'installer',
    Pentester = 'pentester',
    PrimaryAgent = 'primary_agent',
    Refiner = 'refiner',
    Reflector = 'reflector',
    Searcher = 'searcher',
    Simple = 'simple',
    SimpleJson = 'simple_json',
}

export type AgentLog = {
    createdAt: Scalars['Time']['output'];
    executor: AgentType;
    flowId: Scalars['ID']['output'];
    id: Scalars['ID']['output'];
    initiator: AgentType;
    result: Scalars['String']['output'];
    subtaskId?: Maybe<Scalars['ID']['output']>;
    task: Scalars['String']['output'];
    taskId?: Maybe<Scalars['ID']['output']>;
};

export type AgentPrompt = {
    system: DefaultPrompt;
};

export type AgentPrompts = {
    human: DefaultPrompt;
    system: DefaultPrompt;
};

export type AgentTestResult = {
    tests: Array<TestResult>;
};

export enum AgentType {
    Adviser = 'adviser',
    Assistant = 'assistant',
    Coder = 'coder',
    Enricher = 'enricher',
    Generator = 'generator',
    Installer = 'installer',
    Memorist = 'memorist',
    Pentester = 'pentester',
    PrimaryAgent = 'primary_agent',
    Refiner = 'refiner',
    Reflector = 'reflector',
    Reporter = 'reporter',
    Searcher = 'searcher',
    Summarizer = 'summarizer',
    ToolCallFixer = 'tool_call_fixer',
}

export type AgentTypeUsageStats = {
    agentType: AgentType;
    stats: UsageStats;
};

export type AgentsConfig = {
    adviser: AgentConfig;
    assistant: AgentConfig;
    coder: AgentConfig;
    enricher: AgentConfig;
    generator: AgentConfig;
    installer: AgentConfig;
    pentester: AgentConfig;
    primaryAgent: AgentConfig;
    refiner: AgentConfig;
    reflector: AgentConfig;
    searcher: AgentConfig;
    simple: AgentConfig;
    simpleJson: AgentConfig;
};

export type AgentsConfigInput = {
    adviser: AgentConfigInput;
    assistant: AgentConfigInput;
    coder: AgentConfigInput;
    enricher: AgentConfigInput;
    generator: AgentConfigInput;
    installer: AgentConfigInput;
    pentester: AgentConfigInput;
    primaryAgent: AgentConfigInput;
    refiner: AgentConfigInput;
    reflector: AgentConfigInput;
    searcher: AgentConfigInput;
    simple: AgentConfigInput;
    simpleJson: AgentConfigInput;
};

export type AgentsPrompts = {
    adviser: AgentPrompts;
    assistant: AgentPrompt;
    coder: AgentPrompts;
    enricher: AgentPrompts;
    generator: AgentPrompts;
    installer: AgentPrompts;
    memorist: AgentPrompts;
    pentester: AgentPrompts;
    primaryAgent: AgentPrompt;
    refiner: AgentPrompts;
    reflector: AgentPrompts;
    reporter: AgentPrompts;
    searcher: AgentPrompts;
    summarizer: AgentPrompt;
    toolCallFixer: AgentPrompts;
};

export type Assistant = {
    createdAt: Scalars['Time']['output'];
    findings: Array<Finding>;
    flowId: Scalars['ID']['output'];
    id: Scalars['ID']['output'];
    provider: Provider;
    status: StatusType;
    title: Scalars['String']['output'];
    updatedAt: Scalars['Time']['output'];
    useAgents: Scalars['Boolean']['output'];
};

export type AssistantLog = {
    appendPart: Scalars['Boolean']['output'];
    assistantId: Scalars['ID']['output'];
    createdAt: Scalars['Time']['output'];
    flowId: Scalars['ID']['output'];
    id: Scalars['ID']['output'];
    message: Scalars['String']['output'];
    result: Scalars['String']['output'];
    resultFormat: ResultFormat;
    thinking?: Maybe<Scalars['String']['output']>;
    type: MessageLogType;
};

export type ChatMessage = {
    content: Scalars['String']['output'];
    createdAt: Scalars['Time']['output'];
    id: Scalars['ID']['output'];
    model: Scalars['String']['output'];
    providerName: Scalars['String']['output'];
    role: ChatMessageRole;
    sessionId: Scalars['ID']['output'];
    status: ChatMessageStatus;
    updatedAt: Scalars['Time']['output'];
};

export enum ChatMessageRole {
    Assistant = 'assistant',
    User = 'user',
}

export enum ChatMessageStatus {
    Done = 'done',
    Error = 'error',
    Refused = 'refused',
    Stopped = 'stopped',
    Streaming = 'streaming',
}

export type ChatQuota = {
    maxInputChars: Scalars['Int']['output'];
    messagesLimit: Scalars['Int']['output'];
    messagesResetAt?: Maybe<Scalars['Time']['output']>;
    messagesUsed: Scalars['Int']['output'];
    tokensLimit: Scalars['Int']['output'];
    tokensResetAt?: Maybe<Scalars['Time']['output']>;
    tokensUsed: Scalars['Int']['output'];
};

export type ChatSendResult = {
    assistantMessage: ChatMessage;
    session: ChatSession;
    userMessage: ChatMessage;
};

export type ChatSession = {
    createdAt: Scalars['Time']['output'];
    id: Scalars['ID']['output'];
    providerName: Scalars['String']['output'];
    title: Scalars['String']['output'];
    updatedAt: Scalars['Time']['output'];
};

export type CreateApiTokenInput = {
    name?: InputMaybe<Scalars['String']['input']>;
    ttl: Scalars['Int']['input'];
};

export type CreateDomainInput = {
    autoDetect?: InputMaybe<Scalars['Boolean']['input']>;
    modelProvider?: InputMaybe<Scalars['String']['input']>;
    name: Scalars['String']['input'];
    targetType?: InputMaybe<TargetType>;
    templateIds: Array<Scalars['ID']['input']>;
};

export type CreateFlowTemplateInput = {
    targetTypes?: InputMaybe<Array<TargetType>>;
    text: Scalars['String']['input'];
    title: Scalars['String']['input'];
};

export type CreateScanInput = {
    box?: InputMaybe<ScanBox>;
    credential?: InputMaybe<ScanCredentialInput>;
    modelProvider?: InputMaybe<Scalars['String']['input']>;
    name: Scalars['String']['input'];
    scope?: InputMaybe<ScanScope>;
    targetType: TargetType;
    templates: Array<ScanTemplateInput>;
};

export type DailyFlowsStats = {
    date: Scalars['Time']['output'];
    stats: FlowsStats;
};

export type DailyToolcallsStats = {
    date: Scalars['Time']['output'];
    stats: ToolcallsStats;
};

export type DailyUsageStats = {
    date: Scalars['Time']['output'];
    stats: UsageStats;
};

export type DefaultPrompt = {
    template: Scalars['String']['output'];
    type: PromptType;
    variables: Array<Scalars['String']['output']>;
};

export type DefaultPrompts = {
    agents: AgentsPrompts;
    tools: ToolsPrompts;
};

export type DefaultProvidersConfig = {
    anthropic: ProviderConfig;
    bedrock?: Maybe<ProviderConfig>;
    custom?: Maybe<ProviderConfig>;
    deepseek?: Maybe<ProviderConfig>;
    gemini?: Maybe<ProviderConfig>;
    glm?: Maybe<ProviderConfig>;
    kimi?: Maybe<ProviderConfig>;
    ollama?: Maybe<ProviderConfig>;
    openai: ProviderConfig;
    qwen?: Maybe<ProviderConfig>;
};

export type Domain = {
    box?: Maybe<ScanBox>;
    createdAt: Scalars['Time']['output'];
    detectionMetadata: Scalars['String']['output'];
    flows: Array<Flow>;
    id: Scalars['ID']['output'];
    name: Scalars['String']['output'];
    scope?: Maybe<ScanScope>;
    status: DomainStatusType;
    targetType: TargetType;
    updatedAt: Scalars['Time']['output'];
};

export enum DomainStatusType {
    Classifying = 'classifying',
    Created = 'created',
    Failed = 'failed',
    Finished = 'finished',
    Running = 'running',
    Waiting = 'waiting',
}

export type Finding = {
    affectedUrls?: Maybe<Array<Scalars['String']['output']>>;
    cve?: Maybe<Scalars['String']['output']>;
    cvss?: Maybe<Scalars['Float']['output']>;
    description?: Maybe<Scalars['String']['output']>;
    evidence?: Maybe<Scalars['String']['output']>;
    impact?: Maybe<Array<Scalars['String']['output']>>;
    index: Scalars['Int']['output'];
    originalCvss?: Maybe<Scalars['Float']['output']>;
    originalSeverity?: Maybe<Severity>;
    recommendation?: Maybe<Scalars['String']['output']>;
    references?: Maybe<Array<Scalars['String']['output']>>;
    severity: Severity;
    severityUpdated: Scalars['Boolean']['output'];
    stepsToReproduce?: Maybe<Array<Scalars['String']['output']>>;
    taskId: Scalars['ID']['output'];
    title: Scalars['String']['output'];
};

export type Flow = {
    createdAt: Scalars['Time']['output'];
    findings: Array<Finding>;
    id: Scalars['ID']['output'];
    provider: Provider;
    status: StatusType;
    terminals?: Maybe<Array<Terminal>>;
    title: Scalars['String']['output'];
    updatedAt: Scalars['Time']['output'];
};

export type FlowAssistant = {
    assistant: Assistant;
    flow: Flow;
};

export type FlowExecutionStats = {
    flowId: Scalars['ID']['output'];
    flowTitle: Scalars['String']['output'];
    tasks: Array<TaskExecutionStats>;
    totalAssistantsCount: Scalars['Int']['output'];
    totalDurationSeconds: Scalars['Float']['output'];
    totalToolcallsCount: Scalars['Int']['output'];
};

export type FlowStats = {
    totalAssistantsCount: Scalars['Int']['output'];
    totalSubtasksCount: Scalars['Int']['output'];
    totalTasksCount: Scalars['Int']['output'];
};

export type FlowTemplate = {
    createdAt: Scalars['Time']['output'];
    id: Scalars['ID']['output'];
    systemOwned: Scalars['Boolean']['output'];
    targetTypes: Array<TargetType>;
    text: Scalars['String']['output'];
    title: Scalars['String']['output'];
    updatedAt: Scalars['Time']['output'];
    userId?: Maybe<Scalars['ID']['output']>;
    version: Scalars['Int']['output'];
};

export type FlowTemplateRequest = {
    baseVersion?: Maybe<Scalars['Int']['output']>;
    createdAt: Scalars['Time']['output'];
    id: Scalars['ID']['output'];
    kind: TemplateRequestKind;
    requesterId: Scalars['ID']['output'];
    requesterName: Scalars['String']['output'];
    reviewNote?: Maybe<Scalars['String']['output']>;
    reviewedAt?: Maybe<Scalars['Time']['output']>;
    reviewedBy?: Maybe<Scalars['ID']['output']>;
    reviewerName?: Maybe<Scalars['String']['output']>;
    revision: Scalars['Int']['output'];
    status: TemplateRequestStatus;
    targetTypes: Array<TargetType>;
    templateId?: Maybe<Scalars['ID']['output']>;
    text: Scalars['String']['output'];
    title: Scalars['String']['output'];
    updatedAt: Scalars['Time']['output'];
};

export type FlowTemplateRequestInput = {
    targetTypes?: InputMaybe<Array<TargetType>>;
    text: Scalars['String']['input'];
    title: Scalars['String']['input'];
};

export type FlowsStats = {
    totalAssistantsCount: Scalars['Int']['output'];
    totalFlowsCount: Scalars['Int']['output'];
    totalSubtasksCount: Scalars['Int']['output'];
    totalTasksCount: Scalars['Int']['output'];
};

export type FunctionToolcallsStats = {
    avgDurationSeconds: Scalars['Float']['output'];
    functionName: Scalars['String']['output'];
    isAgent: Scalars['Boolean']['output'];
    totalCount: Scalars['Int']['output'];
    totalDurationSeconds: Scalars['Float']['output'];
};

export type MessageLog = {
    createdAt: Scalars['Time']['output'];
    flowId: Scalars['ID']['output'];
    id: Scalars['ID']['output'];
    message: Scalars['String']['output'];
    result: Scalars['String']['output'];
    resultFormat: ResultFormat;
    subtaskId?: Maybe<Scalars['ID']['output']>;
    taskId?: Maybe<Scalars['ID']['output']>;
    thinking?: Maybe<Scalars['String']['output']>;
    type: MessageLogType;
};

export enum MessageLogType {
    Advice = 'advice',
    Answer = 'answer',
    Ask = 'ask',
    Browser = 'browser',
    Done = 'done',
    File = 'file',
    Input = 'input',
    Report = 'report',
    Search = 'search',
    Terminal = 'terminal',
    Thoughts = 'thoughts',
}

export type ModelConfig = {
    description?: Maybe<Scalars['String']['output']>;
    name: Scalars['String']['output'];
    price?: Maybe<ModelPrice>;
    releaseDate?: Maybe<Scalars['Time']['output']>;
    thinking?: Maybe<Scalars['Boolean']['output']>;
};

export type ModelPrice = {
    cacheRead: Scalars['Float']['output'];
    cacheWrite: Scalars['Float']['output'];
    input: Scalars['Float']['output'];
    output: Scalars['Float']['output'];
};

export type ModelPriceInput = {
    cacheRead: Scalars['Float']['input'];
    cacheWrite: Scalars['Float']['input'];
    input: Scalars['Float']['input'];
    output: Scalars['Float']['input'];
};

export type ModelUsageStats = {
    model: Scalars['String']['output'];
    provider: Scalars['String']['output'];
    stats: UsageStats;
};

export type Mutation = {
    addFavoriteFlow: ResultType;
    approveFlowTemplateRequest: FlowTemplateRequest;
    callAssistant: ResultType;
    createAPIToken: ApiTokenWithSecret;
    createAssistant: FlowAssistant;
    createDomain: Domain;
    createFlow: Flow;
    createFlowTemplate: FlowTemplate;
    createPrompt: UserPrompt;
    createProvider: ProviderConfig;
    createScan: Domain;
    deleteAPIToken: Scalars['Boolean']['output'];
    deleteAssistant: ResultType;
    deleteChatSession: ResultType;
    deleteDomain: ResultType;
    deleteFavoriteFlow: ResultType;
    deleteFlow: ResultType;
    deleteFlowTemplate: ResultType;
    deletePrompt: ResultType;
    deleteProvider: ResultType;
    finishFlow: ResultType;
    putUserInput: ResultType;
    rejectFlowTemplateRequest: FlowTemplateRequest;
    renameChatSession: ChatSession;
    renameFlow: ResultType;
    sendChatMessage: ChatSendResult;
    setDefaultProvider: ProviderConfig;
    stopAssistant: Assistant;
    stopChatMessage: ChatMessage;
    stopFlow: ResultType;
    submitFlowTemplateRequest: FlowTemplateRequest;
    testAgent: AgentTestResult;
    testProvider: ProviderTestResult;
    updateAPIToken: ApiToken;
    updateFindingCvss: ResultType;
    updateFindingSeverity: ResultType;
    updateFlowTemplate: FlowTemplate;
    updateFlowTemplateRequest: FlowTemplateRequest;
    updateFlowTemplateTargetTypes: FlowTemplate;
    updatePrompt: UserPrompt;
    updateProvider: ProviderConfig;
    validatePrompt: PromptValidationResult;
    withdrawFlowTemplateRequest: FlowTemplateRequest;
};

export type MutationAddFavoriteFlowArgs = {
    flowId: Scalars['ID']['input'];
};

export type MutationApproveFlowTemplateRequestArgs = {
    note?: InputMaybe<Scalars['String']['input']>;
    requestId: Scalars['ID']['input'];
    revision: Scalars['Int']['input'];
    templateVersion?: InputMaybe<Scalars['Int']['input']>;
};

export type MutationCallAssistantArgs = {
    assistantId: Scalars['ID']['input'];
    flowId: Scalars['ID']['input'];
    input: Scalars['String']['input'];
    useAgents: Scalars['Boolean']['input'];
};

export type MutationCreateApiTokenArgs = {
    input: CreateApiTokenInput;
};

export type MutationCreateAssistantArgs = {
    flowId: Scalars['ID']['input'];
    input: Scalars['String']['input'];
    modelProvider?: InputMaybe<Scalars['String']['input']>;
    useAgents: Scalars['Boolean']['input'];
};

export type MutationCreateDomainArgs = {
    input: CreateDomainInput;
};

export type MutationCreateFlowArgs = {
    input: Scalars['String']['input'];
    modelProvider?: InputMaybe<Scalars['String']['input']>;
};

export type MutationCreateFlowTemplateArgs = {
    input: CreateFlowTemplateInput;
};

export type MutationCreatePromptArgs = {
    template: Scalars['String']['input'];
    type: PromptType;
};

export type MutationCreateProviderArgs = {
    agents: AgentsConfigInput;
    name: Scalars['String']['input'];
    type: ProviderType;
};

export type MutationCreateScanArgs = {
    input: CreateScanInput;
};

export type MutationDeleteApiTokenArgs = {
    tokenId: Scalars['String']['input'];
};

export type MutationDeleteAssistantArgs = {
    assistantId: Scalars['ID']['input'];
    flowId: Scalars['ID']['input'];
};

export type MutationDeleteChatSessionArgs = {
    sessionId: Scalars['ID']['input'];
};

export type MutationDeleteDomainArgs = {
    id: Scalars['ID']['input'];
};

export type MutationDeleteFavoriteFlowArgs = {
    flowId: Scalars['ID']['input'];
};

export type MutationDeleteFlowArgs = {
    flowId: Scalars['ID']['input'];
};

export type MutationDeleteFlowTemplateArgs = {
    templateId: Scalars['ID']['input'];
};

export type MutationDeletePromptArgs = {
    promptId: Scalars['ID']['input'];
};

export type MutationDeleteProviderArgs = {
    providerId: Scalars['ID']['input'];
};

export type MutationFinishFlowArgs = {
    flowId: Scalars['ID']['input'];
};

export type MutationPutUserInputArgs = {
    flowId: Scalars['ID']['input'];
    input: Scalars['String']['input'];
    modelProvider?: InputMaybe<Scalars['String']['input']>;
};

export type MutationRejectFlowTemplateRequestArgs = {
    note: Scalars['String']['input'];
    requestId: Scalars['ID']['input'];
    revision: Scalars['Int']['input'];
};

export type MutationRenameChatSessionArgs = {
    sessionId: Scalars['ID']['input'];
    title: Scalars['String']['input'];
};

export type MutationRenameFlowArgs = {
    flowId: Scalars['ID']['input'];
    title: Scalars['String']['input'];
};

export type MutationSendChatMessageArgs = {
    content: Scalars['String']['input'];
    providerName?: InputMaybe<Scalars['String']['input']>;
    sessionId?: InputMaybe<Scalars['ID']['input']>;
};

export type MutationSetDefaultProviderArgs = {
    providerId: Scalars['ID']['input'];
};

export type MutationStopAssistantArgs = {
    assistantId: Scalars['ID']['input'];
    flowId: Scalars['ID']['input'];
};

export type MutationStopChatMessageArgs = {
    messageId: Scalars['ID']['input'];
};

export type MutationStopFlowArgs = {
    flowId: Scalars['ID']['input'];
};

export type MutationSubmitFlowTemplateRequestArgs = {
    input: FlowTemplateRequestInput;
    templateId?: InputMaybe<Scalars['ID']['input']>;
};

export type MutationTestAgentArgs = {
    agent: AgentConfigInput;
    agentType: AgentConfigType;
    type: ProviderType;
};

export type MutationTestProviderArgs = {
    agents: AgentsConfigInput;
    type: ProviderType;
};

export type MutationUpdateApiTokenArgs = {
    input: UpdateApiTokenInput;
    tokenId: Scalars['String']['input'];
};

export type MutationUpdateFindingCvssArgs = {
    assistantId?: InputMaybe<Scalars['ID']['input']>;
    cvss: Scalars['Float']['input'];
    expectedTitle: Scalars['String']['input'];
    index: Scalars['Int']['input'];
    taskId?: InputMaybe<Scalars['ID']['input']>;
};

export type MutationUpdateFindingSeverityArgs = {
    assistantId?: InputMaybe<Scalars['ID']['input']>;
    expectedTitle: Scalars['String']['input'];
    index: Scalars['Int']['input'];
    severity: Severity;
    taskId?: InputMaybe<Scalars['ID']['input']>;
};

export type MutationUpdateFlowTemplateArgs = {
    input: UpdateFlowTemplateInput;
    templateId: Scalars['ID']['input'];
};

export type MutationUpdateFlowTemplateRequestArgs = {
    input: FlowTemplateRequestInput;
    requestId: Scalars['ID']['input'];
    revision: Scalars['Int']['input'];
};

export type MutationUpdateFlowTemplateTargetTypesArgs = {
    targetTypes: Array<TargetType>;
    templateId: Scalars['ID']['input'];
};

export type MutationUpdatePromptArgs = {
    promptId: Scalars['ID']['input'];
    template: Scalars['String']['input'];
};

export type MutationUpdateProviderArgs = {
    agents: AgentsConfigInput;
    name: Scalars['String']['input'];
    providerId: Scalars['ID']['input'];
};

export type MutationValidatePromptArgs = {
    template: Scalars['String']['input'];
    type: PromptType;
};

export type MutationWithdrawFlowTemplateRequestArgs = {
    requestId: Scalars['ID']['input'];
};

export enum PromptType {
    Adviser = 'adviser',
    Assistant = 'assistant',
    Coder = 'coder',
    Enricher = 'enricher',
    ExecutionLogs = 'execution_logs',
    FlowDescriptor = 'flow_descriptor',
    FullExecutionContext = 'full_execution_context',
    Generator = 'generator',
    ImageChooser = 'image_chooser',
    InputToolcallFixer = 'input_toolcall_fixer',
    Installer = 'installer',
    LanguageChooser = 'language_chooser',
    Memorist = 'memorist',
    Pentester = 'pentester',
    PrimaryAgent = 'primary_agent',
    QuestionAdviser = 'question_adviser',
    QuestionCoder = 'question_coder',
    QuestionEnricher = 'question_enricher',
    QuestionExecutionMonitor = 'question_execution_monitor',
    QuestionInstaller = 'question_installer',
    QuestionMemorist = 'question_memorist',
    QuestionPentester = 'question_pentester',
    QuestionReflector = 'question_reflector',
    QuestionSearcher = 'question_searcher',
    QuestionTaskPlanner = 'question_task_planner',
    Refiner = 'refiner',
    Reflector = 'reflector',
    Reporter = 'reporter',
    Searcher = 'searcher',
    ShortExecutionContext = 'short_execution_context',
    SubtasksGenerator = 'subtasks_generator',
    SubtasksRefiner = 'subtasks_refiner',
    Summarizer = 'summarizer',
    TaskAssignmentWrapper = 'task_assignment_wrapper',
    TaskDescriptor = 'task_descriptor',
    TaskReporter = 'task_reporter',
    ToolCallIdCollector = 'tool_call_id_collector',
    ToolCallIdDetector = 'tool_call_id_detector',
    ToolcallFixer = 'toolcall_fixer',
}

export enum PromptValidationErrorType {
    EmptyTemplate = 'empty_template',
    RenderingFailed = 'rendering_failed',
    SyntaxError = 'syntax_error',
    UnauthorizedVariable = 'unauthorized_variable',
    UnknownType = 'unknown_type',
    VariableTypeMismatch = 'variable_type_mismatch',
}

export type PromptValidationResult = {
    details?: Maybe<Scalars['String']['output']>;
    errorType?: Maybe<PromptValidationErrorType>;
    line?: Maybe<Scalars['Int']['output']>;
    message?: Maybe<Scalars['String']['output']>;
    result: ResultType;
};

export type PromptsConfig = {
    default: DefaultPrompts;
    userDefined?: Maybe<Array<UserPrompt>>;
};

export type Provider = {
    isDefault: Scalars['Boolean']['output'];
    name: Scalars['String']['output'];
    type: ProviderType;
};

export type ProviderConfig = {
    agents: AgentsConfig;
    createdAt: Scalars['Time']['output'];
    id: Scalars['ID']['output'];
    isDefault: Scalars['Boolean']['output'];
    name: Scalars['String']['output'];
    type: ProviderType;
    updatedAt: Scalars['Time']['output'];
};

export type ProviderTestResult = {
    adviser: AgentTestResult;
    assistant: AgentTestResult;
    coder: AgentTestResult;
    enricher: AgentTestResult;
    generator: AgentTestResult;
    installer: AgentTestResult;
    pentester: AgentTestResult;
    primaryAgent: AgentTestResult;
    refiner: AgentTestResult;
    reflector: AgentTestResult;
    searcher: AgentTestResult;
    simple: AgentTestResult;
    simpleJson: AgentTestResult;
};

export enum ProviderType {
    Anthropic = 'anthropic',
    Bedrock = 'bedrock',
    Custom = 'custom',
    Deepseek = 'deepseek',
    Gemini = 'gemini',
    Glm = 'glm',
    Kimi = 'kimi',
    Ollama = 'ollama',
    Openai = 'openai',
    Qwen = 'qwen',
}

export type ProviderUsageStats = {
    provider: Scalars['String']['output'];
    stats: UsageStats;
};

export type ProvidersConfig = {
    default: DefaultProvidersConfig;
    enabled: ProvidersReadinessStatus;
    models: ProvidersModelsList;
    userDefined?: Maybe<Array<ProviderConfig>>;
};

export type ProvidersModelsList = {
    anthropic: Array<ModelConfig>;
    bedrock?: Maybe<Array<ModelConfig>>;
    custom?: Maybe<Array<ModelConfig>>;
    deepseek?: Maybe<Array<ModelConfig>>;
    gemini: Array<ModelConfig>;
    glm?: Maybe<Array<ModelConfig>>;
    kimi?: Maybe<Array<ModelConfig>>;
    ollama?: Maybe<Array<ModelConfig>>;
    openai: Array<ModelConfig>;
    qwen?: Maybe<Array<ModelConfig>>;
};

export type ProvidersReadinessStatus = {
    anthropic: Scalars['Boolean']['output'];
    bedrock: Scalars['Boolean']['output'];
    custom: Scalars['Boolean']['output'];
    deepseek: Scalars['Boolean']['output'];
    gemini: Scalars['Boolean']['output'];
    glm: Scalars['Boolean']['output'];
    kimi: Scalars['Boolean']['output'];
    ollama: Scalars['Boolean']['output'];
    openai: Scalars['Boolean']['output'];
    qwen: Scalars['Boolean']['output'];
};

export type Query = {
    agentLogs?: Maybe<Array<AgentLog>>;
    apiToken?: Maybe<ApiToken>;
    apiTokens: Array<ApiToken>;
    assistantLogs?: Maybe<Array<AssistantLog>>;
    assistants?: Maybe<Array<Assistant>>;
    chatMessages: Array<ChatMessage>;
    chatQuota: ChatQuota;
    chatSession?: Maybe<ChatSession>;
    chatSessions: Array<ChatSession>;
    checkTarget: TargetCheckResult;
    domain?: Maybe<Domain>;
    domains: Array<Domain>;
    flow: Flow;
    flowStatsByFlow: FlowStats;
    flowTemplate?: Maybe<FlowTemplate>;
    flowTemplateRequest?: Maybe<FlowTemplateRequest>;
    flowTemplateRequests: Array<FlowTemplateRequest>;
    flowTemplates: Array<FlowTemplate>;
    flowTemplatesByTargetType: Array<FlowTemplate>;
    flows?: Maybe<Array<Flow>>;
    flowsExecutionStatsByPeriod: Array<FlowExecutionStats>;
    flowsStatsByPeriod: Array<DailyFlowsStats>;
    flowsStatsTotal: FlowsStats;
    messageLogs?: Maybe<Array<MessageLog>>;
    providers: Array<Provider>;
    quotaUsage: QuotaUsage;
    screenshots?: Maybe<Array<Screenshot>>;
    searchLogs?: Maybe<Array<SearchLog>>;
    settings: Settings;
    settingsPrompts: PromptsConfig;
    settingsProviders: ProvidersConfig;
    settingsUser: UserPreferences;
    tasks?: Maybe<Array<Task>>;
    terminalLogs?: Maybe<Array<TerminalLog>>;
    toolcallsStatsByFlow: ToolcallsStats;
    toolcallsStatsByFunction: Array<FunctionToolcallsStats>;
    toolcallsStatsByFunctionForFlow: Array<FunctionToolcallsStats>;
    toolcallsStatsByPeriod: Array<DailyToolcallsStats>;
    toolcallsStatsTotal: ToolcallsStats;
    usageStatsByAgentType: Array<AgentTypeUsageStats>;
    usageStatsByAgentTypeForFlow: Array<AgentTypeUsageStats>;
    usageStatsByFlow: UsageStats;
    usageStatsByModel: Array<ModelUsageStats>;
    usageStatsByPeriod: Array<DailyUsageStats>;
    usageStatsByProvider: Array<ProviderUsageStats>;
    usageStatsTotal: UsageStats;
    vectorStoreLogs?: Maybe<Array<VectorStoreLog>>;
};

export type QueryAgentLogsArgs = {
    flowId: Scalars['ID']['input'];
};

export type QueryApiTokenArgs = {
    tokenId: Scalars['String']['input'];
};

export type QueryAssistantLogsArgs = {
    assistantId: Scalars['ID']['input'];
    flowId: Scalars['ID']['input'];
};

export type QueryAssistantsArgs = {
    flowId: Scalars['ID']['input'];
};

export type QueryChatMessagesArgs = {
    sessionId: Scalars['ID']['input'];
};

export type QueryChatSessionArgs = {
    sessionId: Scalars['ID']['input'];
};

export type QueryCheckTargetArgs = {
    target: Scalars['String']['input'];
};

export type QueryDomainArgs = {
    id: Scalars['ID']['input'];
};

export type QueryFlowArgs = {
    flowId: Scalars['ID']['input'];
};

export type QueryFlowStatsByFlowArgs = {
    flowId: Scalars['ID']['input'];
};

export type QueryFlowTemplateArgs = {
    templateId: Scalars['ID']['input'];
};

export type QueryFlowTemplateRequestArgs = {
    requestId: Scalars['ID']['input'];
};

export type QueryFlowTemplatesByTargetTypeArgs = {
    targetType: TargetType;
};

export type QueryFlowsExecutionStatsByPeriodArgs = {
    period: UsageStatsPeriod;
};

export type QueryFlowsStatsByPeriodArgs = {
    period: UsageStatsPeriod;
};

export type QueryMessageLogsArgs = {
    flowId: Scalars['ID']['input'];
};

export type QueryScreenshotsArgs = {
    flowId: Scalars['ID']['input'];
};

export type QuerySearchLogsArgs = {
    flowId: Scalars['ID']['input'];
};

export type QueryTasksArgs = {
    flowId: Scalars['ID']['input'];
};

export type QueryTerminalLogsArgs = {
    flowId: Scalars['ID']['input'];
};

export type QueryToolcallsStatsByFlowArgs = {
    flowId: Scalars['ID']['input'];
};

export type QueryToolcallsStatsByFunctionForFlowArgs = {
    flowId: Scalars['ID']['input'];
};

export type QueryToolcallsStatsByPeriodArgs = {
    period: UsageStatsPeriod;
};

export type QueryUsageStatsByAgentTypeForFlowArgs = {
    flowId: Scalars['ID']['input'];
};

export type QueryUsageStatsByFlowArgs = {
    flowId: Scalars['ID']['input'];
};

export type QueryUsageStatsByPeriodArgs = {
    period: UsageStatsPeriod;
};

export type QueryVectorStoreLogsArgs = {
    flowId: Scalars['ID']['input'];
};

export type QuotaUsage = {
    domainsCurrent: Scalars['Int']['output'];
    domainsMax: Scalars['Int']['output'];
    flowsCurrent: Scalars['Int']['output'];
    flowsMax: Scalars['Int']['output'];
    flowsPerDomainMax: Scalars['Int']['output'];
};

export type ReasoningConfig = {
    effort?: Maybe<ReasoningEffort>;
    maxTokens?: Maybe<Scalars['Int']['output']>;
};

export type ReasoningConfigInput = {
    effort?: InputMaybe<ReasoningEffort>;
    maxTokens?: InputMaybe<Scalars['Int']['input']>;
};

export enum ReasoningEffort {
    High = 'high',
    Low = 'low',
    Medium = 'medium',
}

export enum ResultFormat {
    Markdown = 'markdown',
    Plain = 'plain',
    Terminal = 'terminal',
}

export enum ResultType {
    Error = 'error',
    Success = 'success',
}

export enum ScanBox {
    Black = 'black',
    Grey = 'grey',
}

export type ScanCredentialInput = {
    kind: ScanCredentialKind;
    value: Scalars['String']['input'];
};

export enum ScanCredentialKind {
    CloudKeys = 'cloud_keys',
    EmailPassword = 'email_password',
    WebToken = 'web_token',
}

export enum ScanRunMode {
    Assistant = 'assistant',
    Automatic = 'automatic',
}

export enum ScanScope {
    External = 'external',
    Internal = 'internal',
}

export type ScanTemplateInput = {
    runMode: ScanRunMode;
    templateId: Scalars['ID']['input'];
};

export type Screenshot = {
    createdAt: Scalars['Time']['output'];
    flowId: Scalars['ID']['output'];
    id: Scalars['ID']['output'];
    name: Scalars['String']['output'];
    subtaskId?: Maybe<Scalars['ID']['output']>;
    taskId?: Maybe<Scalars['ID']['output']>;
    url: Scalars['String']['output'];
};

export type SearchLog = {
    createdAt: Scalars['Time']['output'];
    engine: Scalars['String']['output'];
    executor: AgentType;
    flowId: Scalars['ID']['output'];
    id: Scalars['ID']['output'];
    initiator: AgentType;
    query: Scalars['String']['output'];
    result: Scalars['String']['output'];
    subtaskId?: Maybe<Scalars['ID']['output']>;
    taskId?: Maybe<Scalars['ID']['output']>;
};

export type Settings = {
    askUser: Scalars['Boolean']['output'];
    assistantUseAgents: Scalars['Boolean']['output'];
    debug: Scalars['Boolean']['output'];
    dockerInside: Scalars['Boolean']['output'];
};

export enum Severity {
    Critical = 'critical',
    High = 'high',
    Informational = 'informational',
    Low = 'low',
    Medium = 'medium',
}

export enum StatusType {
    Created = 'created',
    Failed = 'failed',
    Finished = 'finished',
    Running = 'running',
    Waiting = 'waiting',
}

export type Subscription = {
    agentLogAdded: AgentLog;
    apiTokenCreated: ApiToken;
    apiTokenDeleted: ApiToken;
    apiTokenUpdated: ApiToken;
    assistantCreated: Assistant;
    assistantDeleted: Assistant;
    assistantLogAdded: AssistantLog;
    assistantLogUpdated: AssistantLog;
    assistantUpdated: Assistant;
    chatMessageAdded: ChatMessage;
    chatMessageUpdated: ChatMessage;
    chatSessionCreated: ChatSession;
    chatSessionDeleted: ChatSession;
    chatSessionUpdated: ChatSession;
    domainCreated: Domain;
    domainDeleted: Domain;
    domainUpdated: Domain;
    flowCreated: Flow;
    flowDeleted: Flow;
    flowTemplateCreated: FlowTemplate;
    flowTemplateDeleted: FlowTemplate;
    flowTemplateRequestCreated: FlowTemplateRequest;
    flowTemplateRequestUpdated: FlowTemplateRequest;
    flowTemplateUpdated: FlowTemplate;
    flowUpdated: Flow;
    messageLogAdded: MessageLog;
    messageLogUpdated: MessageLog;
    providerCreated: ProviderConfig;
    providerDeleted: ProviderConfig;
    providerUpdated: ProviderConfig;
    screenshotAdded: Screenshot;
    searchLogAdded: SearchLog;
    settingsUserUpdated: UserPreferences;
    taskCreated: Task;
    taskUpdated: Task;
    terminalLogAdded: TerminalLog;
    vectorStoreLogAdded: VectorStoreLog;
};

export type SubscriptionAgentLogAddedArgs = {
    flowId: Scalars['ID']['input'];
};

export type SubscriptionAssistantCreatedArgs = {
    flowId: Scalars['ID']['input'];
};

export type SubscriptionAssistantDeletedArgs = {
    flowId: Scalars['ID']['input'];
};

export type SubscriptionAssistantLogAddedArgs = {
    flowId: Scalars['ID']['input'];
};

export type SubscriptionAssistantLogUpdatedArgs = {
    flowId: Scalars['ID']['input'];
};

export type SubscriptionAssistantUpdatedArgs = {
    flowId: Scalars['ID']['input'];
};

export type SubscriptionChatMessageAddedArgs = {
    sessionId: Scalars['ID']['input'];
};

export type SubscriptionChatMessageUpdatedArgs = {
    sessionId: Scalars['ID']['input'];
};

export type SubscriptionMessageLogAddedArgs = {
    flowId: Scalars['ID']['input'];
};

export type SubscriptionMessageLogUpdatedArgs = {
    flowId: Scalars['ID']['input'];
};

export type SubscriptionScreenshotAddedArgs = {
    flowId: Scalars['ID']['input'];
};

export type SubscriptionSearchLogAddedArgs = {
    flowId: Scalars['ID']['input'];
};

export type SubscriptionTaskCreatedArgs = {
    flowId: Scalars['ID']['input'];
};

export type SubscriptionTaskUpdatedArgs = {
    flowId: Scalars['ID']['input'];
};

export type SubscriptionTerminalLogAddedArgs = {
    flowId: Scalars['ID']['input'];
};

export type SubscriptionVectorStoreLogAddedArgs = {
    flowId: Scalars['ID']['input'];
};

export type Subtask = {
    createdAt: Scalars['Time']['output'];
    description: Scalars['String']['output'];
    id: Scalars['ID']['output'];
    result: Scalars['String']['output'];
    status: StatusType;
    taskId: Scalars['ID']['output'];
    title: Scalars['String']['output'];
    updatedAt: Scalars['Time']['output'];
};

export type SubtaskExecutionStats = {
    subtaskId: Scalars['ID']['output'];
    subtaskTitle: Scalars['String']['output'];
    totalDurationSeconds: Scalars['Float']['output'];
    totalToolcallsCount: Scalars['Int']['output'];
};

export type TargetCheckResult = {
    cloudAccountId: Scalars['String']['output'];
    cloudProvider: Scalars['String']['output'];
    host: Scalars['String']['output'];
    httpStatus: Scalars['Int']['output'];
    input: Scalars['String']['output'];
    kind: TargetKind;
    message: Scalars['String']['output'];
    ok: Scalars['Boolean']['output'];
    outcome: TargetOutcome;
    port: Scalars['Int']['output'];
    service: Scalars['String']['output'];
    steps: Array<TargetCheckStep>;
};

export enum TargetCheckStatus {
    Fail = 'fail',
    Ok = 'ok',
    Skip = 'skip',
    Warn = 'warn',
}

export type TargetCheckStep = {
    detail: Scalars['String']['output'];
    name: Scalars['String']['output'];
    status: TargetCheckStatus;
};

export enum TargetKind {
    CloudAccount = 'cloud_account',
    Host = 'host',
    Invalid = 'invalid',
    Ip = 'ip',
    Url = 'url',
}

export enum TargetOutcome {
    AccountIdentifier = 'account_identifier',
    BlockedDestination = 'blocked_destination',
    CloudResourceNotFound = 'cloud_resource_not_found',
    DnsError = 'dns_error',
    DnsNotFound = 'dns_not_found',
    DnsOnly = 'dns_only',
    InvalidInput = 'invalid_input',
    NoResponse = 'no_response',
    Reachable = 'reachable',
    Responding = 'responding',
    Valid = 'valid',
}

export enum TargetType {
    Api = 'api',
    Aws = 'aws',
    Azure = 'azure',
    Cloud = 'cloud',
    Gcp = 'gcp',
    General = 'general',
    MobileBackend = 'mobile_backend',
    Network = 'network',
    WebApp = 'web_app',
}

export type Task = {
    createdAt: Scalars['Time']['output'];
    flowId: Scalars['ID']['output'];
    id: Scalars['ID']['output'];
    input: Scalars['String']['output'];
    result: Scalars['String']['output'];
    status: StatusType;
    subtasks?: Maybe<Array<Subtask>>;
    title: Scalars['String']['output'];
    updatedAt: Scalars['Time']['output'];
};

export type TaskExecutionStats = {
    subtasks: Array<SubtaskExecutionStats>;
    taskId: Scalars['ID']['output'];
    taskTitle: Scalars['String']['output'];
    totalDurationSeconds: Scalars['Float']['output'];
    totalToolcallsCount: Scalars['Int']['output'];
};

export enum TemplateRequestKind {
    Create = 'create',
    Update = 'update',
}

export enum TemplateRequestStatus {
    Approved = 'approved',
    Closed = 'closed',
    Pending = 'pending',
    Rejected = 'rejected',
    Withdrawn = 'withdrawn',
}

export type Terminal = {
    connected: Scalars['Boolean']['output'];
    createdAt: Scalars['Time']['output'];
    id: Scalars['ID']['output'];
    image: Scalars['String']['output'];
    name: Scalars['String']['output'];
    type: TerminalType;
};

export type TerminalLog = {
    createdAt: Scalars['Time']['output'];
    flowId: Scalars['ID']['output'];
    id: Scalars['ID']['output'];
    subtaskId?: Maybe<Scalars['ID']['output']>;
    taskId?: Maybe<Scalars['ID']['output']>;
    terminal: Scalars['ID']['output'];
    text: Scalars['String']['output'];
    type: TerminalLogType;
};

export enum TerminalLogType {
    Stderr = 'stderr',
    Stdin = 'stdin',
    Stdout = 'stdout',
}

export enum TerminalType {
    Primary = 'primary',
    Secondary = 'secondary',
}

export type TestResult = {
    error?: Maybe<Scalars['String']['output']>;
    latency?: Maybe<Scalars['Int']['output']>;
    name: Scalars['String']['output'];
    reasoning: Scalars['Boolean']['output'];
    result: Scalars['Boolean']['output'];
    streaming: Scalars['Boolean']['output'];
    type: Scalars['String']['output'];
};

export enum TokenStatus {
    Active = 'active',
    Expired = 'expired',
    Revoked = 'revoked',
}

export type ToolcallsStats = {
    totalCount: Scalars['Int']['output'];
    totalDurationSeconds: Scalars['Float']['output'];
};

export type ToolsPrompts = {
    chooseDockerImage: DefaultPrompt;
    chooseUserLanguage: DefaultPrompt;
    collectToolCallId: DefaultPrompt;
    detectToolCallIdPattern: DefaultPrompt;
    getExecutionLogs: DefaultPrompt;
    getFlowDescription: DefaultPrompt;
    getFullExecutionContext: DefaultPrompt;
    getShortExecutionContext: DefaultPrompt;
    getTaskDescription: DefaultPrompt;
    monitorAgentExecution: DefaultPrompt;
    planAgentTask: DefaultPrompt;
    wrapAgentTask: DefaultPrompt;
};

export type UpdateApiTokenInput = {
    name?: InputMaybe<Scalars['String']['input']>;
    status?: InputMaybe<TokenStatus>;
};

export type UpdateFlowTemplateInput = {
    targetTypes?: InputMaybe<Array<TargetType>>;
    text: Scalars['String']['input'];
    title: Scalars['String']['input'];
    version?: InputMaybe<Scalars['Int']['input']>;
};

export type UsageStats = {
    totalUsageCacheIn: Scalars['Int']['output'];
    totalUsageCacheOut: Scalars['Int']['output'];
    totalUsageCostIn: Scalars['Float']['output'];
    totalUsageCostOut: Scalars['Float']['output'];
    totalUsageIn: Scalars['Int']['output'];
    totalUsageOut: Scalars['Int']['output'];
};

export enum UsageStatsPeriod {
    Month = 'month',
    Quarter = 'quarter',
    Week = 'week',
}

export type UserPreferences = {
    favoriteFlows: Array<Scalars['ID']['output']>;
    id: Scalars['ID']['output'];
};

export type UserPrompt = {
    createdAt: Scalars['Time']['output'];
    id: Scalars['ID']['output'];
    template: Scalars['String']['output'];
    type: PromptType;
    updatedAt: Scalars['Time']['output'];
};

export enum VectorStoreAction {
    Retrieve = 'retrieve',
    Store = 'store',
}

export type VectorStoreLog = {
    action: VectorStoreAction;
    createdAt: Scalars['Time']['output'];
    executor: AgentType;
    filter: Scalars['String']['output'];
    flowId: Scalars['ID']['output'];
    id: Scalars['ID']['output'];
    initiator: AgentType;
    query: Scalars['String']['output'];
    result: Scalars['String']['output'];
    subtaskId?: Maybe<Scalars['ID']['output']>;
    taskId?: Maybe<Scalars['ID']['output']>;
};

export type SettingsFragmentFragment = {
    debug: boolean;
    askUser: boolean;
    dockerInside: boolean;
    assistantUseAgents: boolean;
};

export type FlowFragmentFragment = {
    id: string;
    title: string;
    status: StatusType;
    createdAt: any;
    updatedAt: any;
    terminals?: Array<TerminalFragmentFragment> | null;
    provider: ProviderFragmentFragment;
};

export type TerminalFragmentFragment = {
    id: string;
    type: TerminalType;
    name: string;
    image: string;
    connected: boolean;
    createdAt: any;
};

export type TaskFragmentFragment = {
    id: string;
    title: string;
    status: StatusType;
    input: string;
    result: string;
    flowId: string;
    createdAt: any;
    updatedAt: any;
    subtasks?: Array<SubtaskFragmentFragment> | null;
};

export type SubtaskFragmentFragment = {
    id: string;
    status: StatusType;
    title: string;
    description: string;
    result: string;
    taskId: string;
    createdAt: any;
    updatedAt: any;
};

export type TerminalLogFragmentFragment = {
    id: string;
    flowId: string;
    taskId?: string | null;
    subtaskId?: string | null;
    type: TerminalLogType;
    text: string;
    terminal: string;
    createdAt: any;
};

export type MessageLogFragmentFragment = {
    id: string;
    type: MessageLogType;
    message: string;
    thinking?: string | null;
    result: string;
    resultFormat: ResultFormat;
    flowId: string;
    taskId?: string | null;
    subtaskId?: string | null;
    createdAt: any;
};

export type ScreenshotFragmentFragment = {
    id: string;
    flowId: string;
    taskId?: string | null;
    subtaskId?: string | null;
    name: string;
    url: string;
    createdAt: any;
};

export type AgentLogFragmentFragment = {
    id: string;
    flowId: string;
    initiator: AgentType;
    executor: AgentType;
    task: string;
    result: string;
    taskId?: string | null;
    subtaskId?: string | null;
    createdAt: any;
};

export type SearchLogFragmentFragment = {
    id: string;
    flowId: string;
    initiator: AgentType;
    executor: AgentType;
    engine: string;
    query: string;
    result: string;
    taskId?: string | null;
    subtaskId?: string | null;
    createdAt: any;
};

export type VectorStoreLogFragmentFragment = {
    id: string;
    flowId: string;
    initiator: AgentType;
    executor: AgentType;
    filter: string;
    query: string;
    action: VectorStoreAction;
    result: string;
    taskId?: string | null;
    subtaskId?: string | null;
    createdAt: any;
};

export type AssistantFragmentFragment = {
    id: string;
    title: string;
    status: StatusType;
    flowId: string;
    useAgents: boolean;
    createdAt: any;
    updatedAt: any;
    provider: ProviderFragmentFragment;
    findings: Array<FindingFragmentFragment>;
};

export type AssistantLogFragmentFragment = {
    id: string;
    type: MessageLogType;
    message: string;
    thinking?: string | null;
    result: string;
    resultFormat: ResultFormat;
    appendPart: boolean;
    flowId: string;
    assistantId: string;
    createdAt: any;
};

export type TestResultFragmentFragment = {
    name: string;
    type: string;
    result: boolean;
    reasoning: boolean;
    streaming: boolean;
    latency?: number | null;
    error?: string | null;
};

export type AgentTestResultFragmentFragment = { tests: Array<TestResultFragmentFragment> };

export type ProviderTestResultFragmentFragment = {
    simple: AgentTestResultFragmentFragment;
    simpleJson: AgentTestResultFragmentFragment;
    primaryAgent: AgentTestResultFragmentFragment;
    assistant: AgentTestResultFragmentFragment;
    generator: AgentTestResultFragmentFragment;
    refiner: AgentTestResultFragmentFragment;
    adviser: AgentTestResultFragmentFragment;
    reflector: AgentTestResultFragmentFragment;
    searcher: AgentTestResultFragmentFragment;
    enricher: AgentTestResultFragmentFragment;
    coder: AgentTestResultFragmentFragment;
    installer: AgentTestResultFragmentFragment;
    pentester: AgentTestResultFragmentFragment;
};

export type ModelConfigFragmentFragment = {
    name: string;
    price?: { input: number; output: number; cacheRead: number; cacheWrite: number } | null;
};

export type ProviderFragmentFragment = { name: string; type: ProviderType; isDefault: boolean };

export type ProviderConfigFragmentFragment = {
    id: string;
    name: string;
    type: ProviderType;
    isDefault: boolean;
    createdAt: any;
    updatedAt: any;
    agents: AgentsConfigFragmentFragment;
};

export type AgentsConfigFragmentFragment = {
    simple: AgentConfigFragmentFragment;
    simpleJson: AgentConfigFragmentFragment;
    primaryAgent: AgentConfigFragmentFragment;
    assistant: AgentConfigFragmentFragment;
    generator: AgentConfigFragmentFragment;
    refiner: AgentConfigFragmentFragment;
    adviser: AgentConfigFragmentFragment;
    reflector: AgentConfigFragmentFragment;
    searcher: AgentConfigFragmentFragment;
    enricher: AgentConfigFragmentFragment;
    coder: AgentConfigFragmentFragment;
    installer: AgentConfigFragmentFragment;
    pentester: AgentConfigFragmentFragment;
};

export type AgentConfigFragmentFragment = {
    model: string;
    maxTokens?: number | null;
    temperature?: number | null;
    topK?: number | null;
    topP?: number | null;
    minLength?: number | null;
    maxLength?: number | null;
    repetitionPenalty?: number | null;
    frequencyPenalty?: number | null;
    presencePenalty?: number | null;
    reasoning?: { effort?: ReasoningEffort | null; maxTokens?: number | null } | null;
    price?: { input: number; output: number; cacheRead: number; cacheWrite: number } | null;
};

export type UserPromptFragmentFragment = {
    id: string;
    type: PromptType;
    template: string;
    createdAt: any;
    updatedAt: any;
};

export type DefaultPromptFragmentFragment = { type: PromptType; template: string; variables: Array<string> };

export type PromptValidationResultFragmentFragment = {
    result: ResultType;
    errorType?: PromptValidationErrorType | null;
    message?: string | null;
    line?: number | null;
    details?: string | null;
};

export type ApiTokenFragmentFragment = {
    id: string;
    tokenId: string;
    userId: string;
    roleId: string;
    name?: string | null;
    ttl: number;
    status: TokenStatus;
    createdAt: any;
    updatedAt: any;
};

export type ApiTokenWithSecretFragmentFragment = {
    id: string;
    tokenId: string;
    userId: string;
    roleId: string;
    name?: string | null;
    ttl: number;
    status: TokenStatus;
    createdAt: any;
    updatedAt: any;
    token: string;
};

export type FlowTemplateFragmentFragment = {
    id: string;
    userId?: string | null;
    title: string;
    text: string;
    targetTypes: Array<TargetType>;
    systemOwned: boolean;
    version: number;
    createdAt: any;
    updatedAt: any;
};

export type FlowTemplateRequestFragmentFragment = {
    id: string;
    kind: TemplateRequestKind;
    status: TemplateRequestStatus;
    templateId?: string | null;
    requesterId: string;
    requesterName: string;
    title: string;
    text: string;
    targetTypes: Array<TargetType>;
    revision: number;
    baseVersion?: number | null;
    reviewNote?: string | null;
    reviewedBy?: string | null;
    reviewerName?: string | null;
    reviewedAt?: any | null;
    createdAt: any;
    updatedAt: any;
};

export type UsageStatsFragmentFragment = {
    totalUsageIn: number;
    totalUsageOut: number;
    totalUsageCacheIn: number;
    totalUsageCacheOut: number;
    totalUsageCostIn: number;
    totalUsageCostOut: number;
};

export type DailyUsageStatsFragmentFragment = { date: any; stats: UsageStatsFragmentFragment };

export type ProviderUsageStatsFragmentFragment = { provider: string; stats: UsageStatsFragmentFragment };

export type ModelUsageStatsFragmentFragment = { model: string; provider: string; stats: UsageStatsFragmentFragment };

export type AgentTypeUsageStatsFragmentFragment = { agentType: AgentType; stats: UsageStatsFragmentFragment };

export type ToolcallsStatsFragmentFragment = { totalCount: number; totalDurationSeconds: number };

export type DailyToolcallsStatsFragmentFragment = { date: any; stats: ToolcallsStatsFragmentFragment };

export type FunctionToolcallsStatsFragmentFragment = {
    functionName: string;
    isAgent: boolean;
    totalCount: number;
    totalDurationSeconds: number;
    avgDurationSeconds: number;
};

export type FlowsStatsFragmentFragment = {
    totalFlowsCount: number;
    totalTasksCount: number;
    totalSubtasksCount: number;
    totalAssistantsCount: number;
};

export type FlowStatsFragmentFragment = {
    totalTasksCount: number;
    totalSubtasksCount: number;
    totalAssistantsCount: number;
};

export type DailyFlowsStatsFragmentFragment = { date: any; stats: FlowsStatsFragmentFragment };

export type SubtaskExecutionStatsFragmentFragment = {
    subtaskId: string;
    subtaskTitle: string;
    totalDurationSeconds: number;
    totalToolcallsCount: number;
};

export type TaskExecutionStatsFragmentFragment = {
    taskId: string;
    taskTitle: string;
    totalDurationSeconds: number;
    totalToolcallsCount: number;
    subtasks: Array<SubtaskExecutionStatsFragmentFragment>;
};

export type FlowExecutionStatsFragmentFragment = {
    flowId: string;
    flowTitle: string;
    totalDurationSeconds: number;
    totalToolcallsCount: number;
    totalAssistantsCount: number;
    tasks: Array<TaskExecutionStatsFragmentFragment>;
};

export type FlowsQueryVariables = Exact<{ [key: string]: never }>;

export type FlowsQuery = { flows?: Array<{ findings: Array<{ severity: Severity }> } & FlowFragmentFragment> | null };

export type ProvidersQueryVariables = Exact<{ [key: string]: never }>;

export type ProvidersQuery = { providers: Array<ProviderFragmentFragment> };

export type SettingsQueryVariables = Exact<{ [key: string]: never }>;

export type SettingsQuery = { settings: SettingsFragmentFragment };

export type SettingsProvidersQueryVariables = Exact<{ [key: string]: never }>;

export type SettingsProvidersQuery = {
    settingsProviders: {
        enabled: {
            openai: boolean;
            anthropic: boolean;
            gemini: boolean;
            bedrock: boolean;
            ollama: boolean;
            custom: boolean;
            deepseek: boolean;
            glm: boolean;
            kimi: boolean;
            qwen: boolean;
        };
        default: {
            openai: ProviderConfigFragmentFragment;
            anthropic: ProviderConfigFragmentFragment;
            gemini?: ProviderConfigFragmentFragment | null;
            bedrock?: ProviderConfigFragmentFragment | null;
            ollama?: ProviderConfigFragmentFragment | null;
            custom?: ProviderConfigFragmentFragment | null;
            deepseek?: ProviderConfigFragmentFragment | null;
            glm?: ProviderConfigFragmentFragment | null;
            kimi?: ProviderConfigFragmentFragment | null;
            qwen?: ProviderConfigFragmentFragment | null;
        };
        userDefined?: Array<ProviderConfigFragmentFragment> | null;
        models: {
            openai: Array<ModelConfigFragmentFragment>;
            anthropic: Array<ModelConfigFragmentFragment>;
            gemini: Array<ModelConfigFragmentFragment>;
            bedrock?: Array<ModelConfigFragmentFragment> | null;
            ollama?: Array<ModelConfigFragmentFragment> | null;
            custom?: Array<ModelConfigFragmentFragment> | null;
            deepseek?: Array<ModelConfigFragmentFragment> | null;
            glm?: Array<ModelConfigFragmentFragment> | null;
            kimi?: Array<ModelConfigFragmentFragment> | null;
            qwen?: Array<ModelConfigFragmentFragment> | null;
        };
    };
};

export type SettingsPromptsQueryVariables = Exact<{ [key: string]: never }>;

export type SettingsPromptsQuery = {
    settingsPrompts: {
        default: {
            agents: {
                primaryAgent: { system: DefaultPromptFragmentFragment };
                assistant: { system: DefaultPromptFragmentFragment };
                pentester: { system: DefaultPromptFragmentFragment; human: DefaultPromptFragmentFragment };
                coder: { system: DefaultPromptFragmentFragment; human: DefaultPromptFragmentFragment };
                installer: { system: DefaultPromptFragmentFragment; human: DefaultPromptFragmentFragment };
                searcher: { system: DefaultPromptFragmentFragment; human: DefaultPromptFragmentFragment };
                memorist: { system: DefaultPromptFragmentFragment; human: DefaultPromptFragmentFragment };
                adviser: { system: DefaultPromptFragmentFragment; human: DefaultPromptFragmentFragment };
                generator: { system: DefaultPromptFragmentFragment; human: DefaultPromptFragmentFragment };
                refiner: { system: DefaultPromptFragmentFragment; human: DefaultPromptFragmentFragment };
                reporter: { system: DefaultPromptFragmentFragment; human: DefaultPromptFragmentFragment };
                reflector: { system: DefaultPromptFragmentFragment; human: DefaultPromptFragmentFragment };
                enricher: { system: DefaultPromptFragmentFragment; human: DefaultPromptFragmentFragment };
                toolCallFixer: { system: DefaultPromptFragmentFragment; human: DefaultPromptFragmentFragment };
                summarizer: { system: DefaultPromptFragmentFragment };
            };
            tools: {
                getFlowDescription: DefaultPromptFragmentFragment;
                getTaskDescription: DefaultPromptFragmentFragment;
                getExecutionLogs: DefaultPromptFragmentFragment;
                getFullExecutionContext: DefaultPromptFragmentFragment;
                getShortExecutionContext: DefaultPromptFragmentFragment;
                chooseDockerImage: DefaultPromptFragmentFragment;
                chooseUserLanguage: DefaultPromptFragmentFragment;
                collectToolCallId: DefaultPromptFragmentFragment;
                detectToolCallIdPattern: DefaultPromptFragmentFragment;
                monitorAgentExecution: DefaultPromptFragmentFragment;
                planAgentTask: DefaultPromptFragmentFragment;
                wrapAgentTask: DefaultPromptFragmentFragment;
            };
        };
        userDefined?: Array<UserPromptFragmentFragment> | null;
    };
};

export type FlowQueryVariables = Exact<{
    id: Scalars['ID']['input'];
}>;

export type FlowQuery = {
    flow: FlowFragmentFragment;
    tasks?: Array<TaskFragmentFragment> | null;
    screenshots?: Array<ScreenshotFragmentFragment> | null;
    terminalLogs?: Array<TerminalLogFragmentFragment> | null;
    messageLogs?: Array<MessageLogFragmentFragment> | null;
    agentLogs?: Array<AgentLogFragmentFragment> | null;
    searchLogs?: Array<SearchLogFragmentFragment> | null;
    vectorStoreLogs?: Array<VectorStoreLogFragmentFragment> | null;
};

export type TasksQueryVariables = Exact<{
    flowId: Scalars['ID']['input'];
}>;

export type TasksQuery = { tasks?: Array<TaskFragmentFragment> | null };

export type AssistantsQueryVariables = Exact<{
    flowId: Scalars['ID']['input'];
}>;

export type AssistantsQuery = { assistants?: Array<AssistantFragmentFragment> | null };

export type AssistantLogsQueryVariables = Exact<{
    flowId: Scalars['ID']['input'];
    assistantId: Scalars['ID']['input'];
}>;

export type AssistantLogsQuery = { assistantLogs?: Array<AssistantLogFragmentFragment> | null };

export type FindingFragmentFragment = {
    taskId: string;
    index: number;
    title: string;
    severity: Severity;
    severityUpdated: boolean;
    originalSeverity?: Severity | null;
    originalCvss?: number | null;
    cvss?: number | null;
    cve?: string | null;
    affectedUrls?: Array<string> | null;
    description?: string | null;
    evidence?: string | null;
    impact?: Array<string> | null;
    stepsToReproduce?: Array<string> | null;
    recommendation?: string | null;
    references?: Array<string> | null;
};

export type FlowReportQueryVariables = Exact<{
    id: Scalars['ID']['input'];
}>;

export type FlowReportQuery = {
    flow: { findings: Array<FindingFragmentFragment> } & FlowFragmentFragment;
    tasks?: Array<TaskFragmentFragment> | null;
};

export type UsageStatsTotalQueryVariables = Exact<{ [key: string]: never }>;

export type UsageStatsTotalQuery = { usageStatsTotal: UsageStatsFragmentFragment };

export type UsageStatsByPeriodQueryVariables = Exact<{
    period: UsageStatsPeriod;
}>;

export type UsageStatsByPeriodQuery = { usageStatsByPeriod: Array<DailyUsageStatsFragmentFragment> };

export type UsageStatsByProviderQueryVariables = Exact<{ [key: string]: never }>;

export type UsageStatsByProviderQuery = { usageStatsByProvider: Array<ProviderUsageStatsFragmentFragment> };

export type UsageStatsByModelQueryVariables = Exact<{ [key: string]: never }>;

export type UsageStatsByModelQuery = { usageStatsByModel: Array<ModelUsageStatsFragmentFragment> };

export type UsageStatsByAgentTypeQueryVariables = Exact<{ [key: string]: never }>;

export type UsageStatsByAgentTypeQuery = { usageStatsByAgentType: Array<AgentTypeUsageStatsFragmentFragment> };

export type UsageStatsByFlowQueryVariables = Exact<{
    flowId: Scalars['ID']['input'];
}>;

export type UsageStatsByFlowQuery = { usageStatsByFlow: UsageStatsFragmentFragment };

export type UsageStatsByAgentTypeForFlowQueryVariables = Exact<{
    flowId: Scalars['ID']['input'];
}>;

export type UsageStatsByAgentTypeForFlowQuery = {
    usageStatsByAgentTypeForFlow: Array<AgentTypeUsageStatsFragmentFragment>;
};

export type ToolcallsStatsTotalQueryVariables = Exact<{ [key: string]: never }>;

export type ToolcallsStatsTotalQuery = { toolcallsStatsTotal: ToolcallsStatsFragmentFragment };

export type ToolcallsStatsByPeriodQueryVariables = Exact<{
    period: UsageStatsPeriod;
}>;

export type ToolcallsStatsByPeriodQuery = { toolcallsStatsByPeriod: Array<DailyToolcallsStatsFragmentFragment> };

export type ToolcallsStatsByFunctionQueryVariables = Exact<{ [key: string]: never }>;

export type ToolcallsStatsByFunctionQuery = { toolcallsStatsByFunction: Array<FunctionToolcallsStatsFragmentFragment> };

export type ToolcallsStatsByFlowQueryVariables = Exact<{
    flowId: Scalars['ID']['input'];
}>;

export type ToolcallsStatsByFlowQuery = { toolcallsStatsByFlow: ToolcallsStatsFragmentFragment };

export type ToolcallsStatsByFunctionForFlowQueryVariables = Exact<{
    flowId: Scalars['ID']['input'];
}>;

export type ToolcallsStatsByFunctionForFlowQuery = {
    toolcallsStatsByFunctionForFlow: Array<FunctionToolcallsStatsFragmentFragment>;
};

export type FlowsStatsTotalQueryVariables = Exact<{ [key: string]: never }>;

export type FlowsStatsTotalQuery = { flowsStatsTotal: FlowsStatsFragmentFragment };

export type FlowsStatsByPeriodQueryVariables = Exact<{
    period: UsageStatsPeriod;
}>;

export type FlowsStatsByPeriodQuery = { flowsStatsByPeriod: Array<DailyFlowsStatsFragmentFragment> };

export type FlowStatsByFlowQueryVariables = Exact<{
    flowId: Scalars['ID']['input'];
}>;

export type FlowStatsByFlowQuery = { flowStatsByFlow: FlowStatsFragmentFragment };

export type FlowsExecutionStatsByPeriodQueryVariables = Exact<{
    period: UsageStatsPeriod;
}>;

export type FlowsExecutionStatsByPeriodQuery = {
    flowsExecutionStatsByPeriod: Array<FlowExecutionStatsFragmentFragment>;
};

export type ApiTokensQueryVariables = Exact<{ [key: string]: never }>;

export type ApiTokensQuery = { apiTokens: Array<ApiTokenFragmentFragment> };

export type ApiTokenQueryVariables = Exact<{
    tokenId: Scalars['String']['input'];
}>;

export type ApiTokenQuery = { apiToken?: ApiTokenFragmentFragment | null };

export type UserPreferencesFragmentFragment = { id: string; favoriteFlows: Array<string> };

export type SettingsUserQueryVariables = Exact<{ [key: string]: never }>;

export type SettingsUserQuery = { settingsUser: UserPreferencesFragmentFragment };

export type UpdateFindingCvssMutationVariables = Exact<{
    taskId?: InputMaybe<Scalars['ID']['input']>;
    assistantId?: InputMaybe<Scalars['ID']['input']>;
    index: Scalars['Int']['input'];
    expectedTitle: Scalars['String']['input'];
    cvss: Scalars['Float']['input'];
}>;

export type UpdateFindingCvssMutation = { updateFindingCvss: ResultType };

export type UpdateFindingSeverityMutationVariables = Exact<{
    taskId?: InputMaybe<Scalars['ID']['input']>;
    assistantId?: InputMaybe<Scalars['ID']['input']>;
    index: Scalars['Int']['input'];
    expectedTitle: Scalars['String']['input'];
    severity: Severity;
}>;

export type UpdateFindingSeverityMutation = { updateFindingSeverity: ResultType };

export type AddFavoriteFlowMutationVariables = Exact<{
    flowId: Scalars['ID']['input'];
}>;

export type AddFavoriteFlowMutation = { addFavoriteFlow: ResultType };

export type DeleteFavoriteFlowMutationVariables = Exact<{
    flowId: Scalars['ID']['input'];
}>;

export type DeleteFavoriteFlowMutation = { deleteFavoriteFlow: ResultType };

export type FlowTemplatesQueryVariables = Exact<{ [key: string]: never }>;

export type FlowTemplatesQuery = { flowTemplates: Array<FlowTemplateFragmentFragment> };

export type FlowTemplateQueryVariables = Exact<{
    templateId: Scalars['ID']['input'];
}>;

export type FlowTemplateQuery = { flowTemplate?: FlowTemplateFragmentFragment | null };

export type FlowTemplatesByTargetTypeQueryVariables = Exact<{
    targetType: TargetType;
}>;

export type FlowTemplatesByTargetTypeQuery = { flowTemplatesByTargetType: Array<FlowTemplateFragmentFragment> };

export type CreateFlowTemplateMutationVariables = Exact<{
    input: CreateFlowTemplateInput;
}>;

export type CreateFlowTemplateMutation = { createFlowTemplate: FlowTemplateFragmentFragment };

export type UpdateFlowTemplateMutationVariables = Exact<{
    templateId: Scalars['ID']['input'];
    input: UpdateFlowTemplateInput;
}>;

export type UpdateFlowTemplateMutation = { updateFlowTemplate: FlowTemplateFragmentFragment };

export type UpdateFlowTemplateTargetTypesMutationVariables = Exact<{
    templateId: Scalars['ID']['input'];
    targetTypes: Array<TargetType> | TargetType;
}>;

export type UpdateFlowTemplateTargetTypesMutation = { updateFlowTemplateTargetTypes: FlowTemplateFragmentFragment };

export type DeleteFlowTemplateMutationVariables = Exact<{
    templateId: Scalars['ID']['input'];
}>;

export type DeleteFlowTemplateMutation = { deleteFlowTemplate: ResultType };

export type FlowTemplateRequestsQueryVariables = Exact<{ [key: string]: never }>;

export type FlowTemplateRequestsQuery = { flowTemplateRequests: Array<FlowTemplateRequestFragmentFragment> };

export type FlowTemplateRequestQueryVariables = Exact<{
    requestId: Scalars['ID']['input'];
}>;

export type FlowTemplateRequestQuery = { flowTemplateRequest?: FlowTemplateRequestFragmentFragment | null };

export type SubmitFlowTemplateRequestMutationVariables = Exact<{
    templateId?: InputMaybe<Scalars['ID']['input']>;
    input: FlowTemplateRequestInput;
}>;

export type SubmitFlowTemplateRequestMutation = { submitFlowTemplateRequest: FlowTemplateRequestFragmentFragment };

export type UpdateFlowTemplateRequestMutationVariables = Exact<{
    requestId: Scalars['ID']['input'];
    revision: Scalars['Int']['input'];
    input: FlowTemplateRequestInput;
}>;

export type UpdateFlowTemplateRequestMutation = { updateFlowTemplateRequest: FlowTemplateRequestFragmentFragment };

export type WithdrawFlowTemplateRequestMutationVariables = Exact<{
    requestId: Scalars['ID']['input'];
}>;

export type WithdrawFlowTemplateRequestMutation = { withdrawFlowTemplateRequest: FlowTemplateRequestFragmentFragment };

export type ApproveFlowTemplateRequestMutationVariables = Exact<{
    requestId: Scalars['ID']['input'];
    revision: Scalars['Int']['input'];
    templateVersion?: InputMaybe<Scalars['Int']['input']>;
    note?: InputMaybe<Scalars['String']['input']>;
}>;

export type ApproveFlowTemplateRequestMutation = { approveFlowTemplateRequest: FlowTemplateRequestFragmentFragment };

export type RejectFlowTemplateRequestMutationVariables = Exact<{
    requestId: Scalars['ID']['input'];
    revision: Scalars['Int']['input'];
    note: Scalars['String']['input'];
}>;

export type RejectFlowTemplateRequestMutation = { rejectFlowTemplateRequest: FlowTemplateRequestFragmentFragment };

export type CreateFlowMutationVariables = Exact<{
    modelProvider?: InputMaybe<Scalars['String']['input']>;
    input: Scalars['String']['input'];
}>;

export type CreateFlowMutation = { createFlow: FlowFragmentFragment };

export type DeleteFlowMutationVariables = Exact<{
    flowId: Scalars['ID']['input'];
}>;

export type DeleteFlowMutation = { deleteFlow: ResultType };

export type PutUserInputMutationVariables = Exact<{
    flowId: Scalars['ID']['input'];
    input: Scalars['String']['input'];
    modelProvider?: InputMaybe<Scalars['String']['input']>;
}>;

export type PutUserInputMutation = { putUserInput: ResultType };

export type FinishFlowMutationVariables = Exact<{
    flowId: Scalars['ID']['input'];
}>;

export type FinishFlowMutation = { finishFlow: ResultType };

export type StopFlowMutationVariables = Exact<{
    flowId: Scalars['ID']['input'];
}>;

export type StopFlowMutation = { stopFlow: ResultType };

export type RenameFlowMutationVariables = Exact<{
    flowId: Scalars['ID']['input'];
    title: Scalars['String']['input'];
}>;

export type RenameFlowMutation = { renameFlow: ResultType };

export type CreateAssistantMutationVariables = Exact<{
    flowId: Scalars['ID']['input'];
    modelProvider?: InputMaybe<Scalars['String']['input']>;
    input: Scalars['String']['input'];
    useAgents: Scalars['Boolean']['input'];
}>;

export type CreateAssistantMutation = {
    createAssistant: { flow: FlowFragmentFragment; assistant: AssistantFragmentFragment };
};

export type CallAssistantMutationVariables = Exact<{
    flowId: Scalars['ID']['input'];
    assistantId: Scalars['ID']['input'];
    input: Scalars['String']['input'];
    useAgents: Scalars['Boolean']['input'];
}>;

export type CallAssistantMutation = { callAssistant: ResultType };

export type StopAssistantMutationVariables = Exact<{
    flowId: Scalars['ID']['input'];
    assistantId: Scalars['ID']['input'];
}>;

export type StopAssistantMutation = { stopAssistant: AssistantFragmentFragment };

export type DeleteAssistantMutationVariables = Exact<{
    flowId: Scalars['ID']['input'];
    assistantId: Scalars['ID']['input'];
}>;

export type DeleteAssistantMutation = { deleteAssistant: ResultType };

export type TestAgentMutationVariables = Exact<{
    type: ProviderType;
    agentType: AgentConfigType;
    agent: AgentConfigInput;
}>;

export type TestAgentMutation = { testAgent: AgentTestResultFragmentFragment };

export type TestProviderMutationVariables = Exact<{
    type: ProviderType;
    agents: AgentsConfigInput;
}>;

export type TestProviderMutation = { testProvider: ProviderTestResultFragmentFragment };

export type CreateProviderMutationVariables = Exact<{
    name: Scalars['String']['input'];
    type: ProviderType;
    agents: AgentsConfigInput;
}>;

export type CreateProviderMutation = { createProvider: ProviderConfigFragmentFragment };

export type UpdateProviderMutationVariables = Exact<{
    providerId: Scalars['ID']['input'];
    name: Scalars['String']['input'];
    agents: AgentsConfigInput;
}>;

export type UpdateProviderMutation = { updateProvider: ProviderConfigFragmentFragment };

export type DeleteProviderMutationVariables = Exact<{
    providerId: Scalars['ID']['input'];
}>;

export type DeleteProviderMutation = { deleteProvider: ResultType };

export type SetDefaultProviderMutationVariables = Exact<{
    providerId: Scalars['ID']['input'];
}>;

export type SetDefaultProviderMutation = { setDefaultProvider: ProviderConfigFragmentFragment };

export type ValidatePromptMutationVariables = Exact<{
    type: PromptType;
    template: Scalars['String']['input'];
}>;

export type ValidatePromptMutation = { validatePrompt: PromptValidationResultFragmentFragment };

export type CreatePromptMutationVariables = Exact<{
    type: PromptType;
    template: Scalars['String']['input'];
}>;

export type CreatePromptMutation = { createPrompt: UserPromptFragmentFragment };

export type UpdatePromptMutationVariables = Exact<{
    promptId: Scalars['ID']['input'];
    template: Scalars['String']['input'];
}>;

export type UpdatePromptMutation = { updatePrompt: UserPromptFragmentFragment };

export type DeletePromptMutationVariables = Exact<{
    promptId: Scalars['ID']['input'];
}>;

export type DeletePromptMutation = { deletePrompt: ResultType };

export type CreateApiTokenMutationVariables = Exact<{
    input: CreateApiTokenInput;
}>;

export type CreateApiTokenMutation = { createAPIToken: ApiTokenWithSecretFragmentFragment };

export type UpdateApiTokenMutationVariables = Exact<{
    tokenId: Scalars['String']['input'];
    input: UpdateApiTokenInput;
}>;

export type UpdateApiTokenMutation = { updateAPIToken: ApiTokenFragmentFragment };

export type DeleteApiTokenMutationVariables = Exact<{
    tokenId: Scalars['String']['input'];
}>;

export type DeleteApiTokenMutation = { deleteAPIToken: boolean };

export type TerminalLogAddedSubscriptionVariables = Exact<{
    flowId: Scalars['ID']['input'];
}>;

export type TerminalLogAddedSubscription = { terminalLogAdded: TerminalLogFragmentFragment };

export type MessageLogAddedSubscriptionVariables = Exact<{
    flowId: Scalars['ID']['input'];
}>;

export type MessageLogAddedSubscription = { messageLogAdded: MessageLogFragmentFragment };

export type MessageLogUpdatedSubscriptionVariables = Exact<{
    flowId: Scalars['ID']['input'];
}>;

export type MessageLogUpdatedSubscription = { messageLogUpdated: MessageLogFragmentFragment };

export type ScreenshotAddedSubscriptionVariables = Exact<{
    flowId: Scalars['ID']['input'];
}>;

export type ScreenshotAddedSubscription = { screenshotAdded: ScreenshotFragmentFragment };

export type AgentLogAddedSubscriptionVariables = Exact<{
    flowId: Scalars['ID']['input'];
}>;

export type AgentLogAddedSubscription = { agentLogAdded: AgentLogFragmentFragment };

export type SearchLogAddedSubscriptionVariables = Exact<{
    flowId: Scalars['ID']['input'];
}>;

export type SearchLogAddedSubscription = { searchLogAdded: SearchLogFragmentFragment };

export type VectorStoreLogAddedSubscriptionVariables = Exact<{
    flowId: Scalars['ID']['input'];
}>;

export type VectorStoreLogAddedSubscription = { vectorStoreLogAdded: VectorStoreLogFragmentFragment };

export type AssistantCreatedSubscriptionVariables = Exact<{
    flowId: Scalars['ID']['input'];
}>;

export type AssistantCreatedSubscription = { assistantCreated: AssistantFragmentFragment };

export type AssistantUpdatedSubscriptionVariables = Exact<{
    flowId: Scalars['ID']['input'];
}>;

export type AssistantUpdatedSubscription = { assistantUpdated: AssistantFragmentFragment };

export type AssistantDeletedSubscriptionVariables = Exact<{
    flowId: Scalars['ID']['input'];
}>;

export type AssistantDeletedSubscription = { assistantDeleted: AssistantFragmentFragment };

export type AssistantLogAddedSubscriptionVariables = Exact<{
    flowId: Scalars['ID']['input'];
}>;

export type AssistantLogAddedSubscription = { assistantLogAdded: AssistantLogFragmentFragment };

export type AssistantLogUpdatedSubscriptionVariables = Exact<{
    flowId: Scalars['ID']['input'];
}>;

export type AssistantLogUpdatedSubscription = { assistantLogUpdated: AssistantLogFragmentFragment };

export type FlowCreatedSubscriptionVariables = Exact<{ [key: string]: never }>;

export type FlowCreatedSubscription = { flowCreated: FlowFragmentFragment };

export type FlowDeletedSubscriptionVariables = Exact<{ [key: string]: never }>;

export type FlowDeletedSubscription = { flowDeleted: FlowFragmentFragment };

export type FlowUpdatedSubscriptionVariables = Exact<{ [key: string]: never }>;

export type FlowUpdatedSubscription = { flowUpdated: FlowFragmentFragment };

export type TaskCreatedSubscriptionVariables = Exact<{
    flowId: Scalars['ID']['input'];
}>;

export type TaskCreatedSubscription = { taskCreated: TaskFragmentFragment };

export type TaskUpdatedSubscriptionVariables = Exact<{
    flowId: Scalars['ID']['input'];
}>;

export type TaskUpdatedSubscription = {
    taskUpdated: {
        id: string;
        status: StatusType;
        result: string;
        updatedAt: any;
        subtasks?: Array<SubtaskFragmentFragment> | null;
    };
};

export type ProviderCreatedSubscriptionVariables = Exact<{ [key: string]: never }>;

export type ProviderCreatedSubscription = { providerCreated: ProviderConfigFragmentFragment };

export type ProviderUpdatedSubscriptionVariables = Exact<{ [key: string]: never }>;

export type ProviderUpdatedSubscription = { providerUpdated: ProviderConfigFragmentFragment };

export type ProviderDeletedSubscriptionVariables = Exact<{ [key: string]: never }>;

export type ProviderDeletedSubscription = { providerDeleted: ProviderConfigFragmentFragment };

export type ApiTokenCreatedSubscriptionVariables = Exact<{ [key: string]: never }>;

export type ApiTokenCreatedSubscription = { apiTokenCreated: ApiTokenFragmentFragment };

export type ApiTokenUpdatedSubscriptionVariables = Exact<{ [key: string]: never }>;

export type ApiTokenUpdatedSubscription = { apiTokenUpdated: ApiTokenFragmentFragment };

export type ApiTokenDeletedSubscriptionVariables = Exact<{ [key: string]: never }>;

export type ApiTokenDeletedSubscription = { apiTokenDeleted: ApiTokenFragmentFragment };

export type SettingsUserUpdatedSubscriptionVariables = Exact<{ [key: string]: never }>;

export type SettingsUserUpdatedSubscription = { settingsUserUpdated: UserPreferencesFragmentFragment };

export type FlowTemplateCreatedSubscriptionVariables = Exact<{ [key: string]: never }>;

export type FlowTemplateCreatedSubscription = { flowTemplateCreated: FlowTemplateFragmentFragment };

export type FlowTemplateUpdatedSubscriptionVariables = Exact<{ [key: string]: never }>;

export type FlowTemplateUpdatedSubscription = { flowTemplateUpdated: FlowTemplateFragmentFragment };

export type FlowTemplateDeletedSubscriptionVariables = Exact<{ [key: string]: never }>;

export type FlowTemplateDeletedSubscription = { flowTemplateDeleted: FlowTemplateFragmentFragment };

export type FlowTemplateRequestCreatedSubscriptionVariables = Exact<{ [key: string]: never }>;

export type FlowTemplateRequestCreatedSubscription = {
    flowTemplateRequestCreated: FlowTemplateRequestFragmentFragment;
};

export type FlowTemplateRequestUpdatedSubscriptionVariables = Exact<{ [key: string]: never }>;

export type FlowTemplateRequestUpdatedSubscription = {
    flowTemplateRequestUpdated: FlowTemplateRequestFragmentFragment;
};

export type DomainFragmentFragment = {
    id: string;
    name: string;
    targetType: TargetType;
    status: DomainStatusType;
    scope?: ScanScope | null;
    box?: ScanBox | null;
    detectionMetadata: string;
    createdAt: any;
    updatedAt: any;
    flows: Array<FlowFragmentFragment>;
};

export type DomainsQueryVariables = Exact<{ [key: string]: never }>;

export type DomainsQuery = { domains: Array<DomainFragmentFragment> };

export type DomainQueryVariables = Exact<{
    id: Scalars['ID']['input'];
}>;

export type DomainQuery = {
    domain?:
        | ({
              flows: Array<{ findings: Array<{ severity: Severity }> } & FlowFragmentFragment>;
          } & DomainFragmentFragment)
        | null;
};

export type QuotaUsageQueryVariables = Exact<{ [key: string]: never }>;

export type QuotaUsageQuery = {
    quotaUsage: {
        flowsCurrent: number;
        flowsMax: number;
        domainsCurrent: number;
        domainsMax: number;
        flowsPerDomainMax: number;
    };
};

export type CreateDomainMutationVariables = Exact<{
    input: CreateDomainInput;
}>;

export type CreateDomainMutation = { createDomain: DomainFragmentFragment };

export type CheckTargetQueryVariables = Exact<{
    target: Scalars['String']['input'];
}>;

export type CheckTargetQuery = {
    checkTarget: {
        input: string;
        ok: boolean;
        kind: TargetKind;
        outcome: TargetOutcome;
        message: string;
        host: string;
        port: number;
        service: string;
        cloudProvider: string;
        cloudAccountId: string;
        httpStatus: number;
        steps: Array<{ name: string; status: TargetCheckStatus; detail: string }>;
    };
};

export type CreateScanMutationVariables = Exact<{
    input: CreateScanInput;
}>;

export type CreateScanMutation = { createScan: DomainFragmentFragment };

export type DeleteDomainMutationVariables = Exact<{
    id: Scalars['ID']['input'];
}>;

export type DeleteDomainMutation = { deleteDomain: ResultType };

export type DomainCreatedSubscriptionVariables = Exact<{ [key: string]: never }>;

export type DomainCreatedSubscription = { domainCreated: DomainFragmentFragment };

export type DomainUpdatedSubscriptionVariables = Exact<{ [key: string]: never }>;

export type DomainUpdatedSubscription = { domainUpdated: DomainFragmentFragment };

export type DomainDeletedSubscriptionVariables = Exact<{ [key: string]: never }>;

export type DomainDeletedSubscription = { domainDeleted: DomainFragmentFragment };

export type ChatSessionFragmentFragment = {
    id: string;
    title: string;
    providerName: string;
    createdAt: any;
    updatedAt: any;
};

export type ChatMessageFragmentFragment = {
    id: string;
    sessionId: string;
    role: ChatMessageRole;
    status: ChatMessageStatus;
    content: string;
    providerName: string;
    model: string;
    createdAt: any;
    updatedAt: any;
};

export type ChatQuotaFragmentFragment = {
    messagesUsed: number;
    messagesLimit: number;
    messagesResetAt?: any | null;
    tokensUsed: number;
    tokensLimit: number;
    tokensResetAt?: any | null;
    maxInputChars: number;
};

export type ChatSessionsQueryVariables = Exact<{ [key: string]: never }>;

export type ChatSessionsQuery = { chatSessions: Array<ChatSessionFragmentFragment> };

export type ChatSessionQueryVariables = Exact<{
    sessionId: Scalars['ID']['input'];
}>;

export type ChatSessionQuery = { chatSession?: ChatSessionFragmentFragment | null };

export type ChatMessagesQueryVariables = Exact<{
    sessionId: Scalars['ID']['input'];
}>;

export type ChatMessagesQuery = { chatMessages: Array<ChatMessageFragmentFragment> };

export type ChatQuotaQueryVariables = Exact<{ [key: string]: never }>;

export type ChatQuotaQuery = { chatQuota: ChatQuotaFragmentFragment };

export type SendChatMessageMutationVariables = Exact<{
    sessionId?: InputMaybe<Scalars['ID']['input']>;
    providerName?: InputMaybe<Scalars['String']['input']>;
    content: Scalars['String']['input'];
}>;

export type SendChatMessageMutation = {
    sendChatMessage: {
        session: ChatSessionFragmentFragment;
        userMessage: ChatMessageFragmentFragment;
        assistantMessage: ChatMessageFragmentFragment;
    };
};

export type StopChatMessageMutationVariables = Exact<{
    messageId: Scalars['ID']['input'];
}>;

export type StopChatMessageMutation = { stopChatMessage: ChatMessageFragmentFragment };

export type RenameChatSessionMutationVariables = Exact<{
    sessionId: Scalars['ID']['input'];
    title: Scalars['String']['input'];
}>;

export type RenameChatSessionMutation = { renameChatSession: ChatSessionFragmentFragment };

export type DeleteChatSessionMutationVariables = Exact<{
    sessionId: Scalars['ID']['input'];
}>;

export type DeleteChatSessionMutation = { deleteChatSession: ResultType };

export type ChatSessionCreatedSubscriptionVariables = Exact<{ [key: string]: never }>;

export type ChatSessionCreatedSubscription = { chatSessionCreated: ChatSessionFragmentFragment };

export type ChatSessionUpdatedSubscriptionVariables = Exact<{ [key: string]: never }>;

export type ChatSessionUpdatedSubscription = { chatSessionUpdated: ChatSessionFragmentFragment };

export type ChatSessionDeletedSubscriptionVariables = Exact<{ [key: string]: never }>;

export type ChatSessionDeletedSubscription = { chatSessionDeleted: ChatSessionFragmentFragment };

export type ChatMessageAddedSubscriptionVariables = Exact<{
    sessionId: Scalars['ID']['input'];
}>;

export type ChatMessageAddedSubscription = { chatMessageAdded: ChatMessageFragmentFragment };

export type ChatMessageUpdatedSubscriptionVariables = Exact<{
    sessionId: Scalars['ID']['input'];
}>;

export type ChatMessageUpdatedSubscription = { chatMessageUpdated: ChatMessageFragmentFragment };

export const SettingsFragmentFragmentDoc = gql`
    fragment settingsFragment on Settings {
        debug
        askUser
        dockerInside
        assistantUseAgents
    }
`;
export const SubtaskFragmentFragmentDoc = gql`
    fragment subtaskFragment on Subtask {
        id
        status
        title
        description
        result
        taskId
        createdAt
        updatedAt
    }
`;
export const TaskFragmentFragmentDoc = gql`
    fragment taskFragment on Task {
        id
        title
        status
        input
        result
        flowId
        subtasks {
            ...subtaskFragment
        }
        createdAt
        updatedAt
    }
    ${SubtaskFragmentFragmentDoc}
`;
export const TerminalLogFragmentFragmentDoc = gql`
    fragment terminalLogFragment on TerminalLog {
        id
        flowId
        taskId
        subtaskId
        type
        text
        terminal
        createdAt
    }
`;
export const MessageLogFragmentFragmentDoc = gql`
    fragment messageLogFragment on MessageLog {
        id
        type
        message
        thinking
        result
        resultFormat
        flowId
        taskId
        subtaskId
        createdAt
    }
`;
export const ScreenshotFragmentFragmentDoc = gql`
    fragment screenshotFragment on Screenshot {
        id
        flowId
        taskId
        subtaskId
        name
        url
        createdAt
    }
`;
export const AgentLogFragmentFragmentDoc = gql`
    fragment agentLogFragment on AgentLog {
        id
        flowId
        initiator
        executor
        task
        result
        taskId
        subtaskId
        createdAt
    }
`;
export const SearchLogFragmentFragmentDoc = gql`
    fragment searchLogFragment on SearchLog {
        id
        flowId
        initiator
        executor
        engine
        query
        result
        taskId
        subtaskId
        createdAt
    }
`;
export const VectorStoreLogFragmentFragmentDoc = gql`
    fragment vectorStoreLogFragment on VectorStoreLog {
        id
        flowId
        initiator
        executor
        filter
        query
        action
        result
        taskId
        subtaskId
        createdAt
    }
`;
export const ProviderFragmentFragmentDoc = gql`
    fragment providerFragment on Provider {
        name
        type
        isDefault
    }
`;
export const FindingFragmentFragmentDoc = gql`
    fragment findingFragment on Finding {
        taskId
        index
        title
        severity
        severityUpdated
        originalSeverity
        originalCvss
        cvss
        cve
        affectedUrls
        description
        evidence
        impact
        stepsToReproduce
        recommendation
        references
    }
`;
export const AssistantFragmentFragmentDoc = gql`
    fragment assistantFragment on Assistant {
        id
        title
        status
        provider {
            ...providerFragment
        }
        flowId
        useAgents
        createdAt
        updatedAt
        findings {
            ...findingFragment
        }
    }
    ${ProviderFragmentFragmentDoc}
    ${FindingFragmentFragmentDoc}
`;
export const AssistantLogFragmentFragmentDoc = gql`
    fragment assistantLogFragment on AssistantLog {
        id
        type
        message
        thinking
        result
        resultFormat
        appendPart
        flowId
        assistantId
        createdAt
    }
`;
export const TestResultFragmentFragmentDoc = gql`
    fragment testResultFragment on TestResult {
        name
        type
        result
        reasoning
        streaming
        latency
        error
    }
`;
export const AgentTestResultFragmentFragmentDoc = gql`
    fragment agentTestResultFragment on AgentTestResult {
        tests {
            ...testResultFragment
        }
    }
    ${TestResultFragmentFragmentDoc}
`;
export const ProviderTestResultFragmentFragmentDoc = gql`
    fragment providerTestResultFragment on ProviderTestResult {
        simple {
            ...agentTestResultFragment
        }
        simpleJson {
            ...agentTestResultFragment
        }
        primaryAgent {
            ...agentTestResultFragment
        }
        assistant {
            ...agentTestResultFragment
        }
        generator {
            ...agentTestResultFragment
        }
        refiner {
            ...agentTestResultFragment
        }
        adviser {
            ...agentTestResultFragment
        }
        reflector {
            ...agentTestResultFragment
        }
        searcher {
            ...agentTestResultFragment
        }
        enricher {
            ...agentTestResultFragment
        }
        coder {
            ...agentTestResultFragment
        }
        installer {
            ...agentTestResultFragment
        }
        pentester {
            ...agentTestResultFragment
        }
    }
    ${AgentTestResultFragmentFragmentDoc}
`;
export const ModelConfigFragmentFragmentDoc = gql`
    fragment modelConfigFragment on ModelConfig {
        name
        price {
            input
            output
            cacheRead
            cacheWrite
        }
    }
`;
export const AgentConfigFragmentFragmentDoc = gql`
    fragment agentConfigFragment on AgentConfig {
        model
        maxTokens
        temperature
        topK
        topP
        minLength
        maxLength
        repetitionPenalty
        frequencyPenalty
        presencePenalty
        reasoning {
            effort
            maxTokens
        }
        price {
            input
            output
            cacheRead
            cacheWrite
        }
    }
`;
export const AgentsConfigFragmentFragmentDoc = gql`
    fragment agentsConfigFragment on AgentsConfig {
        simple {
            ...agentConfigFragment
        }
        simpleJson {
            ...agentConfigFragment
        }
        primaryAgent {
            ...agentConfigFragment
        }
        assistant {
            ...agentConfigFragment
        }
        generator {
            ...agentConfigFragment
        }
        refiner {
            ...agentConfigFragment
        }
        adviser {
            ...agentConfigFragment
        }
        reflector {
            ...agentConfigFragment
        }
        searcher {
            ...agentConfigFragment
        }
        enricher {
            ...agentConfigFragment
        }
        coder {
            ...agentConfigFragment
        }
        installer {
            ...agentConfigFragment
        }
        pentester {
            ...agentConfigFragment
        }
    }
    ${AgentConfigFragmentFragmentDoc}
`;
export const ProviderConfigFragmentFragmentDoc = gql`
    fragment providerConfigFragment on ProviderConfig {
        id
        name
        type
        agents {
            ...agentsConfigFragment
        }
        isDefault
        createdAt
        updatedAt
    }
    ${AgentsConfigFragmentFragmentDoc}
`;
export const UserPromptFragmentFragmentDoc = gql`
    fragment userPromptFragment on UserPrompt {
        id
        type
        template
        createdAt
        updatedAt
    }
`;
export const DefaultPromptFragmentFragmentDoc = gql`
    fragment defaultPromptFragment on DefaultPrompt {
        type
        template
        variables
    }
`;
export const PromptValidationResultFragmentFragmentDoc = gql`
    fragment promptValidationResultFragment on PromptValidationResult {
        result
        errorType
        message
        line
        details
    }
`;
export const ApiTokenFragmentFragmentDoc = gql`
    fragment apiTokenFragment on APIToken {
        id
        tokenId
        userId
        roleId
        name
        ttl
        status
        createdAt
        updatedAt
    }
`;
export const ApiTokenWithSecretFragmentFragmentDoc = gql`
    fragment apiTokenWithSecretFragment on APITokenWithSecret {
        id
        tokenId
        userId
        roleId
        name
        ttl
        status
        createdAt
        updatedAt
        token
    }
`;
export const FlowTemplateFragmentFragmentDoc = gql`
    fragment flowTemplateFragment on FlowTemplate {
        id
        userId
        title
        text
        targetTypes
        systemOwned
        version
        createdAt
        updatedAt
    }
`;
export const FlowTemplateRequestFragmentFragmentDoc = gql`
    fragment flowTemplateRequestFragment on FlowTemplateRequest {
        id
        kind
        status
        templateId
        requesterId
        requesterName
        title
        text
        targetTypes
        revision
        baseVersion
        reviewNote
        reviewedBy
        reviewerName
        reviewedAt
        createdAt
        updatedAt
    }
`;
export const UsageStatsFragmentFragmentDoc = gql`
    fragment usageStatsFragment on UsageStats {
        totalUsageIn
        totalUsageOut
        totalUsageCacheIn
        totalUsageCacheOut
        totalUsageCostIn
        totalUsageCostOut
    }
`;
export const DailyUsageStatsFragmentFragmentDoc = gql`
    fragment dailyUsageStatsFragment on DailyUsageStats {
        date
        stats {
            ...usageStatsFragment
        }
    }
    ${UsageStatsFragmentFragmentDoc}
`;
export const ProviderUsageStatsFragmentFragmentDoc = gql`
    fragment providerUsageStatsFragment on ProviderUsageStats {
        provider
        stats {
            ...usageStatsFragment
        }
    }
    ${UsageStatsFragmentFragmentDoc}
`;
export const ModelUsageStatsFragmentFragmentDoc = gql`
    fragment modelUsageStatsFragment on ModelUsageStats {
        model
        provider
        stats {
            ...usageStatsFragment
        }
    }
    ${UsageStatsFragmentFragmentDoc}
`;
export const AgentTypeUsageStatsFragmentFragmentDoc = gql`
    fragment agentTypeUsageStatsFragment on AgentTypeUsageStats {
        agentType
        stats {
            ...usageStatsFragment
        }
    }
    ${UsageStatsFragmentFragmentDoc}
`;
export const ToolcallsStatsFragmentFragmentDoc = gql`
    fragment toolcallsStatsFragment on ToolcallsStats {
        totalCount
        totalDurationSeconds
    }
`;
export const DailyToolcallsStatsFragmentFragmentDoc = gql`
    fragment dailyToolcallsStatsFragment on DailyToolcallsStats {
        date
        stats {
            ...toolcallsStatsFragment
        }
    }
    ${ToolcallsStatsFragmentFragmentDoc}
`;
export const FunctionToolcallsStatsFragmentFragmentDoc = gql`
    fragment functionToolcallsStatsFragment on FunctionToolcallsStats {
        functionName
        isAgent
        totalCount
        totalDurationSeconds
        avgDurationSeconds
    }
`;
export const FlowStatsFragmentFragmentDoc = gql`
    fragment flowStatsFragment on FlowStats {
        totalTasksCount
        totalSubtasksCount
        totalAssistantsCount
    }
`;
export const FlowsStatsFragmentFragmentDoc = gql`
    fragment flowsStatsFragment on FlowsStats {
        totalFlowsCount
        totalTasksCount
        totalSubtasksCount
        totalAssistantsCount
    }
`;
export const DailyFlowsStatsFragmentFragmentDoc = gql`
    fragment dailyFlowsStatsFragment on DailyFlowsStats {
        date
        stats {
            ...flowsStatsFragment
        }
    }
    ${FlowsStatsFragmentFragmentDoc}
`;
export const SubtaskExecutionStatsFragmentFragmentDoc = gql`
    fragment subtaskExecutionStatsFragment on SubtaskExecutionStats {
        subtaskId
        subtaskTitle
        totalDurationSeconds
        totalToolcallsCount
    }
`;
export const TaskExecutionStatsFragmentFragmentDoc = gql`
    fragment taskExecutionStatsFragment on TaskExecutionStats {
        taskId
        taskTitle
        totalDurationSeconds
        totalToolcallsCount
        subtasks {
            ...subtaskExecutionStatsFragment
        }
    }
    ${SubtaskExecutionStatsFragmentFragmentDoc}
`;
export const FlowExecutionStatsFragmentFragmentDoc = gql`
    fragment flowExecutionStatsFragment on FlowExecutionStats {
        flowId
        flowTitle
        totalDurationSeconds
        totalToolcallsCount
        totalAssistantsCount
        tasks {
            ...taskExecutionStatsFragment
        }
    }
    ${TaskExecutionStatsFragmentFragmentDoc}
`;
export const UserPreferencesFragmentFragmentDoc = gql`
    fragment userPreferencesFragment on UserPreferences {
        id
        favoriteFlows
    }
`;
export const TerminalFragmentFragmentDoc = gql`
    fragment terminalFragment on Terminal {
        id
        type
        name
        image
        connected
        createdAt
    }
`;
export const FlowFragmentFragmentDoc = gql`
    fragment flowFragment on Flow {
        id
        title
        status
        terminals {
            ...terminalFragment
        }
        provider {
            ...providerFragment
        }
        createdAt
        updatedAt
    }
    ${TerminalFragmentFragmentDoc}
    ${ProviderFragmentFragmentDoc}
`;
export const DomainFragmentFragmentDoc = gql`
    fragment domainFragment on Domain {
        id
        name
        targetType
        status
        scope
        box
        detectionMetadata
        createdAt
        updatedAt
        flows {
            ...flowFragment
        }
    }
    ${FlowFragmentFragmentDoc}
`;
export const ChatSessionFragmentFragmentDoc = gql`
    fragment chatSessionFragment on ChatSession {
        id
        title
        providerName
        createdAt
        updatedAt
    }
`;
export const ChatMessageFragmentFragmentDoc = gql`
    fragment chatMessageFragment on ChatMessage {
        id
        sessionId
        role
        status
        content
        providerName
        model
        createdAt
        updatedAt
    }
`;
export const ChatQuotaFragmentFragmentDoc = gql`
    fragment chatQuotaFragment on ChatQuota {
        messagesUsed
        messagesLimit
        messagesResetAt
        tokensUsed
        tokensLimit
        tokensResetAt
        maxInputChars
    }
`;
export const FlowsDocument = gql`
    query flows {
        flows {
            ...flowFragment
            findings {
                severity
            }
        }
    }
    ${FlowFragmentFragmentDoc}
`;

/**
 * __useFlowsQuery__
 *
 * To run a query within a React component, call `useFlowsQuery` and pass it any options that fit your needs.
 * When your component renders, `useFlowsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFlowsQuery({
 *   variables: {
 *   },
 * });
 */
export function useFlowsQuery(baseOptions?: Apollo.QueryHookOptions<FlowsQuery, FlowsQueryVariables>) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<FlowsQuery, FlowsQueryVariables>(FlowsDocument, options);
}
export function useFlowsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<FlowsQuery, FlowsQueryVariables>) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<FlowsQuery, FlowsQueryVariables>(FlowsDocument, options);
}
// @ts-ignore
export function useFlowsSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<FlowsQuery, FlowsQueryVariables>,
): Apollo.UseSuspenseQueryResult<FlowsQuery, FlowsQueryVariables>;
export function useFlowsSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<FlowsQuery, FlowsQueryVariables>,
): Apollo.UseSuspenseQueryResult<FlowsQuery | undefined, FlowsQueryVariables>;
export function useFlowsSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<FlowsQuery, FlowsQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<FlowsQuery, FlowsQueryVariables>(FlowsDocument, options);
}
export type FlowsQueryHookResult = ReturnType<typeof useFlowsQuery>;
export type FlowsLazyQueryHookResult = ReturnType<typeof useFlowsLazyQuery>;
export type FlowsSuspenseQueryHookResult = ReturnType<typeof useFlowsSuspenseQuery>;
export type FlowsQueryResult = Apollo.QueryResult<FlowsQuery, FlowsQueryVariables>;
export const ProvidersDocument = gql`
    query providers {
        providers {
            ...providerFragment
        }
    }
    ${ProviderFragmentFragmentDoc}
`;

/**
 * __useProvidersQuery__
 *
 * To run a query within a React component, call `useProvidersQuery` and pass it any options that fit your needs.
 * When your component renders, `useProvidersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProvidersQuery({
 *   variables: {
 *   },
 * });
 */
export function useProvidersQuery(baseOptions?: Apollo.QueryHookOptions<ProvidersQuery, ProvidersQueryVariables>) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<ProvidersQuery, ProvidersQueryVariables>(ProvidersDocument, options);
}
export function useProvidersLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<ProvidersQuery, ProvidersQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<ProvidersQuery, ProvidersQueryVariables>(ProvidersDocument, options);
}
// @ts-ignore
export function useProvidersSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<ProvidersQuery, ProvidersQueryVariables>,
): Apollo.UseSuspenseQueryResult<ProvidersQuery, ProvidersQueryVariables>;
export function useProvidersSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ProvidersQuery, ProvidersQueryVariables>,
): Apollo.UseSuspenseQueryResult<ProvidersQuery | undefined, ProvidersQueryVariables>;
export function useProvidersSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ProvidersQuery, ProvidersQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<ProvidersQuery, ProvidersQueryVariables>(ProvidersDocument, options);
}
export type ProvidersQueryHookResult = ReturnType<typeof useProvidersQuery>;
export type ProvidersLazyQueryHookResult = ReturnType<typeof useProvidersLazyQuery>;
export type ProvidersSuspenseQueryHookResult = ReturnType<typeof useProvidersSuspenseQuery>;
export type ProvidersQueryResult = Apollo.QueryResult<ProvidersQuery, ProvidersQueryVariables>;
export const SettingsDocument = gql`
    query settings {
        settings {
            ...settingsFragment
        }
    }
    ${SettingsFragmentFragmentDoc}
`;

/**
 * __useSettingsQuery__
 *
 * To run a query within a React component, call `useSettingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSettingsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSettingsQuery({
 *   variables: {
 *   },
 * });
 */
export function useSettingsQuery(baseOptions?: Apollo.QueryHookOptions<SettingsQuery, SettingsQueryVariables>) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<SettingsQuery, SettingsQueryVariables>(SettingsDocument, options);
}
export function useSettingsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SettingsQuery, SettingsQueryVariables>) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<SettingsQuery, SettingsQueryVariables>(SettingsDocument, options);
}
// @ts-ignore
export function useSettingsSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<SettingsQuery, SettingsQueryVariables>,
): Apollo.UseSuspenseQueryResult<SettingsQuery, SettingsQueryVariables>;
export function useSettingsSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SettingsQuery, SettingsQueryVariables>,
): Apollo.UseSuspenseQueryResult<SettingsQuery | undefined, SettingsQueryVariables>;
export function useSettingsSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SettingsQuery, SettingsQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<SettingsQuery, SettingsQueryVariables>(SettingsDocument, options);
}
export type SettingsQueryHookResult = ReturnType<typeof useSettingsQuery>;
export type SettingsLazyQueryHookResult = ReturnType<typeof useSettingsLazyQuery>;
export type SettingsSuspenseQueryHookResult = ReturnType<typeof useSettingsSuspenseQuery>;
export type SettingsQueryResult = Apollo.QueryResult<SettingsQuery, SettingsQueryVariables>;
export const SettingsProvidersDocument = gql`
    query settingsProviders {
        settingsProviders {
            enabled {
                openai
                anthropic
                gemini
                bedrock
                ollama
                custom
                deepseek
                glm
                kimi
                qwen
            }
            default {
                openai {
                    ...providerConfigFragment
                }
                anthropic {
                    ...providerConfigFragment
                }
                gemini {
                    ...providerConfigFragment
                }
                bedrock {
                    ...providerConfigFragment
                }
                ollama {
                    ...providerConfigFragment
                }
                custom {
                    ...providerConfigFragment
                }
                deepseek {
                    ...providerConfigFragment
                }
                glm {
                    ...providerConfigFragment
                }
                kimi {
                    ...providerConfigFragment
                }
                qwen {
                    ...providerConfigFragment
                }
            }
            userDefined {
                ...providerConfigFragment
            }
            models {
                openai {
                    ...modelConfigFragment
                }
                anthropic {
                    ...modelConfigFragment
                }
                gemini {
                    ...modelConfigFragment
                }
                bedrock {
                    ...modelConfigFragment
                }
                ollama {
                    ...modelConfigFragment
                }
                custom {
                    ...modelConfigFragment
                }
                deepseek {
                    ...modelConfigFragment
                }
                glm {
                    ...modelConfigFragment
                }
                kimi {
                    ...modelConfigFragment
                }
                qwen {
                    ...modelConfigFragment
                }
            }
        }
    }
    ${ProviderConfigFragmentFragmentDoc}
    ${ModelConfigFragmentFragmentDoc}
`;

/**
 * __useSettingsProvidersQuery__
 *
 * To run a query within a React component, call `useSettingsProvidersQuery` and pass it any options that fit your needs.
 * When your component renders, `useSettingsProvidersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSettingsProvidersQuery({
 *   variables: {
 *   },
 * });
 */
export function useSettingsProvidersQuery(
    baseOptions?: Apollo.QueryHookOptions<SettingsProvidersQuery, SettingsProvidersQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<SettingsProvidersQuery, SettingsProvidersQueryVariables>(SettingsProvidersDocument, options);
}
export function useSettingsProvidersLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<SettingsProvidersQuery, SettingsProvidersQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<SettingsProvidersQuery, SettingsProvidersQueryVariables>(
        SettingsProvidersDocument,
        options,
    );
}
// @ts-ignore
export function useSettingsProvidersSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<SettingsProvidersQuery, SettingsProvidersQueryVariables>,
): Apollo.UseSuspenseQueryResult<SettingsProvidersQuery, SettingsProvidersQueryVariables>;
export function useSettingsProvidersSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<SettingsProvidersQuery, SettingsProvidersQueryVariables>,
): Apollo.UseSuspenseQueryResult<SettingsProvidersQuery | undefined, SettingsProvidersQueryVariables>;
export function useSettingsProvidersSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<SettingsProvidersQuery, SettingsProvidersQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<SettingsProvidersQuery, SettingsProvidersQueryVariables>(
        SettingsProvidersDocument,
        options,
    );
}
export type SettingsProvidersQueryHookResult = ReturnType<typeof useSettingsProvidersQuery>;
export type SettingsProvidersLazyQueryHookResult = ReturnType<typeof useSettingsProvidersLazyQuery>;
export type SettingsProvidersSuspenseQueryHookResult = ReturnType<typeof useSettingsProvidersSuspenseQuery>;
export type SettingsProvidersQueryResult = Apollo.QueryResult<SettingsProvidersQuery, SettingsProvidersQueryVariables>;
export const SettingsPromptsDocument = gql`
    query settingsPrompts {
        settingsPrompts {
            default {
                agents {
                    primaryAgent {
                        system {
                            ...defaultPromptFragment
                        }
                    }
                    assistant {
                        system {
                            ...defaultPromptFragment
                        }
                    }
                    pentester {
                        system {
                            ...defaultPromptFragment
                        }
                        human {
                            ...defaultPromptFragment
                        }
                    }
                    coder {
                        system {
                            ...defaultPromptFragment
                        }
                        human {
                            ...defaultPromptFragment
                        }
                    }
                    installer {
                        system {
                            ...defaultPromptFragment
                        }
                        human {
                            ...defaultPromptFragment
                        }
                    }
                    searcher {
                        system {
                            ...defaultPromptFragment
                        }
                        human {
                            ...defaultPromptFragment
                        }
                    }
                    memorist {
                        system {
                            ...defaultPromptFragment
                        }
                        human {
                            ...defaultPromptFragment
                        }
                    }
                    adviser {
                        system {
                            ...defaultPromptFragment
                        }
                        human {
                            ...defaultPromptFragment
                        }
                    }
                    generator {
                        system {
                            ...defaultPromptFragment
                        }
                        human {
                            ...defaultPromptFragment
                        }
                    }
                    refiner {
                        system {
                            ...defaultPromptFragment
                        }
                        human {
                            ...defaultPromptFragment
                        }
                    }
                    reporter {
                        system {
                            ...defaultPromptFragment
                        }
                        human {
                            ...defaultPromptFragment
                        }
                    }
                    reflector {
                        system {
                            ...defaultPromptFragment
                        }
                        human {
                            ...defaultPromptFragment
                        }
                    }
                    enricher {
                        system {
                            ...defaultPromptFragment
                        }
                        human {
                            ...defaultPromptFragment
                        }
                    }
                    toolCallFixer {
                        system {
                            ...defaultPromptFragment
                        }
                        human {
                            ...defaultPromptFragment
                        }
                    }
                    summarizer {
                        system {
                            ...defaultPromptFragment
                        }
                    }
                }
                tools {
                    getFlowDescription {
                        ...defaultPromptFragment
                    }
                    getTaskDescription {
                        ...defaultPromptFragment
                    }
                    getExecutionLogs {
                        ...defaultPromptFragment
                    }
                    getFullExecutionContext {
                        ...defaultPromptFragment
                    }
                    getShortExecutionContext {
                        ...defaultPromptFragment
                    }
                    chooseDockerImage {
                        ...defaultPromptFragment
                    }
                    chooseUserLanguage {
                        ...defaultPromptFragment
                    }
                    collectToolCallId {
                        ...defaultPromptFragment
                    }
                    detectToolCallIdPattern {
                        ...defaultPromptFragment
                    }
                    monitorAgentExecution {
                        ...defaultPromptFragment
                    }
                    planAgentTask {
                        ...defaultPromptFragment
                    }
                    wrapAgentTask {
                        ...defaultPromptFragment
                    }
                }
            }
            userDefined {
                ...userPromptFragment
            }
        }
    }
    ${DefaultPromptFragmentFragmentDoc}
    ${UserPromptFragmentFragmentDoc}
`;

/**
 * __useSettingsPromptsQuery__
 *
 * To run a query within a React component, call `useSettingsPromptsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSettingsPromptsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSettingsPromptsQuery({
 *   variables: {
 *   },
 * });
 */
export function useSettingsPromptsQuery(
    baseOptions?: Apollo.QueryHookOptions<SettingsPromptsQuery, SettingsPromptsQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<SettingsPromptsQuery, SettingsPromptsQueryVariables>(SettingsPromptsDocument, options);
}
export function useSettingsPromptsLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<SettingsPromptsQuery, SettingsPromptsQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<SettingsPromptsQuery, SettingsPromptsQueryVariables>(SettingsPromptsDocument, options);
}
// @ts-ignore
export function useSettingsPromptsSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<SettingsPromptsQuery, SettingsPromptsQueryVariables>,
): Apollo.UseSuspenseQueryResult<SettingsPromptsQuery, SettingsPromptsQueryVariables>;
export function useSettingsPromptsSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<SettingsPromptsQuery, SettingsPromptsQueryVariables>,
): Apollo.UseSuspenseQueryResult<SettingsPromptsQuery | undefined, SettingsPromptsQueryVariables>;
export function useSettingsPromptsSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<SettingsPromptsQuery, SettingsPromptsQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<SettingsPromptsQuery, SettingsPromptsQueryVariables>(
        SettingsPromptsDocument,
        options,
    );
}
export type SettingsPromptsQueryHookResult = ReturnType<typeof useSettingsPromptsQuery>;
export type SettingsPromptsLazyQueryHookResult = ReturnType<typeof useSettingsPromptsLazyQuery>;
export type SettingsPromptsSuspenseQueryHookResult = ReturnType<typeof useSettingsPromptsSuspenseQuery>;
export type SettingsPromptsQueryResult = Apollo.QueryResult<SettingsPromptsQuery, SettingsPromptsQueryVariables>;
export const FlowDocument = gql`
    query flow($id: ID!) {
        flow(flowId: $id) {
            ...flowFragment
        }
        tasks(flowId: $id) {
            ...taskFragment
        }
        screenshots(flowId: $id) {
            ...screenshotFragment
        }
        terminalLogs(flowId: $id) {
            ...terminalLogFragment
        }
        messageLogs(flowId: $id) {
            ...messageLogFragment
        }
        agentLogs(flowId: $id) {
            ...agentLogFragment
        }
        searchLogs(flowId: $id) {
            ...searchLogFragment
        }
        vectorStoreLogs(flowId: $id) {
            ...vectorStoreLogFragment
        }
    }
    ${FlowFragmentFragmentDoc}
    ${TaskFragmentFragmentDoc}
    ${ScreenshotFragmentFragmentDoc}
    ${TerminalLogFragmentFragmentDoc}
    ${MessageLogFragmentFragmentDoc}
    ${AgentLogFragmentFragmentDoc}
    ${SearchLogFragmentFragmentDoc}
    ${VectorStoreLogFragmentFragmentDoc}
`;

/**
 * __useFlowQuery__
 *
 * To run a query within a React component, call `useFlowQuery` and pass it any options that fit your needs.
 * When your component renders, `useFlowQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFlowQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useFlowQuery(
    baseOptions: Apollo.QueryHookOptions<FlowQuery, FlowQueryVariables> &
        ({ variables: FlowQueryVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<FlowQuery, FlowQueryVariables>(FlowDocument, options);
}
export function useFlowLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<FlowQuery, FlowQueryVariables>) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<FlowQuery, FlowQueryVariables>(FlowDocument, options);
}
// @ts-ignore
export function useFlowSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<FlowQuery, FlowQueryVariables>,
): Apollo.UseSuspenseQueryResult<FlowQuery, FlowQueryVariables>;
export function useFlowSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<FlowQuery, FlowQueryVariables>,
): Apollo.UseSuspenseQueryResult<FlowQuery | undefined, FlowQueryVariables>;
export function useFlowSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<FlowQuery, FlowQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<FlowQuery, FlowQueryVariables>(FlowDocument, options);
}
export type FlowQueryHookResult = ReturnType<typeof useFlowQuery>;
export type FlowLazyQueryHookResult = ReturnType<typeof useFlowLazyQuery>;
export type FlowSuspenseQueryHookResult = ReturnType<typeof useFlowSuspenseQuery>;
export type FlowQueryResult = Apollo.QueryResult<FlowQuery, FlowQueryVariables>;
export const TasksDocument = gql`
    query tasks($flowId: ID!) {
        tasks(flowId: $flowId) {
            ...taskFragment
        }
    }
    ${TaskFragmentFragmentDoc}
`;

/**
 * __useTasksQuery__
 *
 * To run a query within a React component, call `useTasksQuery` and pass it any options that fit your needs.
 * When your component renders, `useTasksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTasksQuery({
 *   variables: {
 *      flowId: // value for 'flowId'
 *   },
 * });
 */
export function useTasksQuery(
    baseOptions: Apollo.QueryHookOptions<TasksQuery, TasksQueryVariables> &
        ({ variables: TasksQueryVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<TasksQuery, TasksQueryVariables>(TasksDocument, options);
}
export function useTasksLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TasksQuery, TasksQueryVariables>) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<TasksQuery, TasksQueryVariables>(TasksDocument, options);
}
// @ts-ignore
export function useTasksSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<TasksQuery, TasksQueryVariables>,
): Apollo.UseSuspenseQueryResult<TasksQuery, TasksQueryVariables>;
export function useTasksSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TasksQuery, TasksQueryVariables>,
): Apollo.UseSuspenseQueryResult<TasksQuery | undefined, TasksQueryVariables>;
export function useTasksSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TasksQuery, TasksQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<TasksQuery, TasksQueryVariables>(TasksDocument, options);
}
export type TasksQueryHookResult = ReturnType<typeof useTasksQuery>;
export type TasksLazyQueryHookResult = ReturnType<typeof useTasksLazyQuery>;
export type TasksSuspenseQueryHookResult = ReturnType<typeof useTasksSuspenseQuery>;
export type TasksQueryResult = Apollo.QueryResult<TasksQuery, TasksQueryVariables>;
export const AssistantsDocument = gql`
    query assistants($flowId: ID!) {
        assistants(flowId: $flowId) {
            ...assistantFragment
        }
    }
    ${AssistantFragmentFragmentDoc}
`;

/**
 * __useAssistantsQuery__
 *
 * To run a query within a React component, call `useAssistantsQuery` and pass it any options that fit your needs.
 * When your component renders, `useAssistantsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAssistantsQuery({
 *   variables: {
 *      flowId: // value for 'flowId'
 *   },
 * });
 */
export function useAssistantsQuery(
    baseOptions: Apollo.QueryHookOptions<AssistantsQuery, AssistantsQueryVariables> &
        ({ variables: AssistantsQueryVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<AssistantsQuery, AssistantsQueryVariables>(AssistantsDocument, options);
}
export function useAssistantsLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<AssistantsQuery, AssistantsQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<AssistantsQuery, AssistantsQueryVariables>(AssistantsDocument, options);
}
// @ts-ignore
export function useAssistantsSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<AssistantsQuery, AssistantsQueryVariables>,
): Apollo.UseSuspenseQueryResult<AssistantsQuery, AssistantsQueryVariables>;
export function useAssistantsSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AssistantsQuery, AssistantsQueryVariables>,
): Apollo.UseSuspenseQueryResult<AssistantsQuery | undefined, AssistantsQueryVariables>;
export function useAssistantsSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AssistantsQuery, AssistantsQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<AssistantsQuery, AssistantsQueryVariables>(AssistantsDocument, options);
}
export type AssistantsQueryHookResult = ReturnType<typeof useAssistantsQuery>;
export type AssistantsLazyQueryHookResult = ReturnType<typeof useAssistantsLazyQuery>;
export type AssistantsSuspenseQueryHookResult = ReturnType<typeof useAssistantsSuspenseQuery>;
export type AssistantsQueryResult = Apollo.QueryResult<AssistantsQuery, AssistantsQueryVariables>;
export const AssistantLogsDocument = gql`
    query assistantLogs($flowId: ID!, $assistantId: ID!) {
        assistantLogs(flowId: $flowId, assistantId: $assistantId) {
            ...assistantLogFragment
        }
    }
    ${AssistantLogFragmentFragmentDoc}
`;

/**
 * __useAssistantLogsQuery__
 *
 * To run a query within a React component, call `useAssistantLogsQuery` and pass it any options that fit your needs.
 * When your component renders, `useAssistantLogsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAssistantLogsQuery({
 *   variables: {
 *      flowId: // value for 'flowId'
 *      assistantId: // value for 'assistantId'
 *   },
 * });
 */
export function useAssistantLogsQuery(
    baseOptions: Apollo.QueryHookOptions<AssistantLogsQuery, AssistantLogsQueryVariables> &
        ({ variables: AssistantLogsQueryVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<AssistantLogsQuery, AssistantLogsQueryVariables>(AssistantLogsDocument, options);
}
export function useAssistantLogsLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<AssistantLogsQuery, AssistantLogsQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<AssistantLogsQuery, AssistantLogsQueryVariables>(AssistantLogsDocument, options);
}
// @ts-ignore
export function useAssistantLogsSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<AssistantLogsQuery, AssistantLogsQueryVariables>,
): Apollo.UseSuspenseQueryResult<AssistantLogsQuery, AssistantLogsQueryVariables>;
export function useAssistantLogsSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AssistantLogsQuery, AssistantLogsQueryVariables>,
): Apollo.UseSuspenseQueryResult<AssistantLogsQuery | undefined, AssistantLogsQueryVariables>;
export function useAssistantLogsSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AssistantLogsQuery, AssistantLogsQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<AssistantLogsQuery, AssistantLogsQueryVariables>(AssistantLogsDocument, options);
}
export type AssistantLogsQueryHookResult = ReturnType<typeof useAssistantLogsQuery>;
export type AssistantLogsLazyQueryHookResult = ReturnType<typeof useAssistantLogsLazyQuery>;
export type AssistantLogsSuspenseQueryHookResult = ReturnType<typeof useAssistantLogsSuspenseQuery>;
export type AssistantLogsQueryResult = Apollo.QueryResult<AssistantLogsQuery, AssistantLogsQueryVariables>;
export const FlowReportDocument = gql`
    query flowReport($id: ID!) {
        flow(flowId: $id) {
            ...flowFragment
            findings {
                ...findingFragment
            }
        }
        tasks(flowId: $id) {
            ...taskFragment
        }
    }
    ${FlowFragmentFragmentDoc}
    ${FindingFragmentFragmentDoc}
    ${TaskFragmentFragmentDoc}
`;

/**
 * __useFlowReportQuery__
 *
 * To run a query within a React component, call `useFlowReportQuery` and pass it any options that fit your needs.
 * When your component renders, `useFlowReportQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFlowReportQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useFlowReportQuery(
    baseOptions: Apollo.QueryHookOptions<FlowReportQuery, FlowReportQueryVariables> &
        ({ variables: FlowReportQueryVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<FlowReportQuery, FlowReportQueryVariables>(FlowReportDocument, options);
}
export function useFlowReportLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<FlowReportQuery, FlowReportQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<FlowReportQuery, FlowReportQueryVariables>(FlowReportDocument, options);
}
// @ts-ignore
export function useFlowReportSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<FlowReportQuery, FlowReportQueryVariables>,
): Apollo.UseSuspenseQueryResult<FlowReportQuery, FlowReportQueryVariables>;
export function useFlowReportSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<FlowReportQuery, FlowReportQueryVariables>,
): Apollo.UseSuspenseQueryResult<FlowReportQuery | undefined, FlowReportQueryVariables>;
export function useFlowReportSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<FlowReportQuery, FlowReportQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<FlowReportQuery, FlowReportQueryVariables>(FlowReportDocument, options);
}
export type FlowReportQueryHookResult = ReturnType<typeof useFlowReportQuery>;
export type FlowReportLazyQueryHookResult = ReturnType<typeof useFlowReportLazyQuery>;
export type FlowReportSuspenseQueryHookResult = ReturnType<typeof useFlowReportSuspenseQuery>;
export type FlowReportQueryResult = Apollo.QueryResult<FlowReportQuery, FlowReportQueryVariables>;
export const UsageStatsTotalDocument = gql`
    query usageStatsTotal {
        usageStatsTotal {
            ...usageStatsFragment
        }
    }
    ${UsageStatsFragmentFragmentDoc}
`;

/**
 * __useUsageStatsTotalQuery__
 *
 * To run a query within a React component, call `useUsageStatsTotalQuery` and pass it any options that fit your needs.
 * When your component renders, `useUsageStatsTotalQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUsageStatsTotalQuery({
 *   variables: {
 *   },
 * });
 */
export function useUsageStatsTotalQuery(
    baseOptions?: Apollo.QueryHookOptions<UsageStatsTotalQuery, UsageStatsTotalQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<UsageStatsTotalQuery, UsageStatsTotalQueryVariables>(UsageStatsTotalDocument, options);
}
export function useUsageStatsTotalLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<UsageStatsTotalQuery, UsageStatsTotalQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<UsageStatsTotalQuery, UsageStatsTotalQueryVariables>(UsageStatsTotalDocument, options);
}
// @ts-ignore
export function useUsageStatsTotalSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<UsageStatsTotalQuery, UsageStatsTotalQueryVariables>,
): Apollo.UseSuspenseQueryResult<UsageStatsTotalQuery, UsageStatsTotalQueryVariables>;
export function useUsageStatsTotalSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<UsageStatsTotalQuery, UsageStatsTotalQueryVariables>,
): Apollo.UseSuspenseQueryResult<UsageStatsTotalQuery | undefined, UsageStatsTotalQueryVariables>;
export function useUsageStatsTotalSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<UsageStatsTotalQuery, UsageStatsTotalQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<UsageStatsTotalQuery, UsageStatsTotalQueryVariables>(
        UsageStatsTotalDocument,
        options,
    );
}
export type UsageStatsTotalQueryHookResult = ReturnType<typeof useUsageStatsTotalQuery>;
export type UsageStatsTotalLazyQueryHookResult = ReturnType<typeof useUsageStatsTotalLazyQuery>;
export type UsageStatsTotalSuspenseQueryHookResult = ReturnType<typeof useUsageStatsTotalSuspenseQuery>;
export type UsageStatsTotalQueryResult = Apollo.QueryResult<UsageStatsTotalQuery, UsageStatsTotalQueryVariables>;
export const UsageStatsByPeriodDocument = gql`
    query usageStatsByPeriod($period: UsageStatsPeriod!) {
        usageStatsByPeriod(period: $period) {
            ...dailyUsageStatsFragment
        }
    }
    ${DailyUsageStatsFragmentFragmentDoc}
`;

/**
 * __useUsageStatsByPeriodQuery__
 *
 * To run a query within a React component, call `useUsageStatsByPeriodQuery` and pass it any options that fit your needs.
 * When your component renders, `useUsageStatsByPeriodQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUsageStatsByPeriodQuery({
 *   variables: {
 *      period: // value for 'period'
 *   },
 * });
 */
export function useUsageStatsByPeriodQuery(
    baseOptions: Apollo.QueryHookOptions<UsageStatsByPeriodQuery, UsageStatsByPeriodQueryVariables> &
        ({ variables: UsageStatsByPeriodQueryVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<UsageStatsByPeriodQuery, UsageStatsByPeriodQueryVariables>(
        UsageStatsByPeriodDocument,
        options,
    );
}
export function useUsageStatsByPeriodLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<UsageStatsByPeriodQuery, UsageStatsByPeriodQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<UsageStatsByPeriodQuery, UsageStatsByPeriodQueryVariables>(
        UsageStatsByPeriodDocument,
        options,
    );
}
// @ts-ignore
export function useUsageStatsByPeriodSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<UsageStatsByPeriodQuery, UsageStatsByPeriodQueryVariables>,
): Apollo.UseSuspenseQueryResult<UsageStatsByPeriodQuery, UsageStatsByPeriodQueryVariables>;
export function useUsageStatsByPeriodSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<UsageStatsByPeriodQuery, UsageStatsByPeriodQueryVariables>,
): Apollo.UseSuspenseQueryResult<UsageStatsByPeriodQuery | undefined, UsageStatsByPeriodQueryVariables>;
export function useUsageStatsByPeriodSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<UsageStatsByPeriodQuery, UsageStatsByPeriodQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<UsageStatsByPeriodQuery, UsageStatsByPeriodQueryVariables>(
        UsageStatsByPeriodDocument,
        options,
    );
}
export type UsageStatsByPeriodQueryHookResult = ReturnType<typeof useUsageStatsByPeriodQuery>;
export type UsageStatsByPeriodLazyQueryHookResult = ReturnType<typeof useUsageStatsByPeriodLazyQuery>;
export type UsageStatsByPeriodSuspenseQueryHookResult = ReturnType<typeof useUsageStatsByPeriodSuspenseQuery>;
export type UsageStatsByPeriodQueryResult = Apollo.QueryResult<
    UsageStatsByPeriodQuery,
    UsageStatsByPeriodQueryVariables
>;
export const UsageStatsByProviderDocument = gql`
    query usageStatsByProvider {
        usageStatsByProvider {
            ...providerUsageStatsFragment
        }
    }
    ${ProviderUsageStatsFragmentFragmentDoc}
`;

/**
 * __useUsageStatsByProviderQuery__
 *
 * To run a query within a React component, call `useUsageStatsByProviderQuery` and pass it any options that fit your needs.
 * When your component renders, `useUsageStatsByProviderQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUsageStatsByProviderQuery({
 *   variables: {
 *   },
 * });
 */
export function useUsageStatsByProviderQuery(
    baseOptions?: Apollo.QueryHookOptions<UsageStatsByProviderQuery, UsageStatsByProviderQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<UsageStatsByProviderQuery, UsageStatsByProviderQueryVariables>(
        UsageStatsByProviderDocument,
        options,
    );
}
export function useUsageStatsByProviderLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<UsageStatsByProviderQuery, UsageStatsByProviderQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<UsageStatsByProviderQuery, UsageStatsByProviderQueryVariables>(
        UsageStatsByProviderDocument,
        options,
    );
}
// @ts-ignore
export function useUsageStatsByProviderSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<UsageStatsByProviderQuery, UsageStatsByProviderQueryVariables>,
): Apollo.UseSuspenseQueryResult<UsageStatsByProviderQuery, UsageStatsByProviderQueryVariables>;
export function useUsageStatsByProviderSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<UsageStatsByProviderQuery, UsageStatsByProviderQueryVariables>,
): Apollo.UseSuspenseQueryResult<UsageStatsByProviderQuery | undefined, UsageStatsByProviderQueryVariables>;
export function useUsageStatsByProviderSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<UsageStatsByProviderQuery, UsageStatsByProviderQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<UsageStatsByProviderQuery, UsageStatsByProviderQueryVariables>(
        UsageStatsByProviderDocument,
        options,
    );
}
export type UsageStatsByProviderQueryHookResult = ReturnType<typeof useUsageStatsByProviderQuery>;
export type UsageStatsByProviderLazyQueryHookResult = ReturnType<typeof useUsageStatsByProviderLazyQuery>;
export type UsageStatsByProviderSuspenseQueryHookResult = ReturnType<typeof useUsageStatsByProviderSuspenseQuery>;
export type UsageStatsByProviderQueryResult = Apollo.QueryResult<
    UsageStatsByProviderQuery,
    UsageStatsByProviderQueryVariables
>;
export const UsageStatsByModelDocument = gql`
    query usageStatsByModel {
        usageStatsByModel {
            ...modelUsageStatsFragment
        }
    }
    ${ModelUsageStatsFragmentFragmentDoc}
`;

/**
 * __useUsageStatsByModelQuery__
 *
 * To run a query within a React component, call `useUsageStatsByModelQuery` and pass it any options that fit your needs.
 * When your component renders, `useUsageStatsByModelQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUsageStatsByModelQuery({
 *   variables: {
 *   },
 * });
 */
export function useUsageStatsByModelQuery(
    baseOptions?: Apollo.QueryHookOptions<UsageStatsByModelQuery, UsageStatsByModelQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<UsageStatsByModelQuery, UsageStatsByModelQueryVariables>(UsageStatsByModelDocument, options);
}
export function useUsageStatsByModelLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<UsageStatsByModelQuery, UsageStatsByModelQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<UsageStatsByModelQuery, UsageStatsByModelQueryVariables>(
        UsageStatsByModelDocument,
        options,
    );
}
// @ts-ignore
export function useUsageStatsByModelSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<UsageStatsByModelQuery, UsageStatsByModelQueryVariables>,
): Apollo.UseSuspenseQueryResult<UsageStatsByModelQuery, UsageStatsByModelQueryVariables>;
export function useUsageStatsByModelSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<UsageStatsByModelQuery, UsageStatsByModelQueryVariables>,
): Apollo.UseSuspenseQueryResult<UsageStatsByModelQuery | undefined, UsageStatsByModelQueryVariables>;
export function useUsageStatsByModelSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<UsageStatsByModelQuery, UsageStatsByModelQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<UsageStatsByModelQuery, UsageStatsByModelQueryVariables>(
        UsageStatsByModelDocument,
        options,
    );
}
export type UsageStatsByModelQueryHookResult = ReturnType<typeof useUsageStatsByModelQuery>;
export type UsageStatsByModelLazyQueryHookResult = ReturnType<typeof useUsageStatsByModelLazyQuery>;
export type UsageStatsByModelSuspenseQueryHookResult = ReturnType<typeof useUsageStatsByModelSuspenseQuery>;
export type UsageStatsByModelQueryResult = Apollo.QueryResult<UsageStatsByModelQuery, UsageStatsByModelQueryVariables>;
export const UsageStatsByAgentTypeDocument = gql`
    query usageStatsByAgentType {
        usageStatsByAgentType {
            ...agentTypeUsageStatsFragment
        }
    }
    ${AgentTypeUsageStatsFragmentFragmentDoc}
`;

/**
 * __useUsageStatsByAgentTypeQuery__
 *
 * To run a query within a React component, call `useUsageStatsByAgentTypeQuery` and pass it any options that fit your needs.
 * When your component renders, `useUsageStatsByAgentTypeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUsageStatsByAgentTypeQuery({
 *   variables: {
 *   },
 * });
 */
export function useUsageStatsByAgentTypeQuery(
    baseOptions?: Apollo.QueryHookOptions<UsageStatsByAgentTypeQuery, UsageStatsByAgentTypeQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<UsageStatsByAgentTypeQuery, UsageStatsByAgentTypeQueryVariables>(
        UsageStatsByAgentTypeDocument,
        options,
    );
}
export function useUsageStatsByAgentTypeLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<UsageStatsByAgentTypeQuery, UsageStatsByAgentTypeQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<UsageStatsByAgentTypeQuery, UsageStatsByAgentTypeQueryVariables>(
        UsageStatsByAgentTypeDocument,
        options,
    );
}
// @ts-ignore
export function useUsageStatsByAgentTypeSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<UsageStatsByAgentTypeQuery, UsageStatsByAgentTypeQueryVariables>,
): Apollo.UseSuspenseQueryResult<UsageStatsByAgentTypeQuery, UsageStatsByAgentTypeQueryVariables>;
export function useUsageStatsByAgentTypeSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<UsageStatsByAgentTypeQuery, UsageStatsByAgentTypeQueryVariables>,
): Apollo.UseSuspenseQueryResult<UsageStatsByAgentTypeQuery | undefined, UsageStatsByAgentTypeQueryVariables>;
export function useUsageStatsByAgentTypeSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<UsageStatsByAgentTypeQuery, UsageStatsByAgentTypeQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<UsageStatsByAgentTypeQuery, UsageStatsByAgentTypeQueryVariables>(
        UsageStatsByAgentTypeDocument,
        options,
    );
}
export type UsageStatsByAgentTypeQueryHookResult = ReturnType<typeof useUsageStatsByAgentTypeQuery>;
export type UsageStatsByAgentTypeLazyQueryHookResult = ReturnType<typeof useUsageStatsByAgentTypeLazyQuery>;
export type UsageStatsByAgentTypeSuspenseQueryHookResult = ReturnType<typeof useUsageStatsByAgentTypeSuspenseQuery>;
export type UsageStatsByAgentTypeQueryResult = Apollo.QueryResult<
    UsageStatsByAgentTypeQuery,
    UsageStatsByAgentTypeQueryVariables
>;
export const UsageStatsByFlowDocument = gql`
    query usageStatsByFlow($flowId: ID!) {
        usageStatsByFlow(flowId: $flowId) {
            ...usageStatsFragment
        }
    }
    ${UsageStatsFragmentFragmentDoc}
`;

/**
 * __useUsageStatsByFlowQuery__
 *
 * To run a query within a React component, call `useUsageStatsByFlowQuery` and pass it any options that fit your needs.
 * When your component renders, `useUsageStatsByFlowQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUsageStatsByFlowQuery({
 *   variables: {
 *      flowId: // value for 'flowId'
 *   },
 * });
 */
export function useUsageStatsByFlowQuery(
    baseOptions: Apollo.QueryHookOptions<UsageStatsByFlowQuery, UsageStatsByFlowQueryVariables> &
        ({ variables: UsageStatsByFlowQueryVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<UsageStatsByFlowQuery, UsageStatsByFlowQueryVariables>(UsageStatsByFlowDocument, options);
}
export function useUsageStatsByFlowLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<UsageStatsByFlowQuery, UsageStatsByFlowQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<UsageStatsByFlowQuery, UsageStatsByFlowQueryVariables>(
        UsageStatsByFlowDocument,
        options,
    );
}
// @ts-ignore
export function useUsageStatsByFlowSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<UsageStatsByFlowQuery, UsageStatsByFlowQueryVariables>,
): Apollo.UseSuspenseQueryResult<UsageStatsByFlowQuery, UsageStatsByFlowQueryVariables>;
export function useUsageStatsByFlowSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<UsageStatsByFlowQuery, UsageStatsByFlowQueryVariables>,
): Apollo.UseSuspenseQueryResult<UsageStatsByFlowQuery | undefined, UsageStatsByFlowQueryVariables>;
export function useUsageStatsByFlowSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<UsageStatsByFlowQuery, UsageStatsByFlowQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<UsageStatsByFlowQuery, UsageStatsByFlowQueryVariables>(
        UsageStatsByFlowDocument,
        options,
    );
}
export type UsageStatsByFlowQueryHookResult = ReturnType<typeof useUsageStatsByFlowQuery>;
export type UsageStatsByFlowLazyQueryHookResult = ReturnType<typeof useUsageStatsByFlowLazyQuery>;
export type UsageStatsByFlowSuspenseQueryHookResult = ReturnType<typeof useUsageStatsByFlowSuspenseQuery>;
export type UsageStatsByFlowQueryResult = Apollo.QueryResult<UsageStatsByFlowQuery, UsageStatsByFlowQueryVariables>;
export const UsageStatsByAgentTypeForFlowDocument = gql`
    query usageStatsByAgentTypeForFlow($flowId: ID!) {
        usageStatsByAgentTypeForFlow(flowId: $flowId) {
            ...agentTypeUsageStatsFragment
        }
    }
    ${AgentTypeUsageStatsFragmentFragmentDoc}
`;

/**
 * __useUsageStatsByAgentTypeForFlowQuery__
 *
 * To run a query within a React component, call `useUsageStatsByAgentTypeForFlowQuery` and pass it any options that fit your needs.
 * When your component renders, `useUsageStatsByAgentTypeForFlowQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUsageStatsByAgentTypeForFlowQuery({
 *   variables: {
 *      flowId: // value for 'flowId'
 *   },
 * });
 */
export function useUsageStatsByAgentTypeForFlowQuery(
    baseOptions: Apollo.QueryHookOptions<
        UsageStatsByAgentTypeForFlowQuery,
        UsageStatsByAgentTypeForFlowQueryVariables
    > &
        ({ variables: UsageStatsByAgentTypeForFlowQueryVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<UsageStatsByAgentTypeForFlowQuery, UsageStatsByAgentTypeForFlowQueryVariables>(
        UsageStatsByAgentTypeForFlowDocument,
        options,
    );
}
export function useUsageStatsByAgentTypeForFlowLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<
        UsageStatsByAgentTypeForFlowQuery,
        UsageStatsByAgentTypeForFlowQueryVariables
    >,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<UsageStatsByAgentTypeForFlowQuery, UsageStatsByAgentTypeForFlowQueryVariables>(
        UsageStatsByAgentTypeForFlowDocument,
        options,
    );
}
// @ts-ignore
export function useUsageStatsByAgentTypeForFlowSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<
        UsageStatsByAgentTypeForFlowQuery,
        UsageStatsByAgentTypeForFlowQueryVariables
    >,
): Apollo.UseSuspenseQueryResult<UsageStatsByAgentTypeForFlowQuery, UsageStatsByAgentTypeForFlowQueryVariables>;
export function useUsageStatsByAgentTypeForFlowSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<
              UsageStatsByAgentTypeForFlowQuery,
              UsageStatsByAgentTypeForFlowQueryVariables
          >,
): Apollo.UseSuspenseQueryResult<
    UsageStatsByAgentTypeForFlowQuery | undefined,
    UsageStatsByAgentTypeForFlowQueryVariables
>;
export function useUsageStatsByAgentTypeForFlowSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<
              UsageStatsByAgentTypeForFlowQuery,
              UsageStatsByAgentTypeForFlowQueryVariables
          >,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<UsageStatsByAgentTypeForFlowQuery, UsageStatsByAgentTypeForFlowQueryVariables>(
        UsageStatsByAgentTypeForFlowDocument,
        options,
    );
}
export type UsageStatsByAgentTypeForFlowQueryHookResult = ReturnType<typeof useUsageStatsByAgentTypeForFlowQuery>;
export type UsageStatsByAgentTypeForFlowLazyQueryHookResult = ReturnType<
    typeof useUsageStatsByAgentTypeForFlowLazyQuery
>;
export type UsageStatsByAgentTypeForFlowSuspenseQueryHookResult = ReturnType<
    typeof useUsageStatsByAgentTypeForFlowSuspenseQuery
>;
export type UsageStatsByAgentTypeForFlowQueryResult = Apollo.QueryResult<
    UsageStatsByAgentTypeForFlowQuery,
    UsageStatsByAgentTypeForFlowQueryVariables
>;
export const ToolcallsStatsTotalDocument = gql`
    query toolcallsStatsTotal {
        toolcallsStatsTotal {
            ...toolcallsStatsFragment
        }
    }
    ${ToolcallsStatsFragmentFragmentDoc}
`;

/**
 * __useToolcallsStatsTotalQuery__
 *
 * To run a query within a React component, call `useToolcallsStatsTotalQuery` and pass it any options that fit your needs.
 * When your component renders, `useToolcallsStatsTotalQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useToolcallsStatsTotalQuery({
 *   variables: {
 *   },
 * });
 */
export function useToolcallsStatsTotalQuery(
    baseOptions?: Apollo.QueryHookOptions<ToolcallsStatsTotalQuery, ToolcallsStatsTotalQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<ToolcallsStatsTotalQuery, ToolcallsStatsTotalQueryVariables>(
        ToolcallsStatsTotalDocument,
        options,
    );
}
export function useToolcallsStatsTotalLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<ToolcallsStatsTotalQuery, ToolcallsStatsTotalQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<ToolcallsStatsTotalQuery, ToolcallsStatsTotalQueryVariables>(
        ToolcallsStatsTotalDocument,
        options,
    );
}
// @ts-ignore
export function useToolcallsStatsTotalSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<ToolcallsStatsTotalQuery, ToolcallsStatsTotalQueryVariables>,
): Apollo.UseSuspenseQueryResult<ToolcallsStatsTotalQuery, ToolcallsStatsTotalQueryVariables>;
export function useToolcallsStatsTotalSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<ToolcallsStatsTotalQuery, ToolcallsStatsTotalQueryVariables>,
): Apollo.UseSuspenseQueryResult<ToolcallsStatsTotalQuery | undefined, ToolcallsStatsTotalQueryVariables>;
export function useToolcallsStatsTotalSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<ToolcallsStatsTotalQuery, ToolcallsStatsTotalQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<ToolcallsStatsTotalQuery, ToolcallsStatsTotalQueryVariables>(
        ToolcallsStatsTotalDocument,
        options,
    );
}
export type ToolcallsStatsTotalQueryHookResult = ReturnType<typeof useToolcallsStatsTotalQuery>;
export type ToolcallsStatsTotalLazyQueryHookResult = ReturnType<typeof useToolcallsStatsTotalLazyQuery>;
export type ToolcallsStatsTotalSuspenseQueryHookResult = ReturnType<typeof useToolcallsStatsTotalSuspenseQuery>;
export type ToolcallsStatsTotalQueryResult = Apollo.QueryResult<
    ToolcallsStatsTotalQuery,
    ToolcallsStatsTotalQueryVariables
>;
export const ToolcallsStatsByPeriodDocument = gql`
    query toolcallsStatsByPeriod($period: UsageStatsPeriod!) {
        toolcallsStatsByPeriod(period: $period) {
            ...dailyToolcallsStatsFragment
        }
    }
    ${DailyToolcallsStatsFragmentFragmentDoc}
`;

/**
 * __useToolcallsStatsByPeriodQuery__
 *
 * To run a query within a React component, call `useToolcallsStatsByPeriodQuery` and pass it any options that fit your needs.
 * When your component renders, `useToolcallsStatsByPeriodQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useToolcallsStatsByPeriodQuery({
 *   variables: {
 *      period: // value for 'period'
 *   },
 * });
 */
export function useToolcallsStatsByPeriodQuery(
    baseOptions: Apollo.QueryHookOptions<ToolcallsStatsByPeriodQuery, ToolcallsStatsByPeriodQueryVariables> &
        ({ variables: ToolcallsStatsByPeriodQueryVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<ToolcallsStatsByPeriodQuery, ToolcallsStatsByPeriodQueryVariables>(
        ToolcallsStatsByPeriodDocument,
        options,
    );
}
export function useToolcallsStatsByPeriodLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<ToolcallsStatsByPeriodQuery, ToolcallsStatsByPeriodQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<ToolcallsStatsByPeriodQuery, ToolcallsStatsByPeriodQueryVariables>(
        ToolcallsStatsByPeriodDocument,
        options,
    );
}
// @ts-ignore
export function useToolcallsStatsByPeriodSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<ToolcallsStatsByPeriodQuery, ToolcallsStatsByPeriodQueryVariables>,
): Apollo.UseSuspenseQueryResult<ToolcallsStatsByPeriodQuery, ToolcallsStatsByPeriodQueryVariables>;
export function useToolcallsStatsByPeriodSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<ToolcallsStatsByPeriodQuery, ToolcallsStatsByPeriodQueryVariables>,
): Apollo.UseSuspenseQueryResult<ToolcallsStatsByPeriodQuery | undefined, ToolcallsStatsByPeriodQueryVariables>;
export function useToolcallsStatsByPeriodSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<ToolcallsStatsByPeriodQuery, ToolcallsStatsByPeriodQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<ToolcallsStatsByPeriodQuery, ToolcallsStatsByPeriodQueryVariables>(
        ToolcallsStatsByPeriodDocument,
        options,
    );
}
export type ToolcallsStatsByPeriodQueryHookResult = ReturnType<typeof useToolcallsStatsByPeriodQuery>;
export type ToolcallsStatsByPeriodLazyQueryHookResult = ReturnType<typeof useToolcallsStatsByPeriodLazyQuery>;
export type ToolcallsStatsByPeriodSuspenseQueryHookResult = ReturnType<typeof useToolcallsStatsByPeriodSuspenseQuery>;
export type ToolcallsStatsByPeriodQueryResult = Apollo.QueryResult<
    ToolcallsStatsByPeriodQuery,
    ToolcallsStatsByPeriodQueryVariables
>;
export const ToolcallsStatsByFunctionDocument = gql`
    query toolcallsStatsByFunction {
        toolcallsStatsByFunction {
            ...functionToolcallsStatsFragment
        }
    }
    ${FunctionToolcallsStatsFragmentFragmentDoc}
`;

/**
 * __useToolcallsStatsByFunctionQuery__
 *
 * To run a query within a React component, call `useToolcallsStatsByFunctionQuery` and pass it any options that fit your needs.
 * When your component renders, `useToolcallsStatsByFunctionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useToolcallsStatsByFunctionQuery({
 *   variables: {
 *   },
 * });
 */
export function useToolcallsStatsByFunctionQuery(
    baseOptions?: Apollo.QueryHookOptions<ToolcallsStatsByFunctionQuery, ToolcallsStatsByFunctionQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<ToolcallsStatsByFunctionQuery, ToolcallsStatsByFunctionQueryVariables>(
        ToolcallsStatsByFunctionDocument,
        options,
    );
}
export function useToolcallsStatsByFunctionLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<ToolcallsStatsByFunctionQuery, ToolcallsStatsByFunctionQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<ToolcallsStatsByFunctionQuery, ToolcallsStatsByFunctionQueryVariables>(
        ToolcallsStatsByFunctionDocument,
        options,
    );
}
// @ts-ignore
export function useToolcallsStatsByFunctionSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<
        ToolcallsStatsByFunctionQuery,
        ToolcallsStatsByFunctionQueryVariables
    >,
): Apollo.UseSuspenseQueryResult<ToolcallsStatsByFunctionQuery, ToolcallsStatsByFunctionQueryVariables>;
export function useToolcallsStatsByFunctionSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<ToolcallsStatsByFunctionQuery, ToolcallsStatsByFunctionQueryVariables>,
): Apollo.UseSuspenseQueryResult<ToolcallsStatsByFunctionQuery | undefined, ToolcallsStatsByFunctionQueryVariables>;
export function useToolcallsStatsByFunctionSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<ToolcallsStatsByFunctionQuery, ToolcallsStatsByFunctionQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<ToolcallsStatsByFunctionQuery, ToolcallsStatsByFunctionQueryVariables>(
        ToolcallsStatsByFunctionDocument,
        options,
    );
}
export type ToolcallsStatsByFunctionQueryHookResult = ReturnType<typeof useToolcallsStatsByFunctionQuery>;
export type ToolcallsStatsByFunctionLazyQueryHookResult = ReturnType<typeof useToolcallsStatsByFunctionLazyQuery>;
export type ToolcallsStatsByFunctionSuspenseQueryHookResult = ReturnType<
    typeof useToolcallsStatsByFunctionSuspenseQuery
>;
export type ToolcallsStatsByFunctionQueryResult = Apollo.QueryResult<
    ToolcallsStatsByFunctionQuery,
    ToolcallsStatsByFunctionQueryVariables
>;
export const ToolcallsStatsByFlowDocument = gql`
    query toolcallsStatsByFlow($flowId: ID!) {
        toolcallsStatsByFlow(flowId: $flowId) {
            ...toolcallsStatsFragment
        }
    }
    ${ToolcallsStatsFragmentFragmentDoc}
`;

/**
 * __useToolcallsStatsByFlowQuery__
 *
 * To run a query within a React component, call `useToolcallsStatsByFlowQuery` and pass it any options that fit your needs.
 * When your component renders, `useToolcallsStatsByFlowQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useToolcallsStatsByFlowQuery({
 *   variables: {
 *      flowId: // value for 'flowId'
 *   },
 * });
 */
export function useToolcallsStatsByFlowQuery(
    baseOptions: Apollo.QueryHookOptions<ToolcallsStatsByFlowQuery, ToolcallsStatsByFlowQueryVariables> &
        ({ variables: ToolcallsStatsByFlowQueryVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<ToolcallsStatsByFlowQuery, ToolcallsStatsByFlowQueryVariables>(
        ToolcallsStatsByFlowDocument,
        options,
    );
}
export function useToolcallsStatsByFlowLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<ToolcallsStatsByFlowQuery, ToolcallsStatsByFlowQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<ToolcallsStatsByFlowQuery, ToolcallsStatsByFlowQueryVariables>(
        ToolcallsStatsByFlowDocument,
        options,
    );
}
// @ts-ignore
export function useToolcallsStatsByFlowSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<ToolcallsStatsByFlowQuery, ToolcallsStatsByFlowQueryVariables>,
): Apollo.UseSuspenseQueryResult<ToolcallsStatsByFlowQuery, ToolcallsStatsByFlowQueryVariables>;
export function useToolcallsStatsByFlowSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<ToolcallsStatsByFlowQuery, ToolcallsStatsByFlowQueryVariables>,
): Apollo.UseSuspenseQueryResult<ToolcallsStatsByFlowQuery | undefined, ToolcallsStatsByFlowQueryVariables>;
export function useToolcallsStatsByFlowSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<ToolcallsStatsByFlowQuery, ToolcallsStatsByFlowQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<ToolcallsStatsByFlowQuery, ToolcallsStatsByFlowQueryVariables>(
        ToolcallsStatsByFlowDocument,
        options,
    );
}
export type ToolcallsStatsByFlowQueryHookResult = ReturnType<typeof useToolcallsStatsByFlowQuery>;
export type ToolcallsStatsByFlowLazyQueryHookResult = ReturnType<typeof useToolcallsStatsByFlowLazyQuery>;
export type ToolcallsStatsByFlowSuspenseQueryHookResult = ReturnType<typeof useToolcallsStatsByFlowSuspenseQuery>;
export type ToolcallsStatsByFlowQueryResult = Apollo.QueryResult<
    ToolcallsStatsByFlowQuery,
    ToolcallsStatsByFlowQueryVariables
>;
export const ToolcallsStatsByFunctionForFlowDocument = gql`
    query toolcallsStatsByFunctionForFlow($flowId: ID!) {
        toolcallsStatsByFunctionForFlow(flowId: $flowId) {
            ...functionToolcallsStatsFragment
        }
    }
    ${FunctionToolcallsStatsFragmentFragmentDoc}
`;

/**
 * __useToolcallsStatsByFunctionForFlowQuery__
 *
 * To run a query within a React component, call `useToolcallsStatsByFunctionForFlowQuery` and pass it any options that fit your needs.
 * When your component renders, `useToolcallsStatsByFunctionForFlowQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useToolcallsStatsByFunctionForFlowQuery({
 *   variables: {
 *      flowId: // value for 'flowId'
 *   },
 * });
 */
export function useToolcallsStatsByFunctionForFlowQuery(
    baseOptions: Apollo.QueryHookOptions<
        ToolcallsStatsByFunctionForFlowQuery,
        ToolcallsStatsByFunctionForFlowQueryVariables
    > &
        ({ variables: ToolcallsStatsByFunctionForFlowQueryVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<ToolcallsStatsByFunctionForFlowQuery, ToolcallsStatsByFunctionForFlowQueryVariables>(
        ToolcallsStatsByFunctionForFlowDocument,
        options,
    );
}
export function useToolcallsStatsByFunctionForFlowLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<
        ToolcallsStatsByFunctionForFlowQuery,
        ToolcallsStatsByFunctionForFlowQueryVariables
    >,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<ToolcallsStatsByFunctionForFlowQuery, ToolcallsStatsByFunctionForFlowQueryVariables>(
        ToolcallsStatsByFunctionForFlowDocument,
        options,
    );
}
// @ts-ignore
export function useToolcallsStatsByFunctionForFlowSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<
        ToolcallsStatsByFunctionForFlowQuery,
        ToolcallsStatsByFunctionForFlowQueryVariables
    >,
): Apollo.UseSuspenseQueryResult<ToolcallsStatsByFunctionForFlowQuery, ToolcallsStatsByFunctionForFlowQueryVariables>;
export function useToolcallsStatsByFunctionForFlowSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<
              ToolcallsStatsByFunctionForFlowQuery,
              ToolcallsStatsByFunctionForFlowQueryVariables
          >,
): Apollo.UseSuspenseQueryResult<
    ToolcallsStatsByFunctionForFlowQuery | undefined,
    ToolcallsStatsByFunctionForFlowQueryVariables
>;
export function useToolcallsStatsByFunctionForFlowSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<
              ToolcallsStatsByFunctionForFlowQuery,
              ToolcallsStatsByFunctionForFlowQueryVariables
          >,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<ToolcallsStatsByFunctionForFlowQuery, ToolcallsStatsByFunctionForFlowQueryVariables>(
        ToolcallsStatsByFunctionForFlowDocument,
        options,
    );
}
export type ToolcallsStatsByFunctionForFlowQueryHookResult = ReturnType<typeof useToolcallsStatsByFunctionForFlowQuery>;
export type ToolcallsStatsByFunctionForFlowLazyQueryHookResult = ReturnType<
    typeof useToolcallsStatsByFunctionForFlowLazyQuery
>;
export type ToolcallsStatsByFunctionForFlowSuspenseQueryHookResult = ReturnType<
    typeof useToolcallsStatsByFunctionForFlowSuspenseQuery
>;
export type ToolcallsStatsByFunctionForFlowQueryResult = Apollo.QueryResult<
    ToolcallsStatsByFunctionForFlowQuery,
    ToolcallsStatsByFunctionForFlowQueryVariables
>;
export const FlowsStatsTotalDocument = gql`
    query flowsStatsTotal {
        flowsStatsTotal {
            ...flowsStatsFragment
        }
    }
    ${FlowsStatsFragmentFragmentDoc}
`;

/**
 * __useFlowsStatsTotalQuery__
 *
 * To run a query within a React component, call `useFlowsStatsTotalQuery` and pass it any options that fit your needs.
 * When your component renders, `useFlowsStatsTotalQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFlowsStatsTotalQuery({
 *   variables: {
 *   },
 * });
 */
export function useFlowsStatsTotalQuery(
    baseOptions?: Apollo.QueryHookOptions<FlowsStatsTotalQuery, FlowsStatsTotalQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<FlowsStatsTotalQuery, FlowsStatsTotalQueryVariables>(FlowsStatsTotalDocument, options);
}
export function useFlowsStatsTotalLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<FlowsStatsTotalQuery, FlowsStatsTotalQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<FlowsStatsTotalQuery, FlowsStatsTotalQueryVariables>(FlowsStatsTotalDocument, options);
}
// @ts-ignore
export function useFlowsStatsTotalSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<FlowsStatsTotalQuery, FlowsStatsTotalQueryVariables>,
): Apollo.UseSuspenseQueryResult<FlowsStatsTotalQuery, FlowsStatsTotalQueryVariables>;
export function useFlowsStatsTotalSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<FlowsStatsTotalQuery, FlowsStatsTotalQueryVariables>,
): Apollo.UseSuspenseQueryResult<FlowsStatsTotalQuery | undefined, FlowsStatsTotalQueryVariables>;
export function useFlowsStatsTotalSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<FlowsStatsTotalQuery, FlowsStatsTotalQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<FlowsStatsTotalQuery, FlowsStatsTotalQueryVariables>(
        FlowsStatsTotalDocument,
        options,
    );
}
export type FlowsStatsTotalQueryHookResult = ReturnType<typeof useFlowsStatsTotalQuery>;
export type FlowsStatsTotalLazyQueryHookResult = ReturnType<typeof useFlowsStatsTotalLazyQuery>;
export type FlowsStatsTotalSuspenseQueryHookResult = ReturnType<typeof useFlowsStatsTotalSuspenseQuery>;
export type FlowsStatsTotalQueryResult = Apollo.QueryResult<FlowsStatsTotalQuery, FlowsStatsTotalQueryVariables>;
export const FlowsStatsByPeriodDocument = gql`
    query flowsStatsByPeriod($period: UsageStatsPeriod!) {
        flowsStatsByPeriod(period: $period) {
            ...dailyFlowsStatsFragment
        }
    }
    ${DailyFlowsStatsFragmentFragmentDoc}
`;

/**
 * __useFlowsStatsByPeriodQuery__
 *
 * To run a query within a React component, call `useFlowsStatsByPeriodQuery` and pass it any options that fit your needs.
 * When your component renders, `useFlowsStatsByPeriodQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFlowsStatsByPeriodQuery({
 *   variables: {
 *      period: // value for 'period'
 *   },
 * });
 */
export function useFlowsStatsByPeriodQuery(
    baseOptions: Apollo.QueryHookOptions<FlowsStatsByPeriodQuery, FlowsStatsByPeriodQueryVariables> &
        ({ variables: FlowsStatsByPeriodQueryVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<FlowsStatsByPeriodQuery, FlowsStatsByPeriodQueryVariables>(
        FlowsStatsByPeriodDocument,
        options,
    );
}
export function useFlowsStatsByPeriodLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<FlowsStatsByPeriodQuery, FlowsStatsByPeriodQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<FlowsStatsByPeriodQuery, FlowsStatsByPeriodQueryVariables>(
        FlowsStatsByPeriodDocument,
        options,
    );
}
// @ts-ignore
export function useFlowsStatsByPeriodSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<FlowsStatsByPeriodQuery, FlowsStatsByPeriodQueryVariables>,
): Apollo.UseSuspenseQueryResult<FlowsStatsByPeriodQuery, FlowsStatsByPeriodQueryVariables>;
export function useFlowsStatsByPeriodSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<FlowsStatsByPeriodQuery, FlowsStatsByPeriodQueryVariables>,
): Apollo.UseSuspenseQueryResult<FlowsStatsByPeriodQuery | undefined, FlowsStatsByPeriodQueryVariables>;
export function useFlowsStatsByPeriodSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<FlowsStatsByPeriodQuery, FlowsStatsByPeriodQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<FlowsStatsByPeriodQuery, FlowsStatsByPeriodQueryVariables>(
        FlowsStatsByPeriodDocument,
        options,
    );
}
export type FlowsStatsByPeriodQueryHookResult = ReturnType<typeof useFlowsStatsByPeriodQuery>;
export type FlowsStatsByPeriodLazyQueryHookResult = ReturnType<typeof useFlowsStatsByPeriodLazyQuery>;
export type FlowsStatsByPeriodSuspenseQueryHookResult = ReturnType<typeof useFlowsStatsByPeriodSuspenseQuery>;
export type FlowsStatsByPeriodQueryResult = Apollo.QueryResult<
    FlowsStatsByPeriodQuery,
    FlowsStatsByPeriodQueryVariables
>;
export const FlowStatsByFlowDocument = gql`
    query flowStatsByFlow($flowId: ID!) {
        flowStatsByFlow(flowId: $flowId) {
            ...flowStatsFragment
        }
    }
    ${FlowStatsFragmentFragmentDoc}
`;

/**
 * __useFlowStatsByFlowQuery__
 *
 * To run a query within a React component, call `useFlowStatsByFlowQuery` and pass it any options that fit your needs.
 * When your component renders, `useFlowStatsByFlowQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFlowStatsByFlowQuery({
 *   variables: {
 *      flowId: // value for 'flowId'
 *   },
 * });
 */
export function useFlowStatsByFlowQuery(
    baseOptions: Apollo.QueryHookOptions<FlowStatsByFlowQuery, FlowStatsByFlowQueryVariables> &
        ({ variables: FlowStatsByFlowQueryVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<FlowStatsByFlowQuery, FlowStatsByFlowQueryVariables>(FlowStatsByFlowDocument, options);
}
export function useFlowStatsByFlowLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<FlowStatsByFlowQuery, FlowStatsByFlowQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<FlowStatsByFlowQuery, FlowStatsByFlowQueryVariables>(FlowStatsByFlowDocument, options);
}
// @ts-ignore
export function useFlowStatsByFlowSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<FlowStatsByFlowQuery, FlowStatsByFlowQueryVariables>,
): Apollo.UseSuspenseQueryResult<FlowStatsByFlowQuery, FlowStatsByFlowQueryVariables>;
export function useFlowStatsByFlowSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<FlowStatsByFlowQuery, FlowStatsByFlowQueryVariables>,
): Apollo.UseSuspenseQueryResult<FlowStatsByFlowQuery | undefined, FlowStatsByFlowQueryVariables>;
export function useFlowStatsByFlowSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<FlowStatsByFlowQuery, FlowStatsByFlowQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<FlowStatsByFlowQuery, FlowStatsByFlowQueryVariables>(
        FlowStatsByFlowDocument,
        options,
    );
}
export type FlowStatsByFlowQueryHookResult = ReturnType<typeof useFlowStatsByFlowQuery>;
export type FlowStatsByFlowLazyQueryHookResult = ReturnType<typeof useFlowStatsByFlowLazyQuery>;
export type FlowStatsByFlowSuspenseQueryHookResult = ReturnType<typeof useFlowStatsByFlowSuspenseQuery>;
export type FlowStatsByFlowQueryResult = Apollo.QueryResult<FlowStatsByFlowQuery, FlowStatsByFlowQueryVariables>;
export const FlowsExecutionStatsByPeriodDocument = gql`
    query flowsExecutionStatsByPeriod($period: UsageStatsPeriod!) {
        flowsExecutionStatsByPeriod(period: $period) {
            ...flowExecutionStatsFragment
        }
    }
    ${FlowExecutionStatsFragmentFragmentDoc}
`;

/**
 * __useFlowsExecutionStatsByPeriodQuery__
 *
 * To run a query within a React component, call `useFlowsExecutionStatsByPeriodQuery` and pass it any options that fit your needs.
 * When your component renders, `useFlowsExecutionStatsByPeriodQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFlowsExecutionStatsByPeriodQuery({
 *   variables: {
 *      period: // value for 'period'
 *   },
 * });
 */
export function useFlowsExecutionStatsByPeriodQuery(
    baseOptions: Apollo.QueryHookOptions<FlowsExecutionStatsByPeriodQuery, FlowsExecutionStatsByPeriodQueryVariables> &
        ({ variables: FlowsExecutionStatsByPeriodQueryVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<FlowsExecutionStatsByPeriodQuery, FlowsExecutionStatsByPeriodQueryVariables>(
        FlowsExecutionStatsByPeriodDocument,
        options,
    );
}
export function useFlowsExecutionStatsByPeriodLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<
        FlowsExecutionStatsByPeriodQuery,
        FlowsExecutionStatsByPeriodQueryVariables
    >,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<FlowsExecutionStatsByPeriodQuery, FlowsExecutionStatsByPeriodQueryVariables>(
        FlowsExecutionStatsByPeriodDocument,
        options,
    );
}
// @ts-ignore
export function useFlowsExecutionStatsByPeriodSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<
        FlowsExecutionStatsByPeriodQuery,
        FlowsExecutionStatsByPeriodQueryVariables
    >,
): Apollo.UseSuspenseQueryResult<FlowsExecutionStatsByPeriodQuery, FlowsExecutionStatsByPeriodQueryVariables>;
export function useFlowsExecutionStatsByPeriodSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<FlowsExecutionStatsByPeriodQuery, FlowsExecutionStatsByPeriodQueryVariables>,
): Apollo.UseSuspenseQueryResult<
    FlowsExecutionStatsByPeriodQuery | undefined,
    FlowsExecutionStatsByPeriodQueryVariables
>;
export function useFlowsExecutionStatsByPeriodSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<FlowsExecutionStatsByPeriodQuery, FlowsExecutionStatsByPeriodQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<FlowsExecutionStatsByPeriodQuery, FlowsExecutionStatsByPeriodQueryVariables>(
        FlowsExecutionStatsByPeriodDocument,
        options,
    );
}
export type FlowsExecutionStatsByPeriodQueryHookResult = ReturnType<typeof useFlowsExecutionStatsByPeriodQuery>;
export type FlowsExecutionStatsByPeriodLazyQueryHookResult = ReturnType<typeof useFlowsExecutionStatsByPeriodLazyQuery>;
export type FlowsExecutionStatsByPeriodSuspenseQueryHookResult = ReturnType<
    typeof useFlowsExecutionStatsByPeriodSuspenseQuery
>;
export type FlowsExecutionStatsByPeriodQueryResult = Apollo.QueryResult<
    FlowsExecutionStatsByPeriodQuery,
    FlowsExecutionStatsByPeriodQueryVariables
>;
export const ApiTokensDocument = gql`
    query apiTokens {
        apiTokens {
            ...apiTokenFragment
        }
    }
    ${ApiTokenFragmentFragmentDoc}
`;

/**
 * __useApiTokensQuery__
 *
 * To run a query within a React component, call `useApiTokensQuery` and pass it any options that fit your needs.
 * When your component renders, `useApiTokensQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useApiTokensQuery({
 *   variables: {
 *   },
 * });
 */
export function useApiTokensQuery(baseOptions?: Apollo.QueryHookOptions<ApiTokensQuery, ApiTokensQueryVariables>) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<ApiTokensQuery, ApiTokensQueryVariables>(ApiTokensDocument, options);
}
export function useApiTokensLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<ApiTokensQuery, ApiTokensQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<ApiTokensQuery, ApiTokensQueryVariables>(ApiTokensDocument, options);
}
// @ts-ignore
export function useApiTokensSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<ApiTokensQuery, ApiTokensQueryVariables>,
): Apollo.UseSuspenseQueryResult<ApiTokensQuery, ApiTokensQueryVariables>;
export function useApiTokensSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ApiTokensQuery, ApiTokensQueryVariables>,
): Apollo.UseSuspenseQueryResult<ApiTokensQuery | undefined, ApiTokensQueryVariables>;
export function useApiTokensSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ApiTokensQuery, ApiTokensQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<ApiTokensQuery, ApiTokensQueryVariables>(ApiTokensDocument, options);
}
export type ApiTokensQueryHookResult = ReturnType<typeof useApiTokensQuery>;
export type ApiTokensLazyQueryHookResult = ReturnType<typeof useApiTokensLazyQuery>;
export type ApiTokensSuspenseQueryHookResult = ReturnType<typeof useApiTokensSuspenseQuery>;
export type ApiTokensQueryResult = Apollo.QueryResult<ApiTokensQuery, ApiTokensQueryVariables>;
export const ApiTokenDocument = gql`
    query apiToken($tokenId: String!) {
        apiToken(tokenId: $tokenId) {
            ...apiTokenFragment
        }
    }
    ${ApiTokenFragmentFragmentDoc}
`;

/**
 * __useApiTokenQuery__
 *
 * To run a query within a React component, call `useApiTokenQuery` and pass it any options that fit your needs.
 * When your component renders, `useApiTokenQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useApiTokenQuery({
 *   variables: {
 *      tokenId: // value for 'tokenId'
 *   },
 * });
 */
export function useApiTokenQuery(
    baseOptions: Apollo.QueryHookOptions<ApiTokenQuery, ApiTokenQueryVariables> &
        ({ variables: ApiTokenQueryVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<ApiTokenQuery, ApiTokenQueryVariables>(ApiTokenDocument, options);
}
export function useApiTokenLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ApiTokenQuery, ApiTokenQueryVariables>) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<ApiTokenQuery, ApiTokenQueryVariables>(ApiTokenDocument, options);
}
// @ts-ignore
export function useApiTokenSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<ApiTokenQuery, ApiTokenQueryVariables>,
): Apollo.UseSuspenseQueryResult<ApiTokenQuery, ApiTokenQueryVariables>;
export function useApiTokenSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ApiTokenQuery, ApiTokenQueryVariables>,
): Apollo.UseSuspenseQueryResult<ApiTokenQuery | undefined, ApiTokenQueryVariables>;
export function useApiTokenSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ApiTokenQuery, ApiTokenQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<ApiTokenQuery, ApiTokenQueryVariables>(ApiTokenDocument, options);
}
export type ApiTokenQueryHookResult = ReturnType<typeof useApiTokenQuery>;
export type ApiTokenLazyQueryHookResult = ReturnType<typeof useApiTokenLazyQuery>;
export type ApiTokenSuspenseQueryHookResult = ReturnType<typeof useApiTokenSuspenseQuery>;
export type ApiTokenQueryResult = Apollo.QueryResult<ApiTokenQuery, ApiTokenQueryVariables>;
export const SettingsUserDocument = gql`
    query settingsUser {
        settingsUser {
            ...userPreferencesFragment
        }
    }
    ${UserPreferencesFragmentFragmentDoc}
`;

/**
 * __useSettingsUserQuery__
 *
 * To run a query within a React component, call `useSettingsUserQuery` and pass it any options that fit your needs.
 * When your component renders, `useSettingsUserQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSettingsUserQuery({
 *   variables: {
 *   },
 * });
 */
export function useSettingsUserQuery(
    baseOptions?: Apollo.QueryHookOptions<SettingsUserQuery, SettingsUserQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<SettingsUserQuery, SettingsUserQueryVariables>(SettingsUserDocument, options);
}
export function useSettingsUserLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<SettingsUserQuery, SettingsUserQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<SettingsUserQuery, SettingsUserQueryVariables>(SettingsUserDocument, options);
}
// @ts-ignore
export function useSettingsUserSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<SettingsUserQuery, SettingsUserQueryVariables>,
): Apollo.UseSuspenseQueryResult<SettingsUserQuery, SettingsUserQueryVariables>;
export function useSettingsUserSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SettingsUserQuery, SettingsUserQueryVariables>,
): Apollo.UseSuspenseQueryResult<SettingsUserQuery | undefined, SettingsUserQueryVariables>;
export function useSettingsUserSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SettingsUserQuery, SettingsUserQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<SettingsUserQuery, SettingsUserQueryVariables>(SettingsUserDocument, options);
}
export type SettingsUserQueryHookResult = ReturnType<typeof useSettingsUserQuery>;
export type SettingsUserLazyQueryHookResult = ReturnType<typeof useSettingsUserLazyQuery>;
export type SettingsUserSuspenseQueryHookResult = ReturnType<typeof useSettingsUserSuspenseQuery>;
export type SettingsUserQueryResult = Apollo.QueryResult<SettingsUserQuery, SettingsUserQueryVariables>;
export const UpdateFindingCvssDocument = gql`
    mutation updateFindingCvss($taskId: ID, $assistantId: ID, $index: Int!, $expectedTitle: String!, $cvss: Float!) {
        updateFindingCvss(
            taskId: $taskId
            assistantId: $assistantId
            index: $index
            expectedTitle: $expectedTitle
            cvss: $cvss
        )
    }
`;
export type UpdateFindingCvssMutationFn = Apollo.MutationFunction<
    UpdateFindingCvssMutation,
    UpdateFindingCvssMutationVariables
>;

/**
 * __useUpdateFindingCvssMutation__
 *
 * To run a mutation, you first call `useUpdateFindingCvssMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateFindingCvssMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateFindingCvssMutation, { data, loading, error }] = useUpdateFindingCvssMutation({
 *   variables: {
 *      taskId: // value for 'taskId'
 *      assistantId: // value for 'assistantId'
 *      index: // value for 'index'
 *      expectedTitle: // value for 'expectedTitle'
 *      cvss: // value for 'cvss'
 *   },
 * });
 */
export function useUpdateFindingCvssMutation(
    baseOptions?: Apollo.MutationHookOptions<UpdateFindingCvssMutation, UpdateFindingCvssMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<UpdateFindingCvssMutation, UpdateFindingCvssMutationVariables>(
        UpdateFindingCvssDocument,
        options,
    );
}
export type UpdateFindingCvssMutationHookResult = ReturnType<typeof useUpdateFindingCvssMutation>;
export type UpdateFindingCvssMutationResult = Apollo.MutationResult<UpdateFindingCvssMutation>;
export type UpdateFindingCvssMutationOptions = Apollo.BaseMutationOptions<
    UpdateFindingCvssMutation,
    UpdateFindingCvssMutationVariables
>;
export const UpdateFindingSeverityDocument = gql`
    mutation updateFindingSeverity(
        $taskId: ID
        $assistantId: ID
        $index: Int!
        $expectedTitle: String!
        $severity: Severity!
    ) {
        updateFindingSeverity(
            taskId: $taskId
            assistantId: $assistantId
            index: $index
            expectedTitle: $expectedTitle
            severity: $severity
        )
    }
`;
export type UpdateFindingSeverityMutationFn = Apollo.MutationFunction<
    UpdateFindingSeverityMutation,
    UpdateFindingSeverityMutationVariables
>;

/**
 * __useUpdateFindingSeverityMutation__
 *
 * To run a mutation, you first call `useUpdateFindingSeverityMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateFindingSeverityMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateFindingSeverityMutation, { data, loading, error }] = useUpdateFindingSeverityMutation({
 *   variables: {
 *      taskId: // value for 'taskId'
 *      assistantId: // value for 'assistantId'
 *      index: // value for 'index'
 *      expectedTitle: // value for 'expectedTitle'
 *      severity: // value for 'severity'
 *   },
 * });
 */
export function useUpdateFindingSeverityMutation(
    baseOptions?: Apollo.MutationHookOptions<UpdateFindingSeverityMutation, UpdateFindingSeverityMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<UpdateFindingSeverityMutation, UpdateFindingSeverityMutationVariables>(
        UpdateFindingSeverityDocument,
        options,
    );
}
export type UpdateFindingSeverityMutationHookResult = ReturnType<typeof useUpdateFindingSeverityMutation>;
export type UpdateFindingSeverityMutationResult = Apollo.MutationResult<UpdateFindingSeverityMutation>;
export type UpdateFindingSeverityMutationOptions = Apollo.BaseMutationOptions<
    UpdateFindingSeverityMutation,
    UpdateFindingSeverityMutationVariables
>;
export const AddFavoriteFlowDocument = gql`
    mutation addFavoriteFlow($flowId: ID!) {
        addFavoriteFlow(flowId: $flowId)
    }
`;
export type AddFavoriteFlowMutationFn = Apollo.MutationFunction<
    AddFavoriteFlowMutation,
    AddFavoriteFlowMutationVariables
>;

/**
 * __useAddFavoriteFlowMutation__
 *
 * To run a mutation, you first call `useAddFavoriteFlowMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddFavoriteFlowMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addFavoriteFlowMutation, { data, loading, error }] = useAddFavoriteFlowMutation({
 *   variables: {
 *      flowId: // value for 'flowId'
 *   },
 * });
 */
export function useAddFavoriteFlowMutation(
    baseOptions?: Apollo.MutationHookOptions<AddFavoriteFlowMutation, AddFavoriteFlowMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<AddFavoriteFlowMutation, AddFavoriteFlowMutationVariables>(
        AddFavoriteFlowDocument,
        options,
    );
}
export type AddFavoriteFlowMutationHookResult = ReturnType<typeof useAddFavoriteFlowMutation>;
export type AddFavoriteFlowMutationResult = Apollo.MutationResult<AddFavoriteFlowMutation>;
export type AddFavoriteFlowMutationOptions = Apollo.BaseMutationOptions<
    AddFavoriteFlowMutation,
    AddFavoriteFlowMutationVariables
>;
export const DeleteFavoriteFlowDocument = gql`
    mutation deleteFavoriteFlow($flowId: ID!) {
        deleteFavoriteFlow(flowId: $flowId)
    }
`;
export type DeleteFavoriteFlowMutationFn = Apollo.MutationFunction<
    DeleteFavoriteFlowMutation,
    DeleteFavoriteFlowMutationVariables
>;

/**
 * __useDeleteFavoriteFlowMutation__
 *
 * To run a mutation, you first call `useDeleteFavoriteFlowMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteFavoriteFlowMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteFavoriteFlowMutation, { data, loading, error }] = useDeleteFavoriteFlowMutation({
 *   variables: {
 *      flowId: // value for 'flowId'
 *   },
 * });
 */
export function useDeleteFavoriteFlowMutation(
    baseOptions?: Apollo.MutationHookOptions<DeleteFavoriteFlowMutation, DeleteFavoriteFlowMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<DeleteFavoriteFlowMutation, DeleteFavoriteFlowMutationVariables>(
        DeleteFavoriteFlowDocument,
        options,
    );
}
export type DeleteFavoriteFlowMutationHookResult = ReturnType<typeof useDeleteFavoriteFlowMutation>;
export type DeleteFavoriteFlowMutationResult = Apollo.MutationResult<DeleteFavoriteFlowMutation>;
export type DeleteFavoriteFlowMutationOptions = Apollo.BaseMutationOptions<
    DeleteFavoriteFlowMutation,
    DeleteFavoriteFlowMutationVariables
>;
export const FlowTemplatesDocument = gql`
    query flowTemplates {
        flowTemplates {
            ...flowTemplateFragment
        }
    }
    ${FlowTemplateFragmentFragmentDoc}
`;

/**
 * __useFlowTemplatesQuery__
 *
 * To run a query within a React component, call `useFlowTemplatesQuery` and pass it any options that fit your needs.
 * When your component renders, `useFlowTemplatesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFlowTemplatesQuery({
 *   variables: {
 *   },
 * });
 */
export function useFlowTemplatesQuery(
    baseOptions?: Apollo.QueryHookOptions<FlowTemplatesQuery, FlowTemplatesQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<FlowTemplatesQuery, FlowTemplatesQueryVariables>(FlowTemplatesDocument, options);
}
export function useFlowTemplatesLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<FlowTemplatesQuery, FlowTemplatesQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<FlowTemplatesQuery, FlowTemplatesQueryVariables>(FlowTemplatesDocument, options);
}
// @ts-ignore
export function useFlowTemplatesSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<FlowTemplatesQuery, FlowTemplatesQueryVariables>,
): Apollo.UseSuspenseQueryResult<FlowTemplatesQuery, FlowTemplatesQueryVariables>;
export function useFlowTemplatesSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<FlowTemplatesQuery, FlowTemplatesQueryVariables>,
): Apollo.UseSuspenseQueryResult<FlowTemplatesQuery | undefined, FlowTemplatesQueryVariables>;
export function useFlowTemplatesSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<FlowTemplatesQuery, FlowTemplatesQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<FlowTemplatesQuery, FlowTemplatesQueryVariables>(FlowTemplatesDocument, options);
}
export type FlowTemplatesQueryHookResult = ReturnType<typeof useFlowTemplatesQuery>;
export type FlowTemplatesLazyQueryHookResult = ReturnType<typeof useFlowTemplatesLazyQuery>;
export type FlowTemplatesSuspenseQueryHookResult = ReturnType<typeof useFlowTemplatesSuspenseQuery>;
export type FlowTemplatesQueryResult = Apollo.QueryResult<FlowTemplatesQuery, FlowTemplatesQueryVariables>;
export const FlowTemplateDocument = gql`
    query flowTemplate($templateId: ID!) {
        flowTemplate(templateId: $templateId) {
            ...flowTemplateFragment
        }
    }
    ${FlowTemplateFragmentFragmentDoc}
`;

/**
 * __useFlowTemplateQuery__
 *
 * To run a query within a React component, call `useFlowTemplateQuery` and pass it any options that fit your needs.
 * When your component renders, `useFlowTemplateQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFlowTemplateQuery({
 *   variables: {
 *      templateId: // value for 'templateId'
 *   },
 * });
 */
export function useFlowTemplateQuery(
    baseOptions: Apollo.QueryHookOptions<FlowTemplateQuery, FlowTemplateQueryVariables> &
        ({ variables: FlowTemplateQueryVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<FlowTemplateQuery, FlowTemplateQueryVariables>(FlowTemplateDocument, options);
}
export function useFlowTemplateLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<FlowTemplateQuery, FlowTemplateQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<FlowTemplateQuery, FlowTemplateQueryVariables>(FlowTemplateDocument, options);
}
// @ts-ignore
export function useFlowTemplateSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<FlowTemplateQuery, FlowTemplateQueryVariables>,
): Apollo.UseSuspenseQueryResult<FlowTemplateQuery, FlowTemplateQueryVariables>;
export function useFlowTemplateSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<FlowTemplateQuery, FlowTemplateQueryVariables>,
): Apollo.UseSuspenseQueryResult<FlowTemplateQuery | undefined, FlowTemplateQueryVariables>;
export function useFlowTemplateSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<FlowTemplateQuery, FlowTemplateQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<FlowTemplateQuery, FlowTemplateQueryVariables>(FlowTemplateDocument, options);
}
export type FlowTemplateQueryHookResult = ReturnType<typeof useFlowTemplateQuery>;
export type FlowTemplateLazyQueryHookResult = ReturnType<typeof useFlowTemplateLazyQuery>;
export type FlowTemplateSuspenseQueryHookResult = ReturnType<typeof useFlowTemplateSuspenseQuery>;
export type FlowTemplateQueryResult = Apollo.QueryResult<FlowTemplateQuery, FlowTemplateQueryVariables>;
export const FlowTemplatesByTargetTypeDocument = gql`
    query flowTemplatesByTargetType($targetType: TargetType!) {
        flowTemplatesByTargetType(targetType: $targetType) {
            ...flowTemplateFragment
        }
    }
    ${FlowTemplateFragmentFragmentDoc}
`;

/**
 * __useFlowTemplatesByTargetTypeQuery__
 *
 * To run a query within a React component, call `useFlowTemplatesByTargetTypeQuery` and pass it any options that fit your needs.
 * When your component renders, `useFlowTemplatesByTargetTypeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFlowTemplatesByTargetTypeQuery({
 *   variables: {
 *      targetType: // value for 'targetType'
 *   },
 * });
 */
export function useFlowTemplatesByTargetTypeQuery(
    baseOptions: Apollo.QueryHookOptions<FlowTemplatesByTargetTypeQuery, FlowTemplatesByTargetTypeQueryVariables> &
        ({ variables: FlowTemplatesByTargetTypeQueryVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<FlowTemplatesByTargetTypeQuery, FlowTemplatesByTargetTypeQueryVariables>(
        FlowTemplatesByTargetTypeDocument,
        options,
    );
}
export function useFlowTemplatesByTargetTypeLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<FlowTemplatesByTargetTypeQuery, FlowTemplatesByTargetTypeQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<FlowTemplatesByTargetTypeQuery, FlowTemplatesByTargetTypeQueryVariables>(
        FlowTemplatesByTargetTypeDocument,
        options,
    );
}
// @ts-ignore
export function useFlowTemplatesByTargetTypeSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<
        FlowTemplatesByTargetTypeQuery,
        FlowTemplatesByTargetTypeQueryVariables
    >,
): Apollo.UseSuspenseQueryResult<FlowTemplatesByTargetTypeQuery, FlowTemplatesByTargetTypeQueryVariables>;
export function useFlowTemplatesByTargetTypeSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<FlowTemplatesByTargetTypeQuery, FlowTemplatesByTargetTypeQueryVariables>,
): Apollo.UseSuspenseQueryResult<FlowTemplatesByTargetTypeQuery | undefined, FlowTemplatesByTargetTypeQueryVariables>;
export function useFlowTemplatesByTargetTypeSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<FlowTemplatesByTargetTypeQuery, FlowTemplatesByTargetTypeQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<FlowTemplatesByTargetTypeQuery, FlowTemplatesByTargetTypeQueryVariables>(
        FlowTemplatesByTargetTypeDocument,
        options,
    );
}
export type FlowTemplatesByTargetTypeQueryHookResult = ReturnType<typeof useFlowTemplatesByTargetTypeQuery>;
export type FlowTemplatesByTargetTypeLazyQueryHookResult = ReturnType<typeof useFlowTemplatesByTargetTypeLazyQuery>;
export type FlowTemplatesByTargetTypeSuspenseQueryHookResult = ReturnType<
    typeof useFlowTemplatesByTargetTypeSuspenseQuery
>;
export type FlowTemplatesByTargetTypeQueryResult = Apollo.QueryResult<
    FlowTemplatesByTargetTypeQuery,
    FlowTemplatesByTargetTypeQueryVariables
>;
export const CreateFlowTemplateDocument = gql`
    mutation createFlowTemplate($input: CreateFlowTemplateInput!) {
        createFlowTemplate(input: $input) {
            ...flowTemplateFragment
        }
    }
    ${FlowTemplateFragmentFragmentDoc}
`;
export type CreateFlowTemplateMutationFn = Apollo.MutationFunction<
    CreateFlowTemplateMutation,
    CreateFlowTemplateMutationVariables
>;

/**
 * __useCreateFlowTemplateMutation__
 *
 * To run a mutation, you first call `useCreateFlowTemplateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateFlowTemplateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createFlowTemplateMutation, { data, loading, error }] = useCreateFlowTemplateMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateFlowTemplateMutation(
    baseOptions?: Apollo.MutationHookOptions<CreateFlowTemplateMutation, CreateFlowTemplateMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<CreateFlowTemplateMutation, CreateFlowTemplateMutationVariables>(
        CreateFlowTemplateDocument,
        options,
    );
}
export type CreateFlowTemplateMutationHookResult = ReturnType<typeof useCreateFlowTemplateMutation>;
export type CreateFlowTemplateMutationResult = Apollo.MutationResult<CreateFlowTemplateMutation>;
export type CreateFlowTemplateMutationOptions = Apollo.BaseMutationOptions<
    CreateFlowTemplateMutation,
    CreateFlowTemplateMutationVariables
>;
export const UpdateFlowTemplateDocument = gql`
    mutation updateFlowTemplate($templateId: ID!, $input: UpdateFlowTemplateInput!) {
        updateFlowTemplate(templateId: $templateId, input: $input) {
            ...flowTemplateFragment
        }
    }
    ${FlowTemplateFragmentFragmentDoc}
`;
export type UpdateFlowTemplateMutationFn = Apollo.MutationFunction<
    UpdateFlowTemplateMutation,
    UpdateFlowTemplateMutationVariables
>;

/**
 * __useUpdateFlowTemplateMutation__
 *
 * To run a mutation, you first call `useUpdateFlowTemplateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateFlowTemplateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateFlowTemplateMutation, { data, loading, error }] = useUpdateFlowTemplateMutation({
 *   variables: {
 *      templateId: // value for 'templateId'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateFlowTemplateMutation(
    baseOptions?: Apollo.MutationHookOptions<UpdateFlowTemplateMutation, UpdateFlowTemplateMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<UpdateFlowTemplateMutation, UpdateFlowTemplateMutationVariables>(
        UpdateFlowTemplateDocument,
        options,
    );
}
export type UpdateFlowTemplateMutationHookResult = ReturnType<typeof useUpdateFlowTemplateMutation>;
export type UpdateFlowTemplateMutationResult = Apollo.MutationResult<UpdateFlowTemplateMutation>;
export type UpdateFlowTemplateMutationOptions = Apollo.BaseMutationOptions<
    UpdateFlowTemplateMutation,
    UpdateFlowTemplateMutationVariables
>;
export const UpdateFlowTemplateTargetTypesDocument = gql`
    mutation updateFlowTemplateTargetTypes($templateId: ID!, $targetTypes: [TargetType!]!) {
        updateFlowTemplateTargetTypes(templateId: $templateId, targetTypes: $targetTypes) {
            ...flowTemplateFragment
        }
    }
    ${FlowTemplateFragmentFragmentDoc}
`;
export type UpdateFlowTemplateTargetTypesMutationFn = Apollo.MutationFunction<
    UpdateFlowTemplateTargetTypesMutation,
    UpdateFlowTemplateTargetTypesMutationVariables
>;

/**
 * __useUpdateFlowTemplateTargetTypesMutation__
 *
 * To run a mutation, you first call `useUpdateFlowTemplateTargetTypesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateFlowTemplateTargetTypesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateFlowTemplateTargetTypesMutation, { data, loading, error }] = useUpdateFlowTemplateTargetTypesMutation({
 *   variables: {
 *      templateId: // value for 'templateId'
 *      targetTypes: // value for 'targetTypes'
 *   },
 * });
 */
export function useUpdateFlowTemplateTargetTypesMutation(
    baseOptions?: Apollo.MutationHookOptions<
        UpdateFlowTemplateTargetTypesMutation,
        UpdateFlowTemplateTargetTypesMutationVariables
    >,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<UpdateFlowTemplateTargetTypesMutation, UpdateFlowTemplateTargetTypesMutationVariables>(
        UpdateFlowTemplateTargetTypesDocument,
        options,
    );
}
export type UpdateFlowTemplateTargetTypesMutationHookResult = ReturnType<
    typeof useUpdateFlowTemplateTargetTypesMutation
>;
export type UpdateFlowTemplateTargetTypesMutationResult = Apollo.MutationResult<UpdateFlowTemplateTargetTypesMutation>;
export type UpdateFlowTemplateTargetTypesMutationOptions = Apollo.BaseMutationOptions<
    UpdateFlowTemplateTargetTypesMutation,
    UpdateFlowTemplateTargetTypesMutationVariables
>;
export const DeleteFlowTemplateDocument = gql`
    mutation deleteFlowTemplate($templateId: ID!) {
        deleteFlowTemplate(templateId: $templateId)
    }
`;
export type DeleteFlowTemplateMutationFn = Apollo.MutationFunction<
    DeleteFlowTemplateMutation,
    DeleteFlowTemplateMutationVariables
>;

/**
 * __useDeleteFlowTemplateMutation__
 *
 * To run a mutation, you first call `useDeleteFlowTemplateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteFlowTemplateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteFlowTemplateMutation, { data, loading, error }] = useDeleteFlowTemplateMutation({
 *   variables: {
 *      templateId: // value for 'templateId'
 *   },
 * });
 */
export function useDeleteFlowTemplateMutation(
    baseOptions?: Apollo.MutationHookOptions<DeleteFlowTemplateMutation, DeleteFlowTemplateMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<DeleteFlowTemplateMutation, DeleteFlowTemplateMutationVariables>(
        DeleteFlowTemplateDocument,
        options,
    );
}
export type DeleteFlowTemplateMutationHookResult = ReturnType<typeof useDeleteFlowTemplateMutation>;
export type DeleteFlowTemplateMutationResult = Apollo.MutationResult<DeleteFlowTemplateMutation>;
export type DeleteFlowTemplateMutationOptions = Apollo.BaseMutationOptions<
    DeleteFlowTemplateMutation,
    DeleteFlowTemplateMutationVariables
>;
export const FlowTemplateRequestsDocument = gql`
    query flowTemplateRequests {
        flowTemplateRequests {
            ...flowTemplateRequestFragment
        }
    }
    ${FlowTemplateRequestFragmentFragmentDoc}
`;

/**
 * __useFlowTemplateRequestsQuery__
 *
 * To run a query within a React component, call `useFlowTemplateRequestsQuery` and pass it any options that fit your needs.
 * When your component renders, `useFlowTemplateRequestsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFlowTemplateRequestsQuery({
 *   variables: {
 *   },
 * });
 */
export function useFlowTemplateRequestsQuery(
    baseOptions?: Apollo.QueryHookOptions<FlowTemplateRequestsQuery, FlowTemplateRequestsQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<FlowTemplateRequestsQuery, FlowTemplateRequestsQueryVariables>(
        FlowTemplateRequestsDocument,
        options,
    );
}
export function useFlowTemplateRequestsLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<FlowTemplateRequestsQuery, FlowTemplateRequestsQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<FlowTemplateRequestsQuery, FlowTemplateRequestsQueryVariables>(
        FlowTemplateRequestsDocument,
        options,
    );
}
// @ts-ignore
export function useFlowTemplateRequestsSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<FlowTemplateRequestsQuery, FlowTemplateRequestsQueryVariables>,
): Apollo.UseSuspenseQueryResult<FlowTemplateRequestsQuery, FlowTemplateRequestsQueryVariables>;
export function useFlowTemplateRequestsSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<FlowTemplateRequestsQuery, FlowTemplateRequestsQueryVariables>,
): Apollo.UseSuspenseQueryResult<FlowTemplateRequestsQuery | undefined, FlowTemplateRequestsQueryVariables>;
export function useFlowTemplateRequestsSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<FlowTemplateRequestsQuery, FlowTemplateRequestsQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<FlowTemplateRequestsQuery, FlowTemplateRequestsQueryVariables>(
        FlowTemplateRequestsDocument,
        options,
    );
}
export type FlowTemplateRequestsQueryHookResult = ReturnType<typeof useFlowTemplateRequestsQuery>;
export type FlowTemplateRequestsLazyQueryHookResult = ReturnType<typeof useFlowTemplateRequestsLazyQuery>;
export type FlowTemplateRequestsSuspenseQueryHookResult = ReturnType<typeof useFlowTemplateRequestsSuspenseQuery>;
export type FlowTemplateRequestsQueryResult = Apollo.QueryResult<
    FlowTemplateRequestsQuery,
    FlowTemplateRequestsQueryVariables
>;
export const FlowTemplateRequestDocument = gql`
    query flowTemplateRequest($requestId: ID!) {
        flowTemplateRequest(requestId: $requestId) {
            ...flowTemplateRequestFragment
        }
    }
    ${FlowTemplateRequestFragmentFragmentDoc}
`;

/**
 * __useFlowTemplateRequestQuery__
 *
 * To run a query within a React component, call `useFlowTemplateRequestQuery` and pass it any options that fit your needs.
 * When your component renders, `useFlowTemplateRequestQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFlowTemplateRequestQuery({
 *   variables: {
 *      requestId: // value for 'requestId'
 *   },
 * });
 */
export function useFlowTemplateRequestQuery(
    baseOptions: Apollo.QueryHookOptions<FlowTemplateRequestQuery, FlowTemplateRequestQueryVariables> &
        ({ variables: FlowTemplateRequestQueryVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<FlowTemplateRequestQuery, FlowTemplateRequestQueryVariables>(
        FlowTemplateRequestDocument,
        options,
    );
}
export function useFlowTemplateRequestLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<FlowTemplateRequestQuery, FlowTemplateRequestQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<FlowTemplateRequestQuery, FlowTemplateRequestQueryVariables>(
        FlowTemplateRequestDocument,
        options,
    );
}
// @ts-ignore
export function useFlowTemplateRequestSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<FlowTemplateRequestQuery, FlowTemplateRequestQueryVariables>,
): Apollo.UseSuspenseQueryResult<FlowTemplateRequestQuery, FlowTemplateRequestQueryVariables>;
export function useFlowTemplateRequestSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<FlowTemplateRequestQuery, FlowTemplateRequestQueryVariables>,
): Apollo.UseSuspenseQueryResult<FlowTemplateRequestQuery | undefined, FlowTemplateRequestQueryVariables>;
export function useFlowTemplateRequestSuspenseQuery(
    baseOptions?:
        | Apollo.SkipToken
        | Apollo.SuspenseQueryHookOptions<FlowTemplateRequestQuery, FlowTemplateRequestQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<FlowTemplateRequestQuery, FlowTemplateRequestQueryVariables>(
        FlowTemplateRequestDocument,
        options,
    );
}
export type FlowTemplateRequestQueryHookResult = ReturnType<typeof useFlowTemplateRequestQuery>;
export type FlowTemplateRequestLazyQueryHookResult = ReturnType<typeof useFlowTemplateRequestLazyQuery>;
export type FlowTemplateRequestSuspenseQueryHookResult = ReturnType<typeof useFlowTemplateRequestSuspenseQuery>;
export type FlowTemplateRequestQueryResult = Apollo.QueryResult<
    FlowTemplateRequestQuery,
    FlowTemplateRequestQueryVariables
>;
export const SubmitFlowTemplateRequestDocument = gql`
    mutation submitFlowTemplateRequest($templateId: ID, $input: FlowTemplateRequestInput!) {
        submitFlowTemplateRequest(templateId: $templateId, input: $input) {
            ...flowTemplateRequestFragment
        }
    }
    ${FlowTemplateRequestFragmentFragmentDoc}
`;
export type SubmitFlowTemplateRequestMutationFn = Apollo.MutationFunction<
    SubmitFlowTemplateRequestMutation,
    SubmitFlowTemplateRequestMutationVariables
>;

/**
 * __useSubmitFlowTemplateRequestMutation__
 *
 * To run a mutation, you first call `useSubmitFlowTemplateRequestMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSubmitFlowTemplateRequestMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [submitFlowTemplateRequestMutation, { data, loading, error }] = useSubmitFlowTemplateRequestMutation({
 *   variables: {
 *      templateId: // value for 'templateId'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSubmitFlowTemplateRequestMutation(
    baseOptions?: Apollo.MutationHookOptions<
        SubmitFlowTemplateRequestMutation,
        SubmitFlowTemplateRequestMutationVariables
    >,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<SubmitFlowTemplateRequestMutation, SubmitFlowTemplateRequestMutationVariables>(
        SubmitFlowTemplateRequestDocument,
        options,
    );
}
export type SubmitFlowTemplateRequestMutationHookResult = ReturnType<typeof useSubmitFlowTemplateRequestMutation>;
export type SubmitFlowTemplateRequestMutationResult = Apollo.MutationResult<SubmitFlowTemplateRequestMutation>;
export type SubmitFlowTemplateRequestMutationOptions = Apollo.BaseMutationOptions<
    SubmitFlowTemplateRequestMutation,
    SubmitFlowTemplateRequestMutationVariables
>;
export const UpdateFlowTemplateRequestDocument = gql`
    mutation updateFlowTemplateRequest($requestId: ID!, $revision: Int!, $input: FlowTemplateRequestInput!) {
        updateFlowTemplateRequest(requestId: $requestId, revision: $revision, input: $input) {
            ...flowTemplateRequestFragment
        }
    }
    ${FlowTemplateRequestFragmentFragmentDoc}
`;
export type UpdateFlowTemplateRequestMutationFn = Apollo.MutationFunction<
    UpdateFlowTemplateRequestMutation,
    UpdateFlowTemplateRequestMutationVariables
>;

/**
 * __useUpdateFlowTemplateRequestMutation__
 *
 * To run a mutation, you first call `useUpdateFlowTemplateRequestMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateFlowTemplateRequestMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateFlowTemplateRequestMutation, { data, loading, error }] = useUpdateFlowTemplateRequestMutation({
 *   variables: {
 *      requestId: // value for 'requestId'
 *      revision: // value for 'revision'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateFlowTemplateRequestMutation(
    baseOptions?: Apollo.MutationHookOptions<
        UpdateFlowTemplateRequestMutation,
        UpdateFlowTemplateRequestMutationVariables
    >,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<UpdateFlowTemplateRequestMutation, UpdateFlowTemplateRequestMutationVariables>(
        UpdateFlowTemplateRequestDocument,
        options,
    );
}
export type UpdateFlowTemplateRequestMutationHookResult = ReturnType<typeof useUpdateFlowTemplateRequestMutation>;
export type UpdateFlowTemplateRequestMutationResult = Apollo.MutationResult<UpdateFlowTemplateRequestMutation>;
export type UpdateFlowTemplateRequestMutationOptions = Apollo.BaseMutationOptions<
    UpdateFlowTemplateRequestMutation,
    UpdateFlowTemplateRequestMutationVariables
>;
export const WithdrawFlowTemplateRequestDocument = gql`
    mutation withdrawFlowTemplateRequest($requestId: ID!) {
        withdrawFlowTemplateRequest(requestId: $requestId) {
            ...flowTemplateRequestFragment
        }
    }
    ${FlowTemplateRequestFragmentFragmentDoc}
`;
export type WithdrawFlowTemplateRequestMutationFn = Apollo.MutationFunction<
    WithdrawFlowTemplateRequestMutation,
    WithdrawFlowTemplateRequestMutationVariables
>;

/**
 * __useWithdrawFlowTemplateRequestMutation__
 *
 * To run a mutation, you first call `useWithdrawFlowTemplateRequestMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useWithdrawFlowTemplateRequestMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [withdrawFlowTemplateRequestMutation, { data, loading, error }] = useWithdrawFlowTemplateRequestMutation({
 *   variables: {
 *      requestId: // value for 'requestId'
 *   },
 * });
 */
export function useWithdrawFlowTemplateRequestMutation(
    baseOptions?: Apollo.MutationHookOptions<
        WithdrawFlowTemplateRequestMutation,
        WithdrawFlowTemplateRequestMutationVariables
    >,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<WithdrawFlowTemplateRequestMutation, WithdrawFlowTemplateRequestMutationVariables>(
        WithdrawFlowTemplateRequestDocument,
        options,
    );
}
export type WithdrawFlowTemplateRequestMutationHookResult = ReturnType<typeof useWithdrawFlowTemplateRequestMutation>;
export type WithdrawFlowTemplateRequestMutationResult = Apollo.MutationResult<WithdrawFlowTemplateRequestMutation>;
export type WithdrawFlowTemplateRequestMutationOptions = Apollo.BaseMutationOptions<
    WithdrawFlowTemplateRequestMutation,
    WithdrawFlowTemplateRequestMutationVariables
>;
export const ApproveFlowTemplateRequestDocument = gql`
    mutation approveFlowTemplateRequest($requestId: ID!, $revision: Int!, $templateVersion: Int, $note: String) {
        approveFlowTemplateRequest(
            requestId: $requestId
            revision: $revision
            templateVersion: $templateVersion
            note: $note
        ) {
            ...flowTemplateRequestFragment
        }
    }
    ${FlowTemplateRequestFragmentFragmentDoc}
`;
export type ApproveFlowTemplateRequestMutationFn = Apollo.MutationFunction<
    ApproveFlowTemplateRequestMutation,
    ApproveFlowTemplateRequestMutationVariables
>;

/**
 * __useApproveFlowTemplateRequestMutation__
 *
 * To run a mutation, you first call `useApproveFlowTemplateRequestMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useApproveFlowTemplateRequestMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [approveFlowTemplateRequestMutation, { data, loading, error }] = useApproveFlowTemplateRequestMutation({
 *   variables: {
 *      requestId: // value for 'requestId'
 *      revision: // value for 'revision'
 *      templateVersion: // value for 'templateVersion'
 *      note: // value for 'note'
 *   },
 * });
 */
export function useApproveFlowTemplateRequestMutation(
    baseOptions?: Apollo.MutationHookOptions<
        ApproveFlowTemplateRequestMutation,
        ApproveFlowTemplateRequestMutationVariables
    >,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<ApproveFlowTemplateRequestMutation, ApproveFlowTemplateRequestMutationVariables>(
        ApproveFlowTemplateRequestDocument,
        options,
    );
}
export type ApproveFlowTemplateRequestMutationHookResult = ReturnType<typeof useApproveFlowTemplateRequestMutation>;
export type ApproveFlowTemplateRequestMutationResult = Apollo.MutationResult<ApproveFlowTemplateRequestMutation>;
export type ApproveFlowTemplateRequestMutationOptions = Apollo.BaseMutationOptions<
    ApproveFlowTemplateRequestMutation,
    ApproveFlowTemplateRequestMutationVariables
>;
export const RejectFlowTemplateRequestDocument = gql`
    mutation rejectFlowTemplateRequest($requestId: ID!, $revision: Int!, $note: String!) {
        rejectFlowTemplateRequest(requestId: $requestId, revision: $revision, note: $note) {
            ...flowTemplateRequestFragment
        }
    }
    ${FlowTemplateRequestFragmentFragmentDoc}
`;
export type RejectFlowTemplateRequestMutationFn = Apollo.MutationFunction<
    RejectFlowTemplateRequestMutation,
    RejectFlowTemplateRequestMutationVariables
>;

/**
 * __useRejectFlowTemplateRequestMutation__
 *
 * To run a mutation, you first call `useRejectFlowTemplateRequestMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRejectFlowTemplateRequestMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [rejectFlowTemplateRequestMutation, { data, loading, error }] = useRejectFlowTemplateRequestMutation({
 *   variables: {
 *      requestId: // value for 'requestId'
 *      revision: // value for 'revision'
 *      note: // value for 'note'
 *   },
 * });
 */
export function useRejectFlowTemplateRequestMutation(
    baseOptions?: Apollo.MutationHookOptions<
        RejectFlowTemplateRequestMutation,
        RejectFlowTemplateRequestMutationVariables
    >,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<RejectFlowTemplateRequestMutation, RejectFlowTemplateRequestMutationVariables>(
        RejectFlowTemplateRequestDocument,
        options,
    );
}
export type RejectFlowTemplateRequestMutationHookResult = ReturnType<typeof useRejectFlowTemplateRequestMutation>;
export type RejectFlowTemplateRequestMutationResult = Apollo.MutationResult<RejectFlowTemplateRequestMutation>;
export type RejectFlowTemplateRequestMutationOptions = Apollo.BaseMutationOptions<
    RejectFlowTemplateRequestMutation,
    RejectFlowTemplateRequestMutationVariables
>;
export const CreateFlowDocument = gql`
    mutation createFlow($modelProvider: String, $input: String!) {
        createFlow(modelProvider: $modelProvider, input: $input) {
            ...flowFragment
        }
    }
    ${FlowFragmentFragmentDoc}
`;
export type CreateFlowMutationFn = Apollo.MutationFunction<CreateFlowMutation, CreateFlowMutationVariables>;

/**
 * __useCreateFlowMutation__
 *
 * To run a mutation, you first call `useCreateFlowMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateFlowMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createFlowMutation, { data, loading, error }] = useCreateFlowMutation({
 *   variables: {
 *      modelProvider: // value for 'modelProvider'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateFlowMutation(
    baseOptions?: Apollo.MutationHookOptions<CreateFlowMutation, CreateFlowMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<CreateFlowMutation, CreateFlowMutationVariables>(CreateFlowDocument, options);
}
export type CreateFlowMutationHookResult = ReturnType<typeof useCreateFlowMutation>;
export type CreateFlowMutationResult = Apollo.MutationResult<CreateFlowMutation>;
export type CreateFlowMutationOptions = Apollo.BaseMutationOptions<CreateFlowMutation, CreateFlowMutationVariables>;
export const DeleteFlowDocument = gql`
    mutation deleteFlow($flowId: ID!) {
        deleteFlow(flowId: $flowId)
    }
`;
export type DeleteFlowMutationFn = Apollo.MutationFunction<DeleteFlowMutation, DeleteFlowMutationVariables>;

/**
 * __useDeleteFlowMutation__
 *
 * To run a mutation, you first call `useDeleteFlowMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteFlowMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteFlowMutation, { data, loading, error }] = useDeleteFlowMutation({
 *   variables: {
 *      flowId: // value for 'flowId'
 *   },
 * });
 */
export function useDeleteFlowMutation(
    baseOptions?: Apollo.MutationHookOptions<DeleteFlowMutation, DeleteFlowMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<DeleteFlowMutation, DeleteFlowMutationVariables>(DeleteFlowDocument, options);
}
export type DeleteFlowMutationHookResult = ReturnType<typeof useDeleteFlowMutation>;
export type DeleteFlowMutationResult = Apollo.MutationResult<DeleteFlowMutation>;
export type DeleteFlowMutationOptions = Apollo.BaseMutationOptions<DeleteFlowMutation, DeleteFlowMutationVariables>;
export const PutUserInputDocument = gql`
    mutation putUserInput($flowId: ID!, $input: String!, $modelProvider: String) {
        putUserInput(flowId: $flowId, input: $input, modelProvider: $modelProvider)
    }
`;
export type PutUserInputMutationFn = Apollo.MutationFunction<PutUserInputMutation, PutUserInputMutationVariables>;

/**
 * __usePutUserInputMutation__
 *
 * To run a mutation, you first call `usePutUserInputMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePutUserInputMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [putUserInputMutation, { data, loading, error }] = usePutUserInputMutation({
 *   variables: {
 *      flowId: // value for 'flowId'
 *      input: // value for 'input'
 *      modelProvider: // value for 'modelProvider'
 *   },
 * });
 */
export function usePutUserInputMutation(
    baseOptions?: Apollo.MutationHookOptions<PutUserInputMutation, PutUserInputMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<PutUserInputMutation, PutUserInputMutationVariables>(PutUserInputDocument, options);
}
export type PutUserInputMutationHookResult = ReturnType<typeof usePutUserInputMutation>;
export type PutUserInputMutationResult = Apollo.MutationResult<PutUserInputMutation>;
export type PutUserInputMutationOptions = Apollo.BaseMutationOptions<
    PutUserInputMutation,
    PutUserInputMutationVariables
>;
export const FinishFlowDocument = gql`
    mutation finishFlow($flowId: ID!) {
        finishFlow(flowId: $flowId)
    }
`;
export type FinishFlowMutationFn = Apollo.MutationFunction<FinishFlowMutation, FinishFlowMutationVariables>;

/**
 * __useFinishFlowMutation__
 *
 * To run a mutation, you first call `useFinishFlowMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useFinishFlowMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [finishFlowMutation, { data, loading, error }] = useFinishFlowMutation({
 *   variables: {
 *      flowId: // value for 'flowId'
 *   },
 * });
 */
export function useFinishFlowMutation(
    baseOptions?: Apollo.MutationHookOptions<FinishFlowMutation, FinishFlowMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<FinishFlowMutation, FinishFlowMutationVariables>(FinishFlowDocument, options);
}
export type FinishFlowMutationHookResult = ReturnType<typeof useFinishFlowMutation>;
export type FinishFlowMutationResult = Apollo.MutationResult<FinishFlowMutation>;
export type FinishFlowMutationOptions = Apollo.BaseMutationOptions<FinishFlowMutation, FinishFlowMutationVariables>;
export const StopFlowDocument = gql`
    mutation stopFlow($flowId: ID!) {
        stopFlow(flowId: $flowId)
    }
`;
export type StopFlowMutationFn = Apollo.MutationFunction<StopFlowMutation, StopFlowMutationVariables>;

/**
 * __useStopFlowMutation__
 *
 * To run a mutation, you first call `useStopFlowMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useStopFlowMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [stopFlowMutation, { data, loading, error }] = useStopFlowMutation({
 *   variables: {
 *      flowId: // value for 'flowId'
 *   },
 * });
 */
export function useStopFlowMutation(
    baseOptions?: Apollo.MutationHookOptions<StopFlowMutation, StopFlowMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<StopFlowMutation, StopFlowMutationVariables>(StopFlowDocument, options);
}
export type StopFlowMutationHookResult = ReturnType<typeof useStopFlowMutation>;
export type StopFlowMutationResult = Apollo.MutationResult<StopFlowMutation>;
export type StopFlowMutationOptions = Apollo.BaseMutationOptions<StopFlowMutation, StopFlowMutationVariables>;
export const RenameFlowDocument = gql`
    mutation renameFlow($flowId: ID!, $title: String!) {
        renameFlow(flowId: $flowId, title: $title)
    }
`;
export type RenameFlowMutationFn = Apollo.MutationFunction<RenameFlowMutation, RenameFlowMutationVariables>;

/**
 * __useRenameFlowMutation__
 *
 * To run a mutation, you first call `useRenameFlowMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRenameFlowMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [renameFlowMutation, { data, loading, error }] = useRenameFlowMutation({
 *   variables: {
 *      flowId: // value for 'flowId'
 *      title: // value for 'title'
 *   },
 * });
 */
export function useRenameFlowMutation(
    baseOptions?: Apollo.MutationHookOptions<RenameFlowMutation, RenameFlowMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<RenameFlowMutation, RenameFlowMutationVariables>(RenameFlowDocument, options);
}
export type RenameFlowMutationHookResult = ReturnType<typeof useRenameFlowMutation>;
export type RenameFlowMutationResult = Apollo.MutationResult<RenameFlowMutation>;
export type RenameFlowMutationOptions = Apollo.BaseMutationOptions<RenameFlowMutation, RenameFlowMutationVariables>;
export const CreateAssistantDocument = gql`
    mutation createAssistant($flowId: ID!, $modelProvider: String, $input: String!, $useAgents: Boolean!) {
        createAssistant(flowId: $flowId, modelProvider: $modelProvider, input: $input, useAgents: $useAgents) {
            flow {
                ...flowFragment
            }
            assistant {
                ...assistantFragment
            }
        }
    }
    ${FlowFragmentFragmentDoc}
    ${AssistantFragmentFragmentDoc}
`;
export type CreateAssistantMutationFn = Apollo.MutationFunction<
    CreateAssistantMutation,
    CreateAssistantMutationVariables
>;

/**
 * __useCreateAssistantMutation__
 *
 * To run a mutation, you first call `useCreateAssistantMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateAssistantMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createAssistantMutation, { data, loading, error }] = useCreateAssistantMutation({
 *   variables: {
 *      flowId: // value for 'flowId'
 *      modelProvider: // value for 'modelProvider'
 *      input: // value for 'input'
 *      useAgents: // value for 'useAgents'
 *   },
 * });
 */
export function useCreateAssistantMutation(
    baseOptions?: Apollo.MutationHookOptions<CreateAssistantMutation, CreateAssistantMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<CreateAssistantMutation, CreateAssistantMutationVariables>(
        CreateAssistantDocument,
        options,
    );
}
export type CreateAssistantMutationHookResult = ReturnType<typeof useCreateAssistantMutation>;
export type CreateAssistantMutationResult = Apollo.MutationResult<CreateAssistantMutation>;
export type CreateAssistantMutationOptions = Apollo.BaseMutationOptions<
    CreateAssistantMutation,
    CreateAssistantMutationVariables
>;
export const CallAssistantDocument = gql`
    mutation callAssistant($flowId: ID!, $assistantId: ID!, $input: String!, $useAgents: Boolean!) {
        callAssistant(flowId: $flowId, assistantId: $assistantId, input: $input, useAgents: $useAgents)
    }
`;
export type CallAssistantMutationFn = Apollo.MutationFunction<CallAssistantMutation, CallAssistantMutationVariables>;

/**
 * __useCallAssistantMutation__
 *
 * To run a mutation, you first call `useCallAssistantMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCallAssistantMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [callAssistantMutation, { data, loading, error }] = useCallAssistantMutation({
 *   variables: {
 *      flowId: // value for 'flowId'
 *      assistantId: // value for 'assistantId'
 *      input: // value for 'input'
 *      useAgents: // value for 'useAgents'
 *   },
 * });
 */
export function useCallAssistantMutation(
    baseOptions?: Apollo.MutationHookOptions<CallAssistantMutation, CallAssistantMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<CallAssistantMutation, CallAssistantMutationVariables>(CallAssistantDocument, options);
}
export type CallAssistantMutationHookResult = ReturnType<typeof useCallAssistantMutation>;
export type CallAssistantMutationResult = Apollo.MutationResult<CallAssistantMutation>;
export type CallAssistantMutationOptions = Apollo.BaseMutationOptions<
    CallAssistantMutation,
    CallAssistantMutationVariables
>;
export const StopAssistantDocument = gql`
    mutation stopAssistant($flowId: ID!, $assistantId: ID!) {
        stopAssistant(flowId: $flowId, assistantId: $assistantId) {
            ...assistantFragment
        }
    }
    ${AssistantFragmentFragmentDoc}
`;
export type StopAssistantMutationFn = Apollo.MutationFunction<StopAssistantMutation, StopAssistantMutationVariables>;

/**
 * __useStopAssistantMutation__
 *
 * To run a mutation, you first call `useStopAssistantMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useStopAssistantMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [stopAssistantMutation, { data, loading, error }] = useStopAssistantMutation({
 *   variables: {
 *      flowId: // value for 'flowId'
 *      assistantId: // value for 'assistantId'
 *   },
 * });
 */
export function useStopAssistantMutation(
    baseOptions?: Apollo.MutationHookOptions<StopAssistantMutation, StopAssistantMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<StopAssistantMutation, StopAssistantMutationVariables>(StopAssistantDocument, options);
}
export type StopAssistantMutationHookResult = ReturnType<typeof useStopAssistantMutation>;
export type StopAssistantMutationResult = Apollo.MutationResult<StopAssistantMutation>;
export type StopAssistantMutationOptions = Apollo.BaseMutationOptions<
    StopAssistantMutation,
    StopAssistantMutationVariables
>;
export const DeleteAssistantDocument = gql`
    mutation deleteAssistant($flowId: ID!, $assistantId: ID!) {
        deleteAssistant(flowId: $flowId, assistantId: $assistantId)
    }
`;
export type DeleteAssistantMutationFn = Apollo.MutationFunction<
    DeleteAssistantMutation,
    DeleteAssistantMutationVariables
>;

/**
 * __useDeleteAssistantMutation__
 *
 * To run a mutation, you first call `useDeleteAssistantMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteAssistantMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteAssistantMutation, { data, loading, error }] = useDeleteAssistantMutation({
 *   variables: {
 *      flowId: // value for 'flowId'
 *      assistantId: // value for 'assistantId'
 *   },
 * });
 */
export function useDeleteAssistantMutation(
    baseOptions?: Apollo.MutationHookOptions<DeleteAssistantMutation, DeleteAssistantMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<DeleteAssistantMutation, DeleteAssistantMutationVariables>(
        DeleteAssistantDocument,
        options,
    );
}
export type DeleteAssistantMutationHookResult = ReturnType<typeof useDeleteAssistantMutation>;
export type DeleteAssistantMutationResult = Apollo.MutationResult<DeleteAssistantMutation>;
export type DeleteAssistantMutationOptions = Apollo.BaseMutationOptions<
    DeleteAssistantMutation,
    DeleteAssistantMutationVariables
>;
export const TestAgentDocument = gql`
    mutation testAgent($type: ProviderType!, $agentType: AgentConfigType!, $agent: AgentConfigInput!) {
        testAgent(type: $type, agentType: $agentType, agent: $agent) {
            ...agentTestResultFragment
        }
    }
    ${AgentTestResultFragmentFragmentDoc}
`;
export type TestAgentMutationFn = Apollo.MutationFunction<TestAgentMutation, TestAgentMutationVariables>;

/**
 * __useTestAgentMutation__
 *
 * To run a mutation, you first call `useTestAgentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useTestAgentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [testAgentMutation, { data, loading, error }] = useTestAgentMutation({
 *   variables: {
 *      type: // value for 'type'
 *      agentType: // value for 'agentType'
 *      agent: // value for 'agent'
 *   },
 * });
 */
export function useTestAgentMutation(
    baseOptions?: Apollo.MutationHookOptions<TestAgentMutation, TestAgentMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<TestAgentMutation, TestAgentMutationVariables>(TestAgentDocument, options);
}
export type TestAgentMutationHookResult = ReturnType<typeof useTestAgentMutation>;
export type TestAgentMutationResult = Apollo.MutationResult<TestAgentMutation>;
export type TestAgentMutationOptions = Apollo.BaseMutationOptions<TestAgentMutation, TestAgentMutationVariables>;
export const TestProviderDocument = gql`
    mutation testProvider($type: ProviderType!, $agents: AgentsConfigInput!) {
        testProvider(type: $type, agents: $agents) {
            ...providerTestResultFragment
        }
    }
    ${ProviderTestResultFragmentFragmentDoc}
`;
export type TestProviderMutationFn = Apollo.MutationFunction<TestProviderMutation, TestProviderMutationVariables>;

/**
 * __useTestProviderMutation__
 *
 * To run a mutation, you first call `useTestProviderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useTestProviderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [testProviderMutation, { data, loading, error }] = useTestProviderMutation({
 *   variables: {
 *      type: // value for 'type'
 *      agents: // value for 'agents'
 *   },
 * });
 */
export function useTestProviderMutation(
    baseOptions?: Apollo.MutationHookOptions<TestProviderMutation, TestProviderMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<TestProviderMutation, TestProviderMutationVariables>(TestProviderDocument, options);
}
export type TestProviderMutationHookResult = ReturnType<typeof useTestProviderMutation>;
export type TestProviderMutationResult = Apollo.MutationResult<TestProviderMutation>;
export type TestProviderMutationOptions = Apollo.BaseMutationOptions<
    TestProviderMutation,
    TestProviderMutationVariables
>;
export const CreateProviderDocument = gql`
    mutation createProvider($name: String!, $type: ProviderType!, $agents: AgentsConfigInput!) {
        createProvider(name: $name, type: $type, agents: $agents) {
            ...providerConfigFragment
        }
    }
    ${ProviderConfigFragmentFragmentDoc}
`;
export type CreateProviderMutationFn = Apollo.MutationFunction<CreateProviderMutation, CreateProviderMutationVariables>;

/**
 * __useCreateProviderMutation__
 *
 * To run a mutation, you first call `useCreateProviderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateProviderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createProviderMutation, { data, loading, error }] = useCreateProviderMutation({
 *   variables: {
 *      name: // value for 'name'
 *      type: // value for 'type'
 *      agents: // value for 'agents'
 *   },
 * });
 */
export function useCreateProviderMutation(
    baseOptions?: Apollo.MutationHookOptions<CreateProviderMutation, CreateProviderMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<CreateProviderMutation, CreateProviderMutationVariables>(CreateProviderDocument, options);
}
export type CreateProviderMutationHookResult = ReturnType<typeof useCreateProviderMutation>;
export type CreateProviderMutationResult = Apollo.MutationResult<CreateProviderMutation>;
export type CreateProviderMutationOptions = Apollo.BaseMutationOptions<
    CreateProviderMutation,
    CreateProviderMutationVariables
>;
export const UpdateProviderDocument = gql`
    mutation updateProvider($providerId: ID!, $name: String!, $agents: AgentsConfigInput!) {
        updateProvider(providerId: $providerId, name: $name, agents: $agents) {
            ...providerConfigFragment
        }
    }
    ${ProviderConfigFragmentFragmentDoc}
`;
export type UpdateProviderMutationFn = Apollo.MutationFunction<UpdateProviderMutation, UpdateProviderMutationVariables>;

/**
 * __useUpdateProviderMutation__
 *
 * To run a mutation, you first call `useUpdateProviderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateProviderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateProviderMutation, { data, loading, error }] = useUpdateProviderMutation({
 *   variables: {
 *      providerId: // value for 'providerId'
 *      name: // value for 'name'
 *      agents: // value for 'agents'
 *   },
 * });
 */
export function useUpdateProviderMutation(
    baseOptions?: Apollo.MutationHookOptions<UpdateProviderMutation, UpdateProviderMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<UpdateProviderMutation, UpdateProviderMutationVariables>(UpdateProviderDocument, options);
}
export type UpdateProviderMutationHookResult = ReturnType<typeof useUpdateProviderMutation>;
export type UpdateProviderMutationResult = Apollo.MutationResult<UpdateProviderMutation>;
export type UpdateProviderMutationOptions = Apollo.BaseMutationOptions<
    UpdateProviderMutation,
    UpdateProviderMutationVariables
>;
export const DeleteProviderDocument = gql`
    mutation deleteProvider($providerId: ID!) {
        deleteProvider(providerId: $providerId)
    }
`;
export type DeleteProviderMutationFn = Apollo.MutationFunction<DeleteProviderMutation, DeleteProviderMutationVariables>;

/**
 * __useDeleteProviderMutation__
 *
 * To run a mutation, you first call `useDeleteProviderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteProviderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteProviderMutation, { data, loading, error }] = useDeleteProviderMutation({
 *   variables: {
 *      providerId: // value for 'providerId'
 *   },
 * });
 */
export function useDeleteProviderMutation(
    baseOptions?: Apollo.MutationHookOptions<DeleteProviderMutation, DeleteProviderMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<DeleteProviderMutation, DeleteProviderMutationVariables>(DeleteProviderDocument, options);
}
export type DeleteProviderMutationHookResult = ReturnType<typeof useDeleteProviderMutation>;
export type DeleteProviderMutationResult = Apollo.MutationResult<DeleteProviderMutation>;
export type DeleteProviderMutationOptions = Apollo.BaseMutationOptions<
    DeleteProviderMutation,
    DeleteProviderMutationVariables
>;
export const SetDefaultProviderDocument = gql`
    mutation setDefaultProvider($providerId: ID!) {
        setDefaultProvider(providerId: $providerId) {
            ...providerConfigFragment
        }
    }
    ${ProviderConfigFragmentFragmentDoc}
`;
export type SetDefaultProviderMutationFn = Apollo.MutationFunction<
    SetDefaultProviderMutation,
    SetDefaultProviderMutationVariables
>;

/**
 * __useSetDefaultProviderMutation__
 *
 * To run a mutation, you first call `useSetDefaultProviderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetDefaultProviderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setDefaultProviderMutation, { data, loading, error }] = useSetDefaultProviderMutation({
 *   variables: {
 *      providerId: // value for 'providerId'
 *   },
 * });
 */
export function useSetDefaultProviderMutation(
    baseOptions?: Apollo.MutationHookOptions<SetDefaultProviderMutation, SetDefaultProviderMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<SetDefaultProviderMutation, SetDefaultProviderMutationVariables>(
        SetDefaultProviderDocument,
        options,
    );
}
export type SetDefaultProviderMutationHookResult = ReturnType<typeof useSetDefaultProviderMutation>;
export type SetDefaultProviderMutationResult = Apollo.MutationResult<SetDefaultProviderMutation>;
export type SetDefaultProviderMutationOptions = Apollo.BaseMutationOptions<
    SetDefaultProviderMutation,
    SetDefaultProviderMutationVariables
>;
export const ValidatePromptDocument = gql`
    mutation validatePrompt($type: PromptType!, $template: String!) {
        validatePrompt(type: $type, template: $template) {
            ...promptValidationResultFragment
        }
    }
    ${PromptValidationResultFragmentFragmentDoc}
`;
export type ValidatePromptMutationFn = Apollo.MutationFunction<ValidatePromptMutation, ValidatePromptMutationVariables>;

/**
 * __useValidatePromptMutation__
 *
 * To run a mutation, you first call `useValidatePromptMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useValidatePromptMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [validatePromptMutation, { data, loading, error }] = useValidatePromptMutation({
 *   variables: {
 *      type: // value for 'type'
 *      template: // value for 'template'
 *   },
 * });
 */
export function useValidatePromptMutation(
    baseOptions?: Apollo.MutationHookOptions<ValidatePromptMutation, ValidatePromptMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<ValidatePromptMutation, ValidatePromptMutationVariables>(ValidatePromptDocument, options);
}
export type ValidatePromptMutationHookResult = ReturnType<typeof useValidatePromptMutation>;
export type ValidatePromptMutationResult = Apollo.MutationResult<ValidatePromptMutation>;
export type ValidatePromptMutationOptions = Apollo.BaseMutationOptions<
    ValidatePromptMutation,
    ValidatePromptMutationVariables
>;
export const CreatePromptDocument = gql`
    mutation createPrompt($type: PromptType!, $template: String!) {
        createPrompt(type: $type, template: $template) {
            ...userPromptFragment
        }
    }
    ${UserPromptFragmentFragmentDoc}
`;
export type CreatePromptMutationFn = Apollo.MutationFunction<CreatePromptMutation, CreatePromptMutationVariables>;

/**
 * __useCreatePromptMutation__
 *
 * To run a mutation, you first call `useCreatePromptMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreatePromptMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createPromptMutation, { data, loading, error }] = useCreatePromptMutation({
 *   variables: {
 *      type: // value for 'type'
 *      template: // value for 'template'
 *   },
 * });
 */
export function useCreatePromptMutation(
    baseOptions?: Apollo.MutationHookOptions<CreatePromptMutation, CreatePromptMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<CreatePromptMutation, CreatePromptMutationVariables>(CreatePromptDocument, options);
}
export type CreatePromptMutationHookResult = ReturnType<typeof useCreatePromptMutation>;
export type CreatePromptMutationResult = Apollo.MutationResult<CreatePromptMutation>;
export type CreatePromptMutationOptions = Apollo.BaseMutationOptions<
    CreatePromptMutation,
    CreatePromptMutationVariables
>;
export const UpdatePromptDocument = gql`
    mutation updatePrompt($promptId: ID!, $template: String!) {
        updatePrompt(promptId: $promptId, template: $template) {
            ...userPromptFragment
        }
    }
    ${UserPromptFragmentFragmentDoc}
`;
export type UpdatePromptMutationFn = Apollo.MutationFunction<UpdatePromptMutation, UpdatePromptMutationVariables>;

/**
 * __useUpdatePromptMutation__
 *
 * To run a mutation, you first call `useUpdatePromptMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdatePromptMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updatePromptMutation, { data, loading, error }] = useUpdatePromptMutation({
 *   variables: {
 *      promptId: // value for 'promptId'
 *      template: // value for 'template'
 *   },
 * });
 */
export function useUpdatePromptMutation(
    baseOptions?: Apollo.MutationHookOptions<UpdatePromptMutation, UpdatePromptMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<UpdatePromptMutation, UpdatePromptMutationVariables>(UpdatePromptDocument, options);
}
export type UpdatePromptMutationHookResult = ReturnType<typeof useUpdatePromptMutation>;
export type UpdatePromptMutationResult = Apollo.MutationResult<UpdatePromptMutation>;
export type UpdatePromptMutationOptions = Apollo.BaseMutationOptions<
    UpdatePromptMutation,
    UpdatePromptMutationVariables
>;
export const DeletePromptDocument = gql`
    mutation deletePrompt($promptId: ID!) {
        deletePrompt(promptId: $promptId)
    }
`;
export type DeletePromptMutationFn = Apollo.MutationFunction<DeletePromptMutation, DeletePromptMutationVariables>;

/**
 * __useDeletePromptMutation__
 *
 * To run a mutation, you first call `useDeletePromptMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeletePromptMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deletePromptMutation, { data, loading, error }] = useDeletePromptMutation({
 *   variables: {
 *      promptId: // value for 'promptId'
 *   },
 * });
 */
export function useDeletePromptMutation(
    baseOptions?: Apollo.MutationHookOptions<DeletePromptMutation, DeletePromptMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<DeletePromptMutation, DeletePromptMutationVariables>(DeletePromptDocument, options);
}
export type DeletePromptMutationHookResult = ReturnType<typeof useDeletePromptMutation>;
export type DeletePromptMutationResult = Apollo.MutationResult<DeletePromptMutation>;
export type DeletePromptMutationOptions = Apollo.BaseMutationOptions<
    DeletePromptMutation,
    DeletePromptMutationVariables
>;
export const CreateApiTokenDocument = gql`
    mutation createAPIToken($input: CreateAPITokenInput!) {
        createAPIToken(input: $input) {
            ...apiTokenWithSecretFragment
        }
    }
    ${ApiTokenWithSecretFragmentFragmentDoc}
`;
export type CreateApiTokenMutationFn = Apollo.MutationFunction<CreateApiTokenMutation, CreateApiTokenMutationVariables>;

/**
 * __useCreateApiTokenMutation__
 *
 * To run a mutation, you first call `useCreateApiTokenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateApiTokenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createApiTokenMutation, { data, loading, error }] = useCreateApiTokenMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateApiTokenMutation(
    baseOptions?: Apollo.MutationHookOptions<CreateApiTokenMutation, CreateApiTokenMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<CreateApiTokenMutation, CreateApiTokenMutationVariables>(CreateApiTokenDocument, options);
}
export type CreateApiTokenMutationHookResult = ReturnType<typeof useCreateApiTokenMutation>;
export type CreateApiTokenMutationResult = Apollo.MutationResult<CreateApiTokenMutation>;
export type CreateApiTokenMutationOptions = Apollo.BaseMutationOptions<
    CreateApiTokenMutation,
    CreateApiTokenMutationVariables
>;
export const UpdateApiTokenDocument = gql`
    mutation updateAPIToken($tokenId: String!, $input: UpdateAPITokenInput!) {
        updateAPIToken(tokenId: $tokenId, input: $input) {
            ...apiTokenFragment
        }
    }
    ${ApiTokenFragmentFragmentDoc}
`;
export type UpdateApiTokenMutationFn = Apollo.MutationFunction<UpdateApiTokenMutation, UpdateApiTokenMutationVariables>;

/**
 * __useUpdateApiTokenMutation__
 *
 * To run a mutation, you first call `useUpdateApiTokenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateApiTokenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateApiTokenMutation, { data, loading, error }] = useUpdateApiTokenMutation({
 *   variables: {
 *      tokenId: // value for 'tokenId'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateApiTokenMutation(
    baseOptions?: Apollo.MutationHookOptions<UpdateApiTokenMutation, UpdateApiTokenMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<UpdateApiTokenMutation, UpdateApiTokenMutationVariables>(UpdateApiTokenDocument, options);
}
export type UpdateApiTokenMutationHookResult = ReturnType<typeof useUpdateApiTokenMutation>;
export type UpdateApiTokenMutationResult = Apollo.MutationResult<UpdateApiTokenMutation>;
export type UpdateApiTokenMutationOptions = Apollo.BaseMutationOptions<
    UpdateApiTokenMutation,
    UpdateApiTokenMutationVariables
>;
export const DeleteApiTokenDocument = gql`
    mutation deleteAPIToken($tokenId: String!) {
        deleteAPIToken(tokenId: $tokenId)
    }
`;
export type DeleteApiTokenMutationFn = Apollo.MutationFunction<DeleteApiTokenMutation, DeleteApiTokenMutationVariables>;

/**
 * __useDeleteApiTokenMutation__
 *
 * To run a mutation, you first call `useDeleteApiTokenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteApiTokenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteApiTokenMutation, { data, loading, error }] = useDeleteApiTokenMutation({
 *   variables: {
 *      tokenId: // value for 'tokenId'
 *   },
 * });
 */
export function useDeleteApiTokenMutation(
    baseOptions?: Apollo.MutationHookOptions<DeleteApiTokenMutation, DeleteApiTokenMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<DeleteApiTokenMutation, DeleteApiTokenMutationVariables>(DeleteApiTokenDocument, options);
}
export type DeleteApiTokenMutationHookResult = ReturnType<typeof useDeleteApiTokenMutation>;
export type DeleteApiTokenMutationResult = Apollo.MutationResult<DeleteApiTokenMutation>;
export type DeleteApiTokenMutationOptions = Apollo.BaseMutationOptions<
    DeleteApiTokenMutation,
    DeleteApiTokenMutationVariables
>;
export const TerminalLogAddedDocument = gql`
    subscription terminalLogAdded($flowId: ID!) {
        terminalLogAdded(flowId: $flowId) {
            ...terminalLogFragment
        }
    }
    ${TerminalLogFragmentFragmentDoc}
`;

/**
 * __useTerminalLogAddedSubscription__
 *
 * To run a query within a React component, call `useTerminalLogAddedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useTerminalLogAddedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTerminalLogAddedSubscription({
 *   variables: {
 *      flowId: // value for 'flowId'
 *   },
 * });
 */
export function useTerminalLogAddedSubscription(
    baseOptions: Apollo.SubscriptionHookOptions<TerminalLogAddedSubscription, TerminalLogAddedSubscriptionVariables> &
        ({ variables: TerminalLogAddedSubscriptionVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<TerminalLogAddedSubscription, TerminalLogAddedSubscriptionVariables>(
        TerminalLogAddedDocument,
        options,
    );
}
export type TerminalLogAddedSubscriptionHookResult = ReturnType<typeof useTerminalLogAddedSubscription>;
export type TerminalLogAddedSubscriptionResult = Apollo.SubscriptionResult<TerminalLogAddedSubscription>;
export const MessageLogAddedDocument = gql`
    subscription messageLogAdded($flowId: ID!) {
        messageLogAdded(flowId: $flowId) {
            ...messageLogFragment
        }
    }
    ${MessageLogFragmentFragmentDoc}
`;

/**
 * __useMessageLogAddedSubscription__
 *
 * To run a query within a React component, call `useMessageLogAddedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useMessageLogAddedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMessageLogAddedSubscription({
 *   variables: {
 *      flowId: // value for 'flowId'
 *   },
 * });
 */
export function useMessageLogAddedSubscription(
    baseOptions: Apollo.SubscriptionHookOptions<MessageLogAddedSubscription, MessageLogAddedSubscriptionVariables> &
        ({ variables: MessageLogAddedSubscriptionVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<MessageLogAddedSubscription, MessageLogAddedSubscriptionVariables>(
        MessageLogAddedDocument,
        options,
    );
}
export type MessageLogAddedSubscriptionHookResult = ReturnType<typeof useMessageLogAddedSubscription>;
export type MessageLogAddedSubscriptionResult = Apollo.SubscriptionResult<MessageLogAddedSubscription>;
export const MessageLogUpdatedDocument = gql`
    subscription messageLogUpdated($flowId: ID!) {
        messageLogUpdated(flowId: $flowId) {
            ...messageLogFragment
        }
    }
    ${MessageLogFragmentFragmentDoc}
`;

/**
 * __useMessageLogUpdatedSubscription__
 *
 * To run a query within a React component, call `useMessageLogUpdatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useMessageLogUpdatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMessageLogUpdatedSubscription({
 *   variables: {
 *      flowId: // value for 'flowId'
 *   },
 * });
 */
export function useMessageLogUpdatedSubscription(
    baseOptions: Apollo.SubscriptionHookOptions<MessageLogUpdatedSubscription, MessageLogUpdatedSubscriptionVariables> &
        ({ variables: MessageLogUpdatedSubscriptionVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<MessageLogUpdatedSubscription, MessageLogUpdatedSubscriptionVariables>(
        MessageLogUpdatedDocument,
        options,
    );
}
export type MessageLogUpdatedSubscriptionHookResult = ReturnType<typeof useMessageLogUpdatedSubscription>;
export type MessageLogUpdatedSubscriptionResult = Apollo.SubscriptionResult<MessageLogUpdatedSubscription>;
export const ScreenshotAddedDocument = gql`
    subscription screenshotAdded($flowId: ID!) {
        screenshotAdded(flowId: $flowId) {
            ...screenshotFragment
        }
    }
    ${ScreenshotFragmentFragmentDoc}
`;

/**
 * __useScreenshotAddedSubscription__
 *
 * To run a query within a React component, call `useScreenshotAddedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useScreenshotAddedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useScreenshotAddedSubscription({
 *   variables: {
 *      flowId: // value for 'flowId'
 *   },
 * });
 */
export function useScreenshotAddedSubscription(
    baseOptions: Apollo.SubscriptionHookOptions<ScreenshotAddedSubscription, ScreenshotAddedSubscriptionVariables> &
        ({ variables: ScreenshotAddedSubscriptionVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<ScreenshotAddedSubscription, ScreenshotAddedSubscriptionVariables>(
        ScreenshotAddedDocument,
        options,
    );
}
export type ScreenshotAddedSubscriptionHookResult = ReturnType<typeof useScreenshotAddedSubscription>;
export type ScreenshotAddedSubscriptionResult = Apollo.SubscriptionResult<ScreenshotAddedSubscription>;
export const AgentLogAddedDocument = gql`
    subscription agentLogAdded($flowId: ID!) {
        agentLogAdded(flowId: $flowId) {
            ...agentLogFragment
        }
    }
    ${AgentLogFragmentFragmentDoc}
`;

/**
 * __useAgentLogAddedSubscription__
 *
 * To run a query within a React component, call `useAgentLogAddedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useAgentLogAddedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAgentLogAddedSubscription({
 *   variables: {
 *      flowId: // value for 'flowId'
 *   },
 * });
 */
export function useAgentLogAddedSubscription(
    baseOptions: Apollo.SubscriptionHookOptions<AgentLogAddedSubscription, AgentLogAddedSubscriptionVariables> &
        ({ variables: AgentLogAddedSubscriptionVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<AgentLogAddedSubscription, AgentLogAddedSubscriptionVariables>(
        AgentLogAddedDocument,
        options,
    );
}
export type AgentLogAddedSubscriptionHookResult = ReturnType<typeof useAgentLogAddedSubscription>;
export type AgentLogAddedSubscriptionResult = Apollo.SubscriptionResult<AgentLogAddedSubscription>;
export const SearchLogAddedDocument = gql`
    subscription searchLogAdded($flowId: ID!) {
        searchLogAdded(flowId: $flowId) {
            ...searchLogFragment
        }
    }
    ${SearchLogFragmentFragmentDoc}
`;

/**
 * __useSearchLogAddedSubscription__
 *
 * To run a query within a React component, call `useSearchLogAddedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useSearchLogAddedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchLogAddedSubscription({
 *   variables: {
 *      flowId: // value for 'flowId'
 *   },
 * });
 */
export function useSearchLogAddedSubscription(
    baseOptions: Apollo.SubscriptionHookOptions<SearchLogAddedSubscription, SearchLogAddedSubscriptionVariables> &
        ({ variables: SearchLogAddedSubscriptionVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<SearchLogAddedSubscription, SearchLogAddedSubscriptionVariables>(
        SearchLogAddedDocument,
        options,
    );
}
export type SearchLogAddedSubscriptionHookResult = ReturnType<typeof useSearchLogAddedSubscription>;
export type SearchLogAddedSubscriptionResult = Apollo.SubscriptionResult<SearchLogAddedSubscription>;
export const VectorStoreLogAddedDocument = gql`
    subscription vectorStoreLogAdded($flowId: ID!) {
        vectorStoreLogAdded(flowId: $flowId) {
            ...vectorStoreLogFragment
        }
    }
    ${VectorStoreLogFragmentFragmentDoc}
`;

/**
 * __useVectorStoreLogAddedSubscription__
 *
 * To run a query within a React component, call `useVectorStoreLogAddedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useVectorStoreLogAddedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useVectorStoreLogAddedSubscription({
 *   variables: {
 *      flowId: // value for 'flowId'
 *   },
 * });
 */
export function useVectorStoreLogAddedSubscription(
    baseOptions: Apollo.SubscriptionHookOptions<
        VectorStoreLogAddedSubscription,
        VectorStoreLogAddedSubscriptionVariables
    > &
        ({ variables: VectorStoreLogAddedSubscriptionVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<VectorStoreLogAddedSubscription, VectorStoreLogAddedSubscriptionVariables>(
        VectorStoreLogAddedDocument,
        options,
    );
}
export type VectorStoreLogAddedSubscriptionHookResult = ReturnType<typeof useVectorStoreLogAddedSubscription>;
export type VectorStoreLogAddedSubscriptionResult = Apollo.SubscriptionResult<VectorStoreLogAddedSubscription>;
export const AssistantCreatedDocument = gql`
    subscription assistantCreated($flowId: ID!) {
        assistantCreated(flowId: $flowId) {
            ...assistantFragment
        }
    }
    ${AssistantFragmentFragmentDoc}
`;

/**
 * __useAssistantCreatedSubscription__
 *
 * To run a query within a React component, call `useAssistantCreatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useAssistantCreatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAssistantCreatedSubscription({
 *   variables: {
 *      flowId: // value for 'flowId'
 *   },
 * });
 */
export function useAssistantCreatedSubscription(
    baseOptions: Apollo.SubscriptionHookOptions<AssistantCreatedSubscription, AssistantCreatedSubscriptionVariables> &
        ({ variables: AssistantCreatedSubscriptionVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<AssistantCreatedSubscription, AssistantCreatedSubscriptionVariables>(
        AssistantCreatedDocument,
        options,
    );
}
export type AssistantCreatedSubscriptionHookResult = ReturnType<typeof useAssistantCreatedSubscription>;
export type AssistantCreatedSubscriptionResult = Apollo.SubscriptionResult<AssistantCreatedSubscription>;
export const AssistantUpdatedDocument = gql`
    subscription assistantUpdated($flowId: ID!) {
        assistantUpdated(flowId: $flowId) {
            ...assistantFragment
        }
    }
    ${AssistantFragmentFragmentDoc}
`;

/**
 * __useAssistantUpdatedSubscription__
 *
 * To run a query within a React component, call `useAssistantUpdatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useAssistantUpdatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAssistantUpdatedSubscription({
 *   variables: {
 *      flowId: // value for 'flowId'
 *   },
 * });
 */
export function useAssistantUpdatedSubscription(
    baseOptions: Apollo.SubscriptionHookOptions<AssistantUpdatedSubscription, AssistantUpdatedSubscriptionVariables> &
        ({ variables: AssistantUpdatedSubscriptionVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<AssistantUpdatedSubscription, AssistantUpdatedSubscriptionVariables>(
        AssistantUpdatedDocument,
        options,
    );
}
export type AssistantUpdatedSubscriptionHookResult = ReturnType<typeof useAssistantUpdatedSubscription>;
export type AssistantUpdatedSubscriptionResult = Apollo.SubscriptionResult<AssistantUpdatedSubscription>;
export const AssistantDeletedDocument = gql`
    subscription assistantDeleted($flowId: ID!) {
        assistantDeleted(flowId: $flowId) {
            ...assistantFragment
        }
    }
    ${AssistantFragmentFragmentDoc}
`;

/**
 * __useAssistantDeletedSubscription__
 *
 * To run a query within a React component, call `useAssistantDeletedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useAssistantDeletedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAssistantDeletedSubscription({
 *   variables: {
 *      flowId: // value for 'flowId'
 *   },
 * });
 */
export function useAssistantDeletedSubscription(
    baseOptions: Apollo.SubscriptionHookOptions<AssistantDeletedSubscription, AssistantDeletedSubscriptionVariables> &
        ({ variables: AssistantDeletedSubscriptionVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<AssistantDeletedSubscription, AssistantDeletedSubscriptionVariables>(
        AssistantDeletedDocument,
        options,
    );
}
export type AssistantDeletedSubscriptionHookResult = ReturnType<typeof useAssistantDeletedSubscription>;
export type AssistantDeletedSubscriptionResult = Apollo.SubscriptionResult<AssistantDeletedSubscription>;
export const AssistantLogAddedDocument = gql`
    subscription assistantLogAdded($flowId: ID!) {
        assistantLogAdded(flowId: $flowId) {
            ...assistantLogFragment
        }
    }
    ${AssistantLogFragmentFragmentDoc}
`;

/**
 * __useAssistantLogAddedSubscription__
 *
 * To run a query within a React component, call `useAssistantLogAddedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useAssistantLogAddedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAssistantLogAddedSubscription({
 *   variables: {
 *      flowId: // value for 'flowId'
 *   },
 * });
 */
export function useAssistantLogAddedSubscription(
    baseOptions: Apollo.SubscriptionHookOptions<AssistantLogAddedSubscription, AssistantLogAddedSubscriptionVariables> &
        ({ variables: AssistantLogAddedSubscriptionVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<AssistantLogAddedSubscription, AssistantLogAddedSubscriptionVariables>(
        AssistantLogAddedDocument,
        options,
    );
}
export type AssistantLogAddedSubscriptionHookResult = ReturnType<typeof useAssistantLogAddedSubscription>;
export type AssistantLogAddedSubscriptionResult = Apollo.SubscriptionResult<AssistantLogAddedSubscription>;
export const AssistantLogUpdatedDocument = gql`
    subscription assistantLogUpdated($flowId: ID!) {
        assistantLogUpdated(flowId: $flowId) {
            ...assistantLogFragment
        }
    }
    ${AssistantLogFragmentFragmentDoc}
`;

/**
 * __useAssistantLogUpdatedSubscription__
 *
 * To run a query within a React component, call `useAssistantLogUpdatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useAssistantLogUpdatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAssistantLogUpdatedSubscription({
 *   variables: {
 *      flowId: // value for 'flowId'
 *   },
 * });
 */
export function useAssistantLogUpdatedSubscription(
    baseOptions: Apollo.SubscriptionHookOptions<
        AssistantLogUpdatedSubscription,
        AssistantLogUpdatedSubscriptionVariables
    > &
        ({ variables: AssistantLogUpdatedSubscriptionVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<AssistantLogUpdatedSubscription, AssistantLogUpdatedSubscriptionVariables>(
        AssistantLogUpdatedDocument,
        options,
    );
}
export type AssistantLogUpdatedSubscriptionHookResult = ReturnType<typeof useAssistantLogUpdatedSubscription>;
export type AssistantLogUpdatedSubscriptionResult = Apollo.SubscriptionResult<AssistantLogUpdatedSubscription>;
export const FlowCreatedDocument = gql`
    subscription flowCreated {
        flowCreated {
            ...flowFragment
        }
    }
    ${FlowFragmentFragmentDoc}
`;

/**
 * __useFlowCreatedSubscription__
 *
 * To run a query within a React component, call `useFlowCreatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useFlowCreatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFlowCreatedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useFlowCreatedSubscription(
    baseOptions?: Apollo.SubscriptionHookOptions<FlowCreatedSubscription, FlowCreatedSubscriptionVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<FlowCreatedSubscription, FlowCreatedSubscriptionVariables>(
        FlowCreatedDocument,
        options,
    );
}
export type FlowCreatedSubscriptionHookResult = ReturnType<typeof useFlowCreatedSubscription>;
export type FlowCreatedSubscriptionResult = Apollo.SubscriptionResult<FlowCreatedSubscription>;
export const FlowDeletedDocument = gql`
    subscription flowDeleted {
        flowDeleted {
            ...flowFragment
        }
    }
    ${FlowFragmentFragmentDoc}
`;

/**
 * __useFlowDeletedSubscription__
 *
 * To run a query within a React component, call `useFlowDeletedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useFlowDeletedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFlowDeletedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useFlowDeletedSubscription(
    baseOptions?: Apollo.SubscriptionHookOptions<FlowDeletedSubscription, FlowDeletedSubscriptionVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<FlowDeletedSubscription, FlowDeletedSubscriptionVariables>(
        FlowDeletedDocument,
        options,
    );
}
export type FlowDeletedSubscriptionHookResult = ReturnType<typeof useFlowDeletedSubscription>;
export type FlowDeletedSubscriptionResult = Apollo.SubscriptionResult<FlowDeletedSubscription>;
export const FlowUpdatedDocument = gql`
    subscription flowUpdated {
        flowUpdated {
            ...flowFragment
        }
    }
    ${FlowFragmentFragmentDoc}
`;

/**
 * __useFlowUpdatedSubscription__
 *
 * To run a query within a React component, call `useFlowUpdatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useFlowUpdatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFlowUpdatedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useFlowUpdatedSubscription(
    baseOptions?: Apollo.SubscriptionHookOptions<FlowUpdatedSubscription, FlowUpdatedSubscriptionVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<FlowUpdatedSubscription, FlowUpdatedSubscriptionVariables>(
        FlowUpdatedDocument,
        options,
    );
}
export type FlowUpdatedSubscriptionHookResult = ReturnType<typeof useFlowUpdatedSubscription>;
export type FlowUpdatedSubscriptionResult = Apollo.SubscriptionResult<FlowUpdatedSubscription>;
export const TaskCreatedDocument = gql`
    subscription taskCreated($flowId: ID!) {
        taskCreated(flowId: $flowId) {
            ...taskFragment
        }
    }
    ${TaskFragmentFragmentDoc}
`;

/**
 * __useTaskCreatedSubscription__
 *
 * To run a query within a React component, call `useTaskCreatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useTaskCreatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTaskCreatedSubscription({
 *   variables: {
 *      flowId: // value for 'flowId'
 *   },
 * });
 */
export function useTaskCreatedSubscription(
    baseOptions: Apollo.SubscriptionHookOptions<TaskCreatedSubscription, TaskCreatedSubscriptionVariables> &
        ({ variables: TaskCreatedSubscriptionVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<TaskCreatedSubscription, TaskCreatedSubscriptionVariables>(
        TaskCreatedDocument,
        options,
    );
}
export type TaskCreatedSubscriptionHookResult = ReturnType<typeof useTaskCreatedSubscription>;
export type TaskCreatedSubscriptionResult = Apollo.SubscriptionResult<TaskCreatedSubscription>;
export const TaskUpdatedDocument = gql`
    subscription taskUpdated($flowId: ID!) {
        taskUpdated(flowId: $flowId) {
            id
            status
            result
            subtasks {
                ...subtaskFragment
            }
            updatedAt
        }
    }
    ${SubtaskFragmentFragmentDoc}
`;

/**
 * __useTaskUpdatedSubscription__
 *
 * To run a query within a React component, call `useTaskUpdatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useTaskUpdatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTaskUpdatedSubscription({
 *   variables: {
 *      flowId: // value for 'flowId'
 *   },
 * });
 */
export function useTaskUpdatedSubscription(
    baseOptions: Apollo.SubscriptionHookOptions<TaskUpdatedSubscription, TaskUpdatedSubscriptionVariables> &
        ({ variables: TaskUpdatedSubscriptionVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<TaskUpdatedSubscription, TaskUpdatedSubscriptionVariables>(
        TaskUpdatedDocument,
        options,
    );
}
export type TaskUpdatedSubscriptionHookResult = ReturnType<typeof useTaskUpdatedSubscription>;
export type TaskUpdatedSubscriptionResult = Apollo.SubscriptionResult<TaskUpdatedSubscription>;
export const ProviderCreatedDocument = gql`
    subscription providerCreated {
        providerCreated {
            ...providerConfigFragment
        }
    }
    ${ProviderConfigFragmentFragmentDoc}
`;

/**
 * __useProviderCreatedSubscription__
 *
 * To run a query within a React component, call `useProviderCreatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useProviderCreatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProviderCreatedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useProviderCreatedSubscription(
    baseOptions?: Apollo.SubscriptionHookOptions<ProviderCreatedSubscription, ProviderCreatedSubscriptionVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<ProviderCreatedSubscription, ProviderCreatedSubscriptionVariables>(
        ProviderCreatedDocument,
        options,
    );
}
export type ProviderCreatedSubscriptionHookResult = ReturnType<typeof useProviderCreatedSubscription>;
export type ProviderCreatedSubscriptionResult = Apollo.SubscriptionResult<ProviderCreatedSubscription>;
export const ProviderUpdatedDocument = gql`
    subscription providerUpdated {
        providerUpdated {
            ...providerConfigFragment
        }
    }
    ${ProviderConfigFragmentFragmentDoc}
`;

/**
 * __useProviderUpdatedSubscription__
 *
 * To run a query within a React component, call `useProviderUpdatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useProviderUpdatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProviderUpdatedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useProviderUpdatedSubscription(
    baseOptions?: Apollo.SubscriptionHookOptions<ProviderUpdatedSubscription, ProviderUpdatedSubscriptionVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<ProviderUpdatedSubscription, ProviderUpdatedSubscriptionVariables>(
        ProviderUpdatedDocument,
        options,
    );
}
export type ProviderUpdatedSubscriptionHookResult = ReturnType<typeof useProviderUpdatedSubscription>;
export type ProviderUpdatedSubscriptionResult = Apollo.SubscriptionResult<ProviderUpdatedSubscription>;
export const ProviderDeletedDocument = gql`
    subscription providerDeleted {
        providerDeleted {
            ...providerConfigFragment
        }
    }
    ${ProviderConfigFragmentFragmentDoc}
`;

/**
 * __useProviderDeletedSubscription__
 *
 * To run a query within a React component, call `useProviderDeletedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useProviderDeletedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProviderDeletedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useProviderDeletedSubscription(
    baseOptions?: Apollo.SubscriptionHookOptions<ProviderDeletedSubscription, ProviderDeletedSubscriptionVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<ProviderDeletedSubscription, ProviderDeletedSubscriptionVariables>(
        ProviderDeletedDocument,
        options,
    );
}
export type ProviderDeletedSubscriptionHookResult = ReturnType<typeof useProviderDeletedSubscription>;
export type ProviderDeletedSubscriptionResult = Apollo.SubscriptionResult<ProviderDeletedSubscription>;
export const ApiTokenCreatedDocument = gql`
    subscription apiTokenCreated {
        apiTokenCreated {
            ...apiTokenFragment
        }
    }
    ${ApiTokenFragmentFragmentDoc}
`;

/**
 * __useApiTokenCreatedSubscription__
 *
 * To run a query within a React component, call `useApiTokenCreatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useApiTokenCreatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useApiTokenCreatedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useApiTokenCreatedSubscription(
    baseOptions?: Apollo.SubscriptionHookOptions<ApiTokenCreatedSubscription, ApiTokenCreatedSubscriptionVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<ApiTokenCreatedSubscription, ApiTokenCreatedSubscriptionVariables>(
        ApiTokenCreatedDocument,
        options,
    );
}
export type ApiTokenCreatedSubscriptionHookResult = ReturnType<typeof useApiTokenCreatedSubscription>;
export type ApiTokenCreatedSubscriptionResult = Apollo.SubscriptionResult<ApiTokenCreatedSubscription>;
export const ApiTokenUpdatedDocument = gql`
    subscription apiTokenUpdated {
        apiTokenUpdated {
            ...apiTokenFragment
        }
    }
    ${ApiTokenFragmentFragmentDoc}
`;

/**
 * __useApiTokenUpdatedSubscription__
 *
 * To run a query within a React component, call `useApiTokenUpdatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useApiTokenUpdatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useApiTokenUpdatedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useApiTokenUpdatedSubscription(
    baseOptions?: Apollo.SubscriptionHookOptions<ApiTokenUpdatedSubscription, ApiTokenUpdatedSubscriptionVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<ApiTokenUpdatedSubscription, ApiTokenUpdatedSubscriptionVariables>(
        ApiTokenUpdatedDocument,
        options,
    );
}
export type ApiTokenUpdatedSubscriptionHookResult = ReturnType<typeof useApiTokenUpdatedSubscription>;
export type ApiTokenUpdatedSubscriptionResult = Apollo.SubscriptionResult<ApiTokenUpdatedSubscription>;
export const ApiTokenDeletedDocument = gql`
    subscription apiTokenDeleted {
        apiTokenDeleted {
            ...apiTokenFragment
        }
    }
    ${ApiTokenFragmentFragmentDoc}
`;

/**
 * __useApiTokenDeletedSubscription__
 *
 * To run a query within a React component, call `useApiTokenDeletedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useApiTokenDeletedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useApiTokenDeletedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useApiTokenDeletedSubscription(
    baseOptions?: Apollo.SubscriptionHookOptions<ApiTokenDeletedSubscription, ApiTokenDeletedSubscriptionVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<ApiTokenDeletedSubscription, ApiTokenDeletedSubscriptionVariables>(
        ApiTokenDeletedDocument,
        options,
    );
}
export type ApiTokenDeletedSubscriptionHookResult = ReturnType<typeof useApiTokenDeletedSubscription>;
export type ApiTokenDeletedSubscriptionResult = Apollo.SubscriptionResult<ApiTokenDeletedSubscription>;
export const SettingsUserUpdatedDocument = gql`
    subscription settingsUserUpdated {
        settingsUserUpdated {
            ...userPreferencesFragment
        }
    }
    ${UserPreferencesFragmentFragmentDoc}
`;

/**
 * __useSettingsUserUpdatedSubscription__
 *
 * To run a query within a React component, call `useSettingsUserUpdatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useSettingsUserUpdatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSettingsUserUpdatedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useSettingsUserUpdatedSubscription(
    baseOptions?: Apollo.SubscriptionHookOptions<
        SettingsUserUpdatedSubscription,
        SettingsUserUpdatedSubscriptionVariables
    >,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<SettingsUserUpdatedSubscription, SettingsUserUpdatedSubscriptionVariables>(
        SettingsUserUpdatedDocument,
        options,
    );
}
export type SettingsUserUpdatedSubscriptionHookResult = ReturnType<typeof useSettingsUserUpdatedSubscription>;
export type SettingsUserUpdatedSubscriptionResult = Apollo.SubscriptionResult<SettingsUserUpdatedSubscription>;
export const FlowTemplateCreatedDocument = gql`
    subscription flowTemplateCreated {
        flowTemplateCreated {
            ...flowTemplateFragment
        }
    }
    ${FlowTemplateFragmentFragmentDoc}
`;

/**
 * __useFlowTemplateCreatedSubscription__
 *
 * To run a query within a React component, call `useFlowTemplateCreatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useFlowTemplateCreatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFlowTemplateCreatedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useFlowTemplateCreatedSubscription(
    baseOptions?: Apollo.SubscriptionHookOptions<
        FlowTemplateCreatedSubscription,
        FlowTemplateCreatedSubscriptionVariables
    >,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<FlowTemplateCreatedSubscription, FlowTemplateCreatedSubscriptionVariables>(
        FlowTemplateCreatedDocument,
        options,
    );
}
export type FlowTemplateCreatedSubscriptionHookResult = ReturnType<typeof useFlowTemplateCreatedSubscription>;
export type FlowTemplateCreatedSubscriptionResult = Apollo.SubscriptionResult<FlowTemplateCreatedSubscription>;
export const FlowTemplateUpdatedDocument = gql`
    subscription flowTemplateUpdated {
        flowTemplateUpdated {
            ...flowTemplateFragment
        }
    }
    ${FlowTemplateFragmentFragmentDoc}
`;

/**
 * __useFlowTemplateUpdatedSubscription__
 *
 * To run a query within a React component, call `useFlowTemplateUpdatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useFlowTemplateUpdatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFlowTemplateUpdatedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useFlowTemplateUpdatedSubscription(
    baseOptions?: Apollo.SubscriptionHookOptions<
        FlowTemplateUpdatedSubscription,
        FlowTemplateUpdatedSubscriptionVariables
    >,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<FlowTemplateUpdatedSubscription, FlowTemplateUpdatedSubscriptionVariables>(
        FlowTemplateUpdatedDocument,
        options,
    );
}
export type FlowTemplateUpdatedSubscriptionHookResult = ReturnType<typeof useFlowTemplateUpdatedSubscription>;
export type FlowTemplateUpdatedSubscriptionResult = Apollo.SubscriptionResult<FlowTemplateUpdatedSubscription>;
export const FlowTemplateDeletedDocument = gql`
    subscription flowTemplateDeleted {
        flowTemplateDeleted {
            ...flowTemplateFragment
        }
    }
    ${FlowTemplateFragmentFragmentDoc}
`;

/**
 * __useFlowTemplateDeletedSubscription__
 *
 * To run a query within a React component, call `useFlowTemplateDeletedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useFlowTemplateDeletedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFlowTemplateDeletedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useFlowTemplateDeletedSubscription(
    baseOptions?: Apollo.SubscriptionHookOptions<
        FlowTemplateDeletedSubscription,
        FlowTemplateDeletedSubscriptionVariables
    >,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<FlowTemplateDeletedSubscription, FlowTemplateDeletedSubscriptionVariables>(
        FlowTemplateDeletedDocument,
        options,
    );
}
export type FlowTemplateDeletedSubscriptionHookResult = ReturnType<typeof useFlowTemplateDeletedSubscription>;
export type FlowTemplateDeletedSubscriptionResult = Apollo.SubscriptionResult<FlowTemplateDeletedSubscription>;
export const FlowTemplateRequestCreatedDocument = gql`
    subscription flowTemplateRequestCreated {
        flowTemplateRequestCreated {
            ...flowTemplateRequestFragment
        }
    }
    ${FlowTemplateRequestFragmentFragmentDoc}
`;

/**
 * __useFlowTemplateRequestCreatedSubscription__
 *
 * To run a query within a React component, call `useFlowTemplateRequestCreatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useFlowTemplateRequestCreatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFlowTemplateRequestCreatedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useFlowTemplateRequestCreatedSubscription(
    baseOptions?: Apollo.SubscriptionHookOptions<
        FlowTemplateRequestCreatedSubscription,
        FlowTemplateRequestCreatedSubscriptionVariables
    >,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<
        FlowTemplateRequestCreatedSubscription,
        FlowTemplateRequestCreatedSubscriptionVariables
    >(FlowTemplateRequestCreatedDocument, options);
}
export type FlowTemplateRequestCreatedSubscriptionHookResult = ReturnType<
    typeof useFlowTemplateRequestCreatedSubscription
>;
export type FlowTemplateRequestCreatedSubscriptionResult =
    Apollo.SubscriptionResult<FlowTemplateRequestCreatedSubscription>;
export const FlowTemplateRequestUpdatedDocument = gql`
    subscription flowTemplateRequestUpdated {
        flowTemplateRequestUpdated {
            ...flowTemplateRequestFragment
        }
    }
    ${FlowTemplateRequestFragmentFragmentDoc}
`;

/**
 * __useFlowTemplateRequestUpdatedSubscription__
 *
 * To run a query within a React component, call `useFlowTemplateRequestUpdatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useFlowTemplateRequestUpdatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFlowTemplateRequestUpdatedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useFlowTemplateRequestUpdatedSubscription(
    baseOptions?: Apollo.SubscriptionHookOptions<
        FlowTemplateRequestUpdatedSubscription,
        FlowTemplateRequestUpdatedSubscriptionVariables
    >,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<
        FlowTemplateRequestUpdatedSubscription,
        FlowTemplateRequestUpdatedSubscriptionVariables
    >(FlowTemplateRequestUpdatedDocument, options);
}
export type FlowTemplateRequestUpdatedSubscriptionHookResult = ReturnType<
    typeof useFlowTemplateRequestUpdatedSubscription
>;
export type FlowTemplateRequestUpdatedSubscriptionResult =
    Apollo.SubscriptionResult<FlowTemplateRequestUpdatedSubscription>;
export const DomainsDocument = gql`
    query domains {
        domains {
            ...domainFragment
        }
    }
    ${DomainFragmentFragmentDoc}
`;

/**
 * __useDomainsQuery__
 *
 * To run a query within a React component, call `useDomainsQuery` and pass it any options that fit your needs.
 * When your component renders, `useDomainsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDomainsQuery({
 *   variables: {
 *   },
 * });
 */
export function useDomainsQuery(baseOptions?: Apollo.QueryHookOptions<DomainsQuery, DomainsQueryVariables>) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<DomainsQuery, DomainsQueryVariables>(DomainsDocument, options);
}
export function useDomainsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DomainsQuery, DomainsQueryVariables>) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<DomainsQuery, DomainsQueryVariables>(DomainsDocument, options);
}
// @ts-ignore
export function useDomainsSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<DomainsQuery, DomainsQueryVariables>,
): Apollo.UseSuspenseQueryResult<DomainsQuery, DomainsQueryVariables>;
export function useDomainsSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<DomainsQuery, DomainsQueryVariables>,
): Apollo.UseSuspenseQueryResult<DomainsQuery | undefined, DomainsQueryVariables>;
export function useDomainsSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<DomainsQuery, DomainsQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<DomainsQuery, DomainsQueryVariables>(DomainsDocument, options);
}
export type DomainsQueryHookResult = ReturnType<typeof useDomainsQuery>;
export type DomainsLazyQueryHookResult = ReturnType<typeof useDomainsLazyQuery>;
export type DomainsSuspenseQueryHookResult = ReturnType<typeof useDomainsSuspenseQuery>;
export type DomainsQueryResult = Apollo.QueryResult<DomainsQuery, DomainsQueryVariables>;
export const DomainDocument = gql`
    query domain($id: ID!) {
        domain(id: $id) {
            ...domainFragment
            flows {
                ...flowFragment
                findings {
                    severity
                }
            }
        }
    }
    ${DomainFragmentFragmentDoc}
    ${FlowFragmentFragmentDoc}
`;

/**
 * __useDomainQuery__
 *
 * To run a query within a React component, call `useDomainQuery` and pass it any options that fit your needs.
 * When your component renders, `useDomainQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDomainQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDomainQuery(
    baseOptions: Apollo.QueryHookOptions<DomainQuery, DomainQueryVariables> &
        ({ variables: DomainQueryVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<DomainQuery, DomainQueryVariables>(DomainDocument, options);
}
export function useDomainLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DomainQuery, DomainQueryVariables>) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<DomainQuery, DomainQueryVariables>(DomainDocument, options);
}
// @ts-ignore
export function useDomainSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<DomainQuery, DomainQueryVariables>,
): Apollo.UseSuspenseQueryResult<DomainQuery, DomainQueryVariables>;
export function useDomainSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<DomainQuery, DomainQueryVariables>,
): Apollo.UseSuspenseQueryResult<DomainQuery | undefined, DomainQueryVariables>;
export function useDomainSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<DomainQuery, DomainQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<DomainQuery, DomainQueryVariables>(DomainDocument, options);
}
export type DomainQueryHookResult = ReturnType<typeof useDomainQuery>;
export type DomainLazyQueryHookResult = ReturnType<typeof useDomainLazyQuery>;
export type DomainSuspenseQueryHookResult = ReturnType<typeof useDomainSuspenseQuery>;
export type DomainQueryResult = Apollo.QueryResult<DomainQuery, DomainQueryVariables>;
export const QuotaUsageDocument = gql`
    query quotaUsage {
        quotaUsage {
            flowsCurrent
            flowsMax
            domainsCurrent
            domainsMax
            flowsPerDomainMax
        }
    }
`;

/**
 * __useQuotaUsageQuery__
 *
 * To run a query within a React component, call `useQuotaUsageQuery` and pass it any options that fit your needs.
 * When your component renders, `useQuotaUsageQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useQuotaUsageQuery({
 *   variables: {
 *   },
 * });
 */
export function useQuotaUsageQuery(baseOptions?: Apollo.QueryHookOptions<QuotaUsageQuery, QuotaUsageQueryVariables>) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<QuotaUsageQuery, QuotaUsageQueryVariables>(QuotaUsageDocument, options);
}
export function useQuotaUsageLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<QuotaUsageQuery, QuotaUsageQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<QuotaUsageQuery, QuotaUsageQueryVariables>(QuotaUsageDocument, options);
}
// @ts-ignore
export function useQuotaUsageSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<QuotaUsageQuery, QuotaUsageQueryVariables>,
): Apollo.UseSuspenseQueryResult<QuotaUsageQuery, QuotaUsageQueryVariables>;
export function useQuotaUsageSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<QuotaUsageQuery, QuotaUsageQueryVariables>,
): Apollo.UseSuspenseQueryResult<QuotaUsageQuery | undefined, QuotaUsageQueryVariables>;
export function useQuotaUsageSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<QuotaUsageQuery, QuotaUsageQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<QuotaUsageQuery, QuotaUsageQueryVariables>(QuotaUsageDocument, options);
}
export type QuotaUsageQueryHookResult = ReturnType<typeof useQuotaUsageQuery>;
export type QuotaUsageLazyQueryHookResult = ReturnType<typeof useQuotaUsageLazyQuery>;
export type QuotaUsageSuspenseQueryHookResult = ReturnType<typeof useQuotaUsageSuspenseQuery>;
export type QuotaUsageQueryResult = Apollo.QueryResult<QuotaUsageQuery, QuotaUsageQueryVariables>;
export const CreateDomainDocument = gql`
    mutation createDomain($input: CreateDomainInput!) {
        createDomain(input: $input) {
            ...domainFragment
        }
    }
    ${DomainFragmentFragmentDoc}
`;
export type CreateDomainMutationFn = Apollo.MutationFunction<CreateDomainMutation, CreateDomainMutationVariables>;

/**
 * __useCreateDomainMutation__
 *
 * To run a mutation, you first call `useCreateDomainMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateDomainMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createDomainMutation, { data, loading, error }] = useCreateDomainMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateDomainMutation(
    baseOptions?: Apollo.MutationHookOptions<CreateDomainMutation, CreateDomainMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<CreateDomainMutation, CreateDomainMutationVariables>(CreateDomainDocument, options);
}
export type CreateDomainMutationHookResult = ReturnType<typeof useCreateDomainMutation>;
export type CreateDomainMutationResult = Apollo.MutationResult<CreateDomainMutation>;
export type CreateDomainMutationOptions = Apollo.BaseMutationOptions<
    CreateDomainMutation,
    CreateDomainMutationVariables
>;
export const CheckTargetDocument = gql`
    query checkTarget($target: String!) {
        checkTarget(target: $target) {
            input
            ok
            kind
            outcome
            message
            host
            port
            service
            cloudProvider
            cloudAccountId
            httpStatus
            steps {
                name
                status
                detail
            }
        }
    }
`;

/**
 * __useCheckTargetQuery__
 *
 * To run a query within a React component, call `useCheckTargetQuery` and pass it any options that fit your needs.
 * When your component renders, `useCheckTargetQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCheckTargetQuery({
 *   variables: {
 *      target: // value for 'target'
 *   },
 * });
 */
export function useCheckTargetQuery(
    baseOptions: Apollo.QueryHookOptions<CheckTargetQuery, CheckTargetQueryVariables> &
        ({ variables: CheckTargetQueryVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<CheckTargetQuery, CheckTargetQueryVariables>(CheckTargetDocument, options);
}
export function useCheckTargetLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<CheckTargetQuery, CheckTargetQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<CheckTargetQuery, CheckTargetQueryVariables>(CheckTargetDocument, options);
}
// @ts-ignore
export function useCheckTargetSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<CheckTargetQuery, CheckTargetQueryVariables>,
): Apollo.UseSuspenseQueryResult<CheckTargetQuery, CheckTargetQueryVariables>;
export function useCheckTargetSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CheckTargetQuery, CheckTargetQueryVariables>,
): Apollo.UseSuspenseQueryResult<CheckTargetQuery | undefined, CheckTargetQueryVariables>;
export function useCheckTargetSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CheckTargetQuery, CheckTargetQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<CheckTargetQuery, CheckTargetQueryVariables>(CheckTargetDocument, options);
}
export type CheckTargetQueryHookResult = ReturnType<typeof useCheckTargetQuery>;
export type CheckTargetLazyQueryHookResult = ReturnType<typeof useCheckTargetLazyQuery>;
export type CheckTargetSuspenseQueryHookResult = ReturnType<typeof useCheckTargetSuspenseQuery>;
export type CheckTargetQueryResult = Apollo.QueryResult<CheckTargetQuery, CheckTargetQueryVariables>;
export const CreateScanDocument = gql`
    mutation createScan($input: CreateScanInput!) {
        createScan(input: $input) {
            ...domainFragment
        }
    }
    ${DomainFragmentFragmentDoc}
`;
export type CreateScanMutationFn = Apollo.MutationFunction<CreateScanMutation, CreateScanMutationVariables>;

/**
 * __useCreateScanMutation__
 *
 * To run a mutation, you first call `useCreateScanMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateScanMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createScanMutation, { data, loading, error }] = useCreateScanMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateScanMutation(
    baseOptions?: Apollo.MutationHookOptions<CreateScanMutation, CreateScanMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<CreateScanMutation, CreateScanMutationVariables>(CreateScanDocument, options);
}
export type CreateScanMutationHookResult = ReturnType<typeof useCreateScanMutation>;
export type CreateScanMutationResult = Apollo.MutationResult<CreateScanMutation>;
export type CreateScanMutationOptions = Apollo.BaseMutationOptions<CreateScanMutation, CreateScanMutationVariables>;
export const DeleteDomainDocument = gql`
    mutation deleteDomain($id: ID!) {
        deleteDomain(id: $id)
    }
`;
export type DeleteDomainMutationFn = Apollo.MutationFunction<DeleteDomainMutation, DeleteDomainMutationVariables>;

/**
 * __useDeleteDomainMutation__
 *
 * To run a mutation, you first call `useDeleteDomainMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteDomainMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteDomainMutation, { data, loading, error }] = useDeleteDomainMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteDomainMutation(
    baseOptions?: Apollo.MutationHookOptions<DeleteDomainMutation, DeleteDomainMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<DeleteDomainMutation, DeleteDomainMutationVariables>(DeleteDomainDocument, options);
}
export type DeleteDomainMutationHookResult = ReturnType<typeof useDeleteDomainMutation>;
export type DeleteDomainMutationResult = Apollo.MutationResult<DeleteDomainMutation>;
export type DeleteDomainMutationOptions = Apollo.BaseMutationOptions<
    DeleteDomainMutation,
    DeleteDomainMutationVariables
>;
export const DomainCreatedDocument = gql`
    subscription domainCreated {
        domainCreated {
            ...domainFragment
        }
    }
    ${DomainFragmentFragmentDoc}
`;

/**
 * __useDomainCreatedSubscription__
 *
 * To run a query within a React component, call `useDomainCreatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useDomainCreatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDomainCreatedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useDomainCreatedSubscription(
    baseOptions?: Apollo.SubscriptionHookOptions<DomainCreatedSubscription, DomainCreatedSubscriptionVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<DomainCreatedSubscription, DomainCreatedSubscriptionVariables>(
        DomainCreatedDocument,
        options,
    );
}
export type DomainCreatedSubscriptionHookResult = ReturnType<typeof useDomainCreatedSubscription>;
export type DomainCreatedSubscriptionResult = Apollo.SubscriptionResult<DomainCreatedSubscription>;
export const DomainUpdatedDocument = gql`
    subscription domainUpdated {
        domainUpdated {
            ...domainFragment
        }
    }
    ${DomainFragmentFragmentDoc}
`;

/**
 * __useDomainUpdatedSubscription__
 *
 * To run a query within a React component, call `useDomainUpdatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useDomainUpdatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDomainUpdatedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useDomainUpdatedSubscription(
    baseOptions?: Apollo.SubscriptionHookOptions<DomainUpdatedSubscription, DomainUpdatedSubscriptionVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<DomainUpdatedSubscription, DomainUpdatedSubscriptionVariables>(
        DomainUpdatedDocument,
        options,
    );
}
export type DomainUpdatedSubscriptionHookResult = ReturnType<typeof useDomainUpdatedSubscription>;
export type DomainUpdatedSubscriptionResult = Apollo.SubscriptionResult<DomainUpdatedSubscription>;
export const DomainDeletedDocument = gql`
    subscription domainDeleted {
        domainDeleted {
            ...domainFragment
        }
    }
    ${DomainFragmentFragmentDoc}
`;

/**
 * __useDomainDeletedSubscription__
 *
 * To run a query within a React component, call `useDomainDeletedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useDomainDeletedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDomainDeletedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useDomainDeletedSubscription(
    baseOptions?: Apollo.SubscriptionHookOptions<DomainDeletedSubscription, DomainDeletedSubscriptionVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<DomainDeletedSubscription, DomainDeletedSubscriptionVariables>(
        DomainDeletedDocument,
        options,
    );
}
export type DomainDeletedSubscriptionHookResult = ReturnType<typeof useDomainDeletedSubscription>;
export type DomainDeletedSubscriptionResult = Apollo.SubscriptionResult<DomainDeletedSubscription>;
export const ChatSessionsDocument = gql`
    query chatSessions {
        chatSessions {
            ...chatSessionFragment
        }
    }
    ${ChatSessionFragmentFragmentDoc}
`;

/**
 * __useChatSessionsQuery__
 *
 * To run a query within a React component, call `useChatSessionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useChatSessionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useChatSessionsQuery({
 *   variables: {
 *   },
 * });
 */
export function useChatSessionsQuery(
    baseOptions?: Apollo.QueryHookOptions<ChatSessionsQuery, ChatSessionsQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<ChatSessionsQuery, ChatSessionsQueryVariables>(ChatSessionsDocument, options);
}
export function useChatSessionsLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<ChatSessionsQuery, ChatSessionsQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<ChatSessionsQuery, ChatSessionsQueryVariables>(ChatSessionsDocument, options);
}
// @ts-ignore
export function useChatSessionsSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<ChatSessionsQuery, ChatSessionsQueryVariables>,
): Apollo.UseSuspenseQueryResult<ChatSessionsQuery, ChatSessionsQueryVariables>;
export function useChatSessionsSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ChatSessionsQuery, ChatSessionsQueryVariables>,
): Apollo.UseSuspenseQueryResult<ChatSessionsQuery | undefined, ChatSessionsQueryVariables>;
export function useChatSessionsSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ChatSessionsQuery, ChatSessionsQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<ChatSessionsQuery, ChatSessionsQueryVariables>(ChatSessionsDocument, options);
}
export type ChatSessionsQueryHookResult = ReturnType<typeof useChatSessionsQuery>;
export type ChatSessionsLazyQueryHookResult = ReturnType<typeof useChatSessionsLazyQuery>;
export type ChatSessionsSuspenseQueryHookResult = ReturnType<typeof useChatSessionsSuspenseQuery>;
export type ChatSessionsQueryResult = Apollo.QueryResult<ChatSessionsQuery, ChatSessionsQueryVariables>;
export const ChatSessionDocument = gql`
    query chatSession($sessionId: ID!) {
        chatSession(sessionId: $sessionId) {
            ...chatSessionFragment
        }
    }
    ${ChatSessionFragmentFragmentDoc}
`;

/**
 * __useChatSessionQuery__
 *
 * To run a query within a React component, call `useChatSessionQuery` and pass it any options that fit your needs.
 * When your component renders, `useChatSessionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useChatSessionQuery({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *   },
 * });
 */
export function useChatSessionQuery(
    baseOptions: Apollo.QueryHookOptions<ChatSessionQuery, ChatSessionQueryVariables> &
        ({ variables: ChatSessionQueryVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<ChatSessionQuery, ChatSessionQueryVariables>(ChatSessionDocument, options);
}
export function useChatSessionLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<ChatSessionQuery, ChatSessionQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<ChatSessionQuery, ChatSessionQueryVariables>(ChatSessionDocument, options);
}
// @ts-ignore
export function useChatSessionSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<ChatSessionQuery, ChatSessionQueryVariables>,
): Apollo.UseSuspenseQueryResult<ChatSessionQuery, ChatSessionQueryVariables>;
export function useChatSessionSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ChatSessionQuery, ChatSessionQueryVariables>,
): Apollo.UseSuspenseQueryResult<ChatSessionQuery | undefined, ChatSessionQueryVariables>;
export function useChatSessionSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ChatSessionQuery, ChatSessionQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<ChatSessionQuery, ChatSessionQueryVariables>(ChatSessionDocument, options);
}
export type ChatSessionQueryHookResult = ReturnType<typeof useChatSessionQuery>;
export type ChatSessionLazyQueryHookResult = ReturnType<typeof useChatSessionLazyQuery>;
export type ChatSessionSuspenseQueryHookResult = ReturnType<typeof useChatSessionSuspenseQuery>;
export type ChatSessionQueryResult = Apollo.QueryResult<ChatSessionQuery, ChatSessionQueryVariables>;
export const ChatMessagesDocument = gql`
    query chatMessages($sessionId: ID!) {
        chatMessages(sessionId: $sessionId) {
            ...chatMessageFragment
        }
    }
    ${ChatMessageFragmentFragmentDoc}
`;

/**
 * __useChatMessagesQuery__
 *
 * To run a query within a React component, call `useChatMessagesQuery` and pass it any options that fit your needs.
 * When your component renders, `useChatMessagesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useChatMessagesQuery({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *   },
 * });
 */
export function useChatMessagesQuery(
    baseOptions: Apollo.QueryHookOptions<ChatMessagesQuery, ChatMessagesQueryVariables> &
        ({ variables: ChatMessagesQueryVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<ChatMessagesQuery, ChatMessagesQueryVariables>(ChatMessagesDocument, options);
}
export function useChatMessagesLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<ChatMessagesQuery, ChatMessagesQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<ChatMessagesQuery, ChatMessagesQueryVariables>(ChatMessagesDocument, options);
}
// @ts-ignore
export function useChatMessagesSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<ChatMessagesQuery, ChatMessagesQueryVariables>,
): Apollo.UseSuspenseQueryResult<ChatMessagesQuery, ChatMessagesQueryVariables>;
export function useChatMessagesSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ChatMessagesQuery, ChatMessagesQueryVariables>,
): Apollo.UseSuspenseQueryResult<ChatMessagesQuery | undefined, ChatMessagesQueryVariables>;
export function useChatMessagesSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ChatMessagesQuery, ChatMessagesQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<ChatMessagesQuery, ChatMessagesQueryVariables>(ChatMessagesDocument, options);
}
export type ChatMessagesQueryHookResult = ReturnType<typeof useChatMessagesQuery>;
export type ChatMessagesLazyQueryHookResult = ReturnType<typeof useChatMessagesLazyQuery>;
export type ChatMessagesSuspenseQueryHookResult = ReturnType<typeof useChatMessagesSuspenseQuery>;
export type ChatMessagesQueryResult = Apollo.QueryResult<ChatMessagesQuery, ChatMessagesQueryVariables>;
export const ChatQuotaDocument = gql`
    query chatQuota {
        chatQuota {
            ...chatQuotaFragment
        }
    }
    ${ChatQuotaFragmentFragmentDoc}
`;

/**
 * __useChatQuotaQuery__
 *
 * To run a query within a React component, call `useChatQuotaQuery` and pass it any options that fit your needs.
 * When your component renders, `useChatQuotaQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useChatQuotaQuery({
 *   variables: {
 *   },
 * });
 */
export function useChatQuotaQuery(baseOptions?: Apollo.QueryHookOptions<ChatQuotaQuery, ChatQuotaQueryVariables>) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<ChatQuotaQuery, ChatQuotaQueryVariables>(ChatQuotaDocument, options);
}
export function useChatQuotaLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<ChatQuotaQuery, ChatQuotaQueryVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<ChatQuotaQuery, ChatQuotaQueryVariables>(ChatQuotaDocument, options);
}
// @ts-ignore
export function useChatQuotaSuspenseQuery(
    baseOptions?: Apollo.SuspenseQueryHookOptions<ChatQuotaQuery, ChatQuotaQueryVariables>,
): Apollo.UseSuspenseQueryResult<ChatQuotaQuery, ChatQuotaQueryVariables>;
export function useChatQuotaSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ChatQuotaQuery, ChatQuotaQueryVariables>,
): Apollo.UseSuspenseQueryResult<ChatQuotaQuery | undefined, ChatQuotaQueryVariables>;
export function useChatQuotaSuspenseQuery(
    baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ChatQuotaQuery, ChatQuotaQueryVariables>,
) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery<ChatQuotaQuery, ChatQuotaQueryVariables>(ChatQuotaDocument, options);
}
export type ChatQuotaQueryHookResult = ReturnType<typeof useChatQuotaQuery>;
export type ChatQuotaLazyQueryHookResult = ReturnType<typeof useChatQuotaLazyQuery>;
export type ChatQuotaSuspenseQueryHookResult = ReturnType<typeof useChatQuotaSuspenseQuery>;
export type ChatQuotaQueryResult = Apollo.QueryResult<ChatQuotaQuery, ChatQuotaQueryVariables>;
export const SendChatMessageDocument = gql`
    mutation sendChatMessage($sessionId: ID, $providerName: String, $content: String!) {
        sendChatMessage(sessionId: $sessionId, providerName: $providerName, content: $content) {
            session {
                ...chatSessionFragment
            }
            userMessage {
                ...chatMessageFragment
            }
            assistantMessage {
                ...chatMessageFragment
            }
        }
    }
    ${ChatSessionFragmentFragmentDoc}
    ${ChatMessageFragmentFragmentDoc}
`;
export type SendChatMessageMutationFn = Apollo.MutationFunction<
    SendChatMessageMutation,
    SendChatMessageMutationVariables
>;

/**
 * __useSendChatMessageMutation__
 *
 * To run a mutation, you first call `useSendChatMessageMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSendChatMessageMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [sendChatMessageMutation, { data, loading, error }] = useSendChatMessageMutation({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *      providerName: // value for 'providerName'
 *      content: // value for 'content'
 *   },
 * });
 */
export function useSendChatMessageMutation(
    baseOptions?: Apollo.MutationHookOptions<SendChatMessageMutation, SendChatMessageMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<SendChatMessageMutation, SendChatMessageMutationVariables>(
        SendChatMessageDocument,
        options,
    );
}
export type SendChatMessageMutationHookResult = ReturnType<typeof useSendChatMessageMutation>;
export type SendChatMessageMutationResult = Apollo.MutationResult<SendChatMessageMutation>;
export type SendChatMessageMutationOptions = Apollo.BaseMutationOptions<
    SendChatMessageMutation,
    SendChatMessageMutationVariables
>;
export const StopChatMessageDocument = gql`
    mutation stopChatMessage($messageId: ID!) {
        stopChatMessage(messageId: $messageId) {
            ...chatMessageFragment
        }
    }
    ${ChatMessageFragmentFragmentDoc}
`;
export type StopChatMessageMutationFn = Apollo.MutationFunction<
    StopChatMessageMutation,
    StopChatMessageMutationVariables
>;

/**
 * __useStopChatMessageMutation__
 *
 * To run a mutation, you first call `useStopChatMessageMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useStopChatMessageMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [stopChatMessageMutation, { data, loading, error }] = useStopChatMessageMutation({
 *   variables: {
 *      messageId: // value for 'messageId'
 *   },
 * });
 */
export function useStopChatMessageMutation(
    baseOptions?: Apollo.MutationHookOptions<StopChatMessageMutation, StopChatMessageMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<StopChatMessageMutation, StopChatMessageMutationVariables>(
        StopChatMessageDocument,
        options,
    );
}
export type StopChatMessageMutationHookResult = ReturnType<typeof useStopChatMessageMutation>;
export type StopChatMessageMutationResult = Apollo.MutationResult<StopChatMessageMutation>;
export type StopChatMessageMutationOptions = Apollo.BaseMutationOptions<
    StopChatMessageMutation,
    StopChatMessageMutationVariables
>;
export const RenameChatSessionDocument = gql`
    mutation renameChatSession($sessionId: ID!, $title: String!) {
        renameChatSession(sessionId: $sessionId, title: $title) {
            ...chatSessionFragment
        }
    }
    ${ChatSessionFragmentFragmentDoc}
`;
export type RenameChatSessionMutationFn = Apollo.MutationFunction<
    RenameChatSessionMutation,
    RenameChatSessionMutationVariables
>;

/**
 * __useRenameChatSessionMutation__
 *
 * To run a mutation, you first call `useRenameChatSessionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRenameChatSessionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [renameChatSessionMutation, { data, loading, error }] = useRenameChatSessionMutation({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *      title: // value for 'title'
 *   },
 * });
 */
export function useRenameChatSessionMutation(
    baseOptions?: Apollo.MutationHookOptions<RenameChatSessionMutation, RenameChatSessionMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<RenameChatSessionMutation, RenameChatSessionMutationVariables>(
        RenameChatSessionDocument,
        options,
    );
}
export type RenameChatSessionMutationHookResult = ReturnType<typeof useRenameChatSessionMutation>;
export type RenameChatSessionMutationResult = Apollo.MutationResult<RenameChatSessionMutation>;
export type RenameChatSessionMutationOptions = Apollo.BaseMutationOptions<
    RenameChatSessionMutation,
    RenameChatSessionMutationVariables
>;
export const DeleteChatSessionDocument = gql`
    mutation deleteChatSession($sessionId: ID!) {
        deleteChatSession(sessionId: $sessionId)
    }
`;
export type DeleteChatSessionMutationFn = Apollo.MutationFunction<
    DeleteChatSessionMutation,
    DeleteChatSessionMutationVariables
>;

/**
 * __useDeleteChatSessionMutation__
 *
 * To run a mutation, you first call `useDeleteChatSessionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteChatSessionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteChatSessionMutation, { data, loading, error }] = useDeleteChatSessionMutation({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *   },
 * });
 */
export function useDeleteChatSessionMutation(
    baseOptions?: Apollo.MutationHookOptions<DeleteChatSessionMutation, DeleteChatSessionMutationVariables>,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<DeleteChatSessionMutation, DeleteChatSessionMutationVariables>(
        DeleteChatSessionDocument,
        options,
    );
}
export type DeleteChatSessionMutationHookResult = ReturnType<typeof useDeleteChatSessionMutation>;
export type DeleteChatSessionMutationResult = Apollo.MutationResult<DeleteChatSessionMutation>;
export type DeleteChatSessionMutationOptions = Apollo.BaseMutationOptions<
    DeleteChatSessionMutation,
    DeleteChatSessionMutationVariables
>;
export const ChatSessionCreatedDocument = gql`
    subscription chatSessionCreated {
        chatSessionCreated {
            ...chatSessionFragment
        }
    }
    ${ChatSessionFragmentFragmentDoc}
`;

/**
 * __useChatSessionCreatedSubscription__
 *
 * To run a query within a React component, call `useChatSessionCreatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useChatSessionCreatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useChatSessionCreatedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useChatSessionCreatedSubscription(
    baseOptions?: Apollo.SubscriptionHookOptions<
        ChatSessionCreatedSubscription,
        ChatSessionCreatedSubscriptionVariables
    >,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<ChatSessionCreatedSubscription, ChatSessionCreatedSubscriptionVariables>(
        ChatSessionCreatedDocument,
        options,
    );
}
export type ChatSessionCreatedSubscriptionHookResult = ReturnType<typeof useChatSessionCreatedSubscription>;
export type ChatSessionCreatedSubscriptionResult = Apollo.SubscriptionResult<ChatSessionCreatedSubscription>;
export const ChatSessionUpdatedDocument = gql`
    subscription chatSessionUpdated {
        chatSessionUpdated {
            ...chatSessionFragment
        }
    }
    ${ChatSessionFragmentFragmentDoc}
`;

/**
 * __useChatSessionUpdatedSubscription__
 *
 * To run a query within a React component, call `useChatSessionUpdatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useChatSessionUpdatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useChatSessionUpdatedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useChatSessionUpdatedSubscription(
    baseOptions?: Apollo.SubscriptionHookOptions<
        ChatSessionUpdatedSubscription,
        ChatSessionUpdatedSubscriptionVariables
    >,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<ChatSessionUpdatedSubscription, ChatSessionUpdatedSubscriptionVariables>(
        ChatSessionUpdatedDocument,
        options,
    );
}
export type ChatSessionUpdatedSubscriptionHookResult = ReturnType<typeof useChatSessionUpdatedSubscription>;
export type ChatSessionUpdatedSubscriptionResult = Apollo.SubscriptionResult<ChatSessionUpdatedSubscription>;
export const ChatSessionDeletedDocument = gql`
    subscription chatSessionDeleted {
        chatSessionDeleted {
            ...chatSessionFragment
        }
    }
    ${ChatSessionFragmentFragmentDoc}
`;

/**
 * __useChatSessionDeletedSubscription__
 *
 * To run a query within a React component, call `useChatSessionDeletedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useChatSessionDeletedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useChatSessionDeletedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useChatSessionDeletedSubscription(
    baseOptions?: Apollo.SubscriptionHookOptions<
        ChatSessionDeletedSubscription,
        ChatSessionDeletedSubscriptionVariables
    >,
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<ChatSessionDeletedSubscription, ChatSessionDeletedSubscriptionVariables>(
        ChatSessionDeletedDocument,
        options,
    );
}
export type ChatSessionDeletedSubscriptionHookResult = ReturnType<typeof useChatSessionDeletedSubscription>;
export type ChatSessionDeletedSubscriptionResult = Apollo.SubscriptionResult<ChatSessionDeletedSubscription>;
export const ChatMessageAddedDocument = gql`
    subscription chatMessageAdded($sessionId: ID!) {
        chatMessageAdded(sessionId: $sessionId) {
            ...chatMessageFragment
        }
    }
    ${ChatMessageFragmentFragmentDoc}
`;

/**
 * __useChatMessageAddedSubscription__
 *
 * To run a query within a React component, call `useChatMessageAddedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useChatMessageAddedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useChatMessageAddedSubscription({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *   },
 * });
 */
export function useChatMessageAddedSubscription(
    baseOptions: Apollo.SubscriptionHookOptions<ChatMessageAddedSubscription, ChatMessageAddedSubscriptionVariables> &
        ({ variables: ChatMessageAddedSubscriptionVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<ChatMessageAddedSubscription, ChatMessageAddedSubscriptionVariables>(
        ChatMessageAddedDocument,
        options,
    );
}
export type ChatMessageAddedSubscriptionHookResult = ReturnType<typeof useChatMessageAddedSubscription>;
export type ChatMessageAddedSubscriptionResult = Apollo.SubscriptionResult<ChatMessageAddedSubscription>;
export const ChatMessageUpdatedDocument = gql`
    subscription chatMessageUpdated($sessionId: ID!) {
        chatMessageUpdated(sessionId: $sessionId) {
            ...chatMessageFragment
        }
    }
    ${ChatMessageFragmentFragmentDoc}
`;

/**
 * __useChatMessageUpdatedSubscription__
 *
 * To run a query within a React component, call `useChatMessageUpdatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useChatMessageUpdatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useChatMessageUpdatedSubscription({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *   },
 * });
 */
export function useChatMessageUpdatedSubscription(
    baseOptions: Apollo.SubscriptionHookOptions<
        ChatMessageUpdatedSubscription,
        ChatMessageUpdatedSubscriptionVariables
    > &
        ({ variables: ChatMessageUpdatedSubscriptionVariables; skip?: boolean } | { skip: boolean }),
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription<ChatMessageUpdatedSubscription, ChatMessageUpdatedSubscriptionVariables>(
        ChatMessageUpdatedDocument,
        options,
    );
}
export type ChatMessageUpdatedSubscriptionHookResult = ReturnType<typeof useChatMessageUpdatedSubscription>;
export type ChatMessageUpdatedSubscriptionResult = Apollo.SubscriptionResult<ChatMessageUpdatedSubscription>;
