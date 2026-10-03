export function roomId() {
  return new URLSearchParams(location.search).get("room") || "";
}
export function credentials(id: string) {
  return sessionStorage.getItem("room-token:" + id) || "";
}
export async function api(path: string, data?: unknown, id = roomId()) {
  const response = await fetch("/api" + path, {
    method: data === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + credentials(id),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Request failed. Please try again.");
  return result;
}
