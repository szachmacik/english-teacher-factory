import { YoutubeTranscript } from "youtube-transcript";

export interface YouTubeMetadata {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number;
  channelName: string;
}

export interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
}

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Fetch YouTube video metadata via oEmbed API (no API key needed)
 */
export async function fetchYouTubeMetadata(videoId: string): Promise<YouTubeMetadata> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl);
    if (!response.ok) throw new Error(`oEmbed failed: ${response.status}`);
    const data = await response.json() as any;

    return {
      id: videoId,
      title: data.title || "Untitled Video",
      description: "",
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      duration: 0,
      channelName: data.author_name || "Unknown Channel",
    };
  } catch (err) {
    return {
      id: videoId,
      title: "YouTube Video",
      description: "",
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      duration: 0,
      channelName: "Unknown",
    };
  }
}

/**
 * Fetch transcript from YouTube video
 */
export async function fetchYouTubeTranscript(videoId: string): Promise<{
  transcript: string;
  segments: TranscriptSegment[];
  language: string;
}> {
  try {
    // Try English first, then any available language
    let transcriptData: TranscriptSegment[] = [];
    let language = "en";

    try {
      const raw = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" });
      transcriptData = raw.map(s => ({ text: s.text, offset: s.offset, duration: s.duration }));
    } catch {
      // Try without language preference
      const raw = await YoutubeTranscript.fetchTranscript(videoId);
      transcriptData = raw.map(s => ({ text: s.text, offset: s.offset, duration: s.duration }));
      language = "auto";
    }

    const transcript = transcriptData
      .map(s => s.text.replace(/\[.*?\]/g, "").trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return { transcript, segments: transcriptData, language };
  } catch (err: any) {
    throw new Error(`Could not fetch transcript: ${err.message}. Make sure the video has captions enabled.`);
  }
}

/**
 * Estimate CEFR level based on vocabulary complexity
 */
export function estimateCEFRLevel(transcript: string): string {
  const words = transcript.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
  const lexicalDensity = uniqueWords.size / words.length;

  if (avgWordLength < 4 && lexicalDensity < 0.4) return "A1";
  if (avgWordLength < 5 && lexicalDensity < 0.5) return "A2";
  if (avgWordLength < 5.5 && lexicalDensity < 0.6) return "B1";
  if (avgWordLength < 6 && lexicalDensity < 0.65) return "B2";
  if (avgWordLength < 7) return "C1";
  return "C2";
}
