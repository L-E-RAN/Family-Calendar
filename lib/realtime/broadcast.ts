export async function broadcastCompletionChange(familyId: string) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'apikey': key,
    },
    body: JSON.stringify({
      messages: [{
        topic: `realtime:family-${familyId}`,
        event: 'completion_changed',
        payload: {},
      }],
    }),
  }).catch(() => {})
}
