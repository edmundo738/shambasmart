interface PendingRequest {
  endpoint: string;
  payload: unknown;
}

const storageKey = 'chamba.pending.requests';

function getQueue(): PendingRequest[] {
  const raw = localStorage.getItem(storageKey);
  return raw ? JSON.parse(raw) as PendingRequest[] : [];
}

function saveQueue(queue: PendingRequest[]) {
  localStorage.setItem(storageKey, JSON.stringify(queue));
}

export function enqueueRequest(endpoint: string, payload: unknown) {
  const queue = getQueue();
  queue.push({ endpoint, payload });
  saveQueue(queue);
}

export async function flushQueue(baseUrl: string) {
  const queue = getQueue();
  const remaining: PendingRequest[] = [];

  for (const request of queue) {
    const response = await fetch(`${baseUrl}${request.endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.payload)
    });

    if (!response.ok) {
      remaining.push(request);
    }
  }

  saveQueue(remaining);
}
