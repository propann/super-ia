import { randomUUID } from "node:crypto";
import { openControlPlane, type ControlPlane } from "../control/control-plane.js";
import type { EventRecord, RunRecord } from "../control/types.js";
import {
  loadNotificationConfig,
  loadNotificationState,
  saveNotificationState,
  writeNotificationRecord,
  type NotificationLevel,
  type NotificationRecord,
} from "./store.js";

export interface NotificationTickResult {
  enabled: boolean;
  eventsSeen: number;
  blockedTasksSeen: number;
  created: number;
  duplicates: number;
  lastEventId: number;
}

const RUN_EVENTS = new Map<string, { level: NotificationLevel; label: string }>([
  ["run.completed", { level: "success", label: "terminé" }],
  ["run.failed", { level: "error", label: "en échec" }],
  ["run.cancelled", { level: "warning", label: "annulé" }],
  ["run.interrupted", { level: "warning", label: "interrompu" }],
]);

function safeIdentifier(value: string | undefined, fallback = "-"): string {
  if (!value) return fallback;
  const safe = value.replace(/[^A-Za-z0-9._:-]/g, "_").slice(0, 96);
  return safe || fallback;
}

function runNotification(event: EventRecord, run: RunRecord | undefined): NotificationRecord | undefined {
  const descriptor = RUN_EVENTS.get(event.type);
  if (!descriptor) return undefined;
  const runId = safeIdentifier(event.aggregateId);
  const taskId = safeIdentifier(run?.taskId, "sans-mission");
  const projectId = safeIdentifier(run?.projectId, "projet-inconnu");
  return {
    schemaVersion: 1,
    id: randomUUID(),
    key: `event:${event.id}:${event.type}:${runId}`,
    createdAt: event.createdAt,
    level: descriptor.level,
    kind: "run",
    title: `Run ${descriptor.label}`,
    message: `${runId} · ${taskId}`,
    projectId,
    taskId: run?.taskId ? taskId : undefined,
    runId,
    sourceEventId: event.id,
  };
}

function blockedTaskNotification(input: {
  projectId: string;
  taskId: string;
  updatedAt: string;
}): NotificationRecord {
  const projectId = safeIdentifier(input.projectId);
  const taskId = safeIdentifier(input.taskId);
  return {
    schemaVersion: 1,
    id: randomUUID(),
    key: `task-blocked:${projectId}:${taskId}:${input.updatedAt}`,
    createdAt: input.updatedAt,
    level: "warning",
    kind: "task",
    title: "Mission bloquée",
    message: `${taskId} · projet ${projectId}`,
    projectId,
    taskId,
  };
}

function renderConsole(record: NotificationRecord): string {
  return `[SUPER IA][${record.level.toUpperCase()}] ${record.title} — ${record.message}`;
}

export async function processNotifications(control: ControlPlane): Promise<NotificationTickResult> {
  const config = await loadNotificationConfig(control.paths.root);
  const recent = control.listEvents(1_000);
  const latestEventId = recent[0]?.id ?? 0;
  const state = await loadNotificationState(latestEventId, control.paths.root);

  if (!config.enabled) {
    const nextEventId = Math.max(state.lastEventId, latestEventId);
    if (state.lastEventId !== nextEventId) {
      await saveNotificationState({ schemaVersion: 1, lastEventId: nextEventId }, control.paths.root);
    }
    return {
      enabled: false,
      eventsSeen: 0,
      blockedTasksSeen: 0,
      created: 0,
      duplicates: 0,
      lastEventId: nextEventId,
    };
  }

  const unseen = recent.filter((event) => event.id > state.lastEventId).sort((a, b) => a.id - b.id);
  if (recent.length === 1_000 && unseen.length === 1_000 && unseen[0].id > state.lastEventId + 1) {
    throw new Error("Retard de notifications supérieur à 1000 événements. Réinitialisation manuelle requise.");
  }

  let created = 0;
  let duplicates = 0;
  if (config.notifyRuns) {
    for (const event of unseen) {
      if (!RUN_EVENTS.has(event.type)) continue;
      let run: RunRecord | undefined;
      try {
        run = control.getRun(event.aggregateId);
      } catch {
        run = undefined;
      }
      const record = runNotification(event, run);
      if (!record) continue;
      const written = await writeNotificationRecord(record, control.paths.root);
      if (written) {
        created += 1;
        if (config.stdout) console.log(renderConsole(record));
      } else duplicates += 1;
    }
  }

  let blockedTasksSeen = 0;
  if (config.notifyBlockedTasks) {
    for (const project of control.listProjects()) {
      for (const task of control.listProjectTasks(project.id)) {
        if (task.status !== "blocked") continue;
        blockedTasksSeen += 1;
        const record = blockedTaskNotification({
          projectId: project.id,
          taskId: task.id,
          updatedAt: task.updatedAt,
        });
        const written = await writeNotificationRecord(record, control.paths.root);
        if (written) {
          created += 1;
          if (config.stdout) console.log(renderConsole(record));
        } else duplicates += 1;
      }
    }
  }

  const nextEventId = Math.max(state.lastEventId, latestEventId);
  await saveNotificationState({ schemaVersion: 1, lastEventId: nextEventId }, control.paths.root);
  return {
    enabled: true,
    eventsSeen: unseen.length,
    blockedTasksSeen,
    created,
    duplicates,
    lastEventId: nextEventId,
  };
}

export async function runNotificationTick(controlHome?: string): Promise<NotificationTickResult> {
  const control = await openControlPlane(controlHome);
  try {
    return await processNotifications(control);
  } finally {
    control.close();
  }
}
