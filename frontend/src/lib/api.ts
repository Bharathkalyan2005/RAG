const BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://rag-38rs.onrender.com/api/v1";

export async function queryRAG(query: string, sessionId: string) {
  const res = await fetch(`${BASE}/chat/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: query,
      session_id: sessionId,
    }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error ${res.status}: ${errorText}`);
  }
  return res.json();
}

export async function uploadDocument(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/documents/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export async function getDocuments() {
  const res = await fetch(`${BASE}/documents`);
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

export async function deleteDocument(id: string) {
  const res = await fetch(`${BASE}/documents/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Delete failed");
  return res.json();
}

export async function getAnalytics() {
  const res = await fetch(`${BASE}/analytics/stats`);
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}
