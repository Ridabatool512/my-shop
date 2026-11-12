export type ChatContent = {
  text: string;
  imageDataUrl: string | null;
};

export function formatChatContent(text: string, imageDataUrl?: string) {
  return imageDataUrl
    ? JSON.stringify({ type: "image", text, imageDataUrl })
    : text;
}

export function parseChatContent(message: string): ChatContent {
  try {
    const value: unknown = JSON.parse(message);
    if (
      typeof value === "object" &&
      value !== null &&
      "type" in value &&
      value.type === "image" &&
      "text" in value &&
      typeof value.text === "string" &&
      "imageDataUrl" in value &&
      typeof value.imageDataUrl === "string" &&
      /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(
        value.imageDataUrl
      )
    ) {
      return { text: value.text, imageDataUrl: value.imageDataUrl };
    }
  } catch {
    // Regular chat messages are plain text, not JSON.
  }

  return { text: message, imageDataUrl: null };
}
