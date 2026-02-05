type PendingAction = { endpoint: string; payload: unknown; createdAt: string };

const queue: PendingAction[] = [];

export function queueOfflineAction(endpoint: string, payload: unknown) {
  queue.push({ endpoint, payload, createdAt: new Date().toISOString() });
}

export async function flushOfflineQueue(baseUrl: string) {
  while (queue.length > 0) {
    const action = queue[0];
    const response = await fetch(`${baseUrl}${action.endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.payload)
    });

    if (!response.ok) {
      break;
    }

    queue.shift();
  }
}
