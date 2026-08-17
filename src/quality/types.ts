export interface ReceiptArtifact {
  kind: string;
  path: string;
  bytes: number;
  sha256: string;
}

export interface ReceiptValidation {
  runId: string;
  command?: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
}

export interface ReceiptReview {
  path: string;
  reviewerProvider: string;
  reviewerRunId: string;
  verdict: "approve" | "changes-requested" | "blocked";
  structured: boolean;
  findings: number;
}

export interface RunReceipt {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  run: {
    id: string;
    projectId: string;
    taskId?: string;
    provider: string;
    mode?: string;
    status: string;
    startedAt: string;
    finishedAt?: string;
  };
  project: {
    id: string;
    name: string;
    root: string;
    remote?: string;
  };
  task?: {
    id: string;
    title: string;
    goal: string;
    branchName: string;
    worktreePath?: string;
  };
  git: {
    cwd: string;
    baseCommit?: string;
    resultCommit?: string;
    dirty: boolean;
    changedFiles: string[];
    diffSha256: string;
  };
  context?: {
    id: string;
    expectedHash?: string;
    manifestPath: string;
    manifestSha256?: string;
    manifestHashMatches: boolean;
  };
  review?: ReceiptReview;
  artifacts: ReceiptArtifact[];
  validations: ReceiptValidation[];
  verdict: {
    agentCompleted: boolean;
    contextVerified: boolean;
    artifactsVerified: boolean;
    validationState: "not-required" | "missing" | "passed" | "failed";
    reviewState: "not-required" | "missing" | "approve" | "changes-requested" | "blocked";
    humanApprovalRequired: true;
  };
  receiptHash: string;
}

export interface ReceiptVerification {
  valid: boolean;
  receipt: RunReceipt;
  errors: string[];
}
