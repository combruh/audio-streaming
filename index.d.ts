import { Observable } from '@nativescript/core';

export interface StreamingOptions {
    audioUrl?: string;
    audioImageUrl?: string;
    audioTitle?: string;
    audioArtist?: string;
}

export declare class StreamingPlayer {
    initPlayer(options: StreamingOptions): Promise<any>;
    setMediaSession(options: StreamingOptions, play: Function, pause: Function, nextEpisode: Function, previousEpisode: Function): Promise<void>;
    setNowPlayingInfo(options: StreamingOptions, currentTime: number): Promise<void>;
    updatePlaybackState(isPlaying: boolean, currentTime: number): void;
    seekTo(time: number, callback?: () => void): void;
    play(): void;
    pause(): void;
    release(): void;
    readonly currentTime: number;
    readonly duration: number;
    readonly isPlaying: boolean;
}