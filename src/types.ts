export interface Voice {
  voiceId: string;
  name: string;
  category: string;
  description: string;
  previewUrl: string;
  labels: Record<string, string>;
}

export interface VoiceSettings {
  stability: number;
  similarityBoost: number;
  style: number;
  speed: number;
  speakerBoost: boolean;
}

export interface SpeechRequest extends VoiceSettings {
  text: string;
  voiceId: string;
  modelId?: string;
}

export interface SpeechClip {
  id: string;
  text: string;
  voiceName: string;
  url: string;
  bytes: number;
  createdAt: number;
}

export const DEFAULT_SETTINGS: VoiceSettings = {
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0,
  speed: 1,
  speakerBoost: true,
};

export const TEXT_MAX = 2500;
