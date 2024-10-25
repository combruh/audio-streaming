import { Observable } from '@nativescript/core';
import { StreamingOptions } from '.';

declare let AVPlayer;

export class StreamingPlayer extends Observable {
    private _player: AVPlayer;

    release(): void {}

    public initPlayer(options: StreamingOptions): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                const audioSession = AVAudioSession.sharedInstance();
                audioSession.setActiveError(true);
                audioSession.setCategoryWithOptionsError(AVAudioSessionCategoryPlayback, AVAudioSessionCategoryOptions.DefaultToSpeaker);
                const url = NSURL.URLWithString(options.audioUrl);
                this._player = AVPlayer.playerWithURL(url);
                this._player.play();
                resolve(null);
            } catch (error) {
                reject(error);
                throw error;
            }
        });
    }

    public async setNowPlayingInfo(options: StreamingOptions, currentTime: number): Promise<void> {
        if (this._player && this._player.currentItem) {
            const duration = CMTimeGetSeconds(this._player.currentItem.duration);
            let artwork: MPMediaItemArtwork;
            if (options.audioImageUrl) {
                const image = await this.downloadImageFromURL(options.audioImageUrl);
                artwork = new MPMediaItemArtwork({
                    boundsSize: image.size,
                    requestHandler: (size: CGSize) => image
                });
            } else {
                const image = await this.downloadImageFromURL('https://dummyimage.com/512x512/000000/');
                artwork = new MPMediaItemArtwork({
                    boundsSize: image.size,
                    requestHandler: (size) => image
                });
            }
            if (!isNaN(currentTime) && !isNaN(duration)) {
                const nowPlayingInfo = NSMutableDictionary.alloc().initWithObjectsForKeys(
                    [
                        options.audioTitle || " ",
                        options.audioArtist || " ",
                        Math.floor(duration) || 0,
                        artwork || null,
                    ],
                    [
                        MPMediaItemPropertyTitle,
                        MPMediaItemPropertyArtist,
                        MPMediaItemPropertyPlaybackDuration,
                        MPMediaItemPropertyArtwork,
                    ]
                );
                MPNowPlayingInfoCenter.defaultCenter().nowPlayingInfo = nowPlayingInfo;
            }
        }
    }

    public async setMediaSession(options: StreamingOptions, play: Function, pause: Function, nextEpisode: Function, previousEpisode: Function): Promise<void> {
        const remoteCommandCenter = MPRemoteCommandCenter.sharedCommandCenter();
        remoteCommandCenter.playCommand.addTargetWithHandler(() => {
            play();
            return MPRemoteCommandHandlerStatus.Success;
        });
        remoteCommandCenter.pauseCommand.addTargetWithHandler(() => {
            pause();
            return MPRemoteCommandHandlerStatus.Success;
        });
        remoteCommandCenter.nextTrackCommand.addTargetWithHandler(() => {
            nextEpisode();
            return MPRemoteCommandHandlerStatus.Success;
        });
        remoteCommandCenter.previousTrackCommand.addTargetWithHandler(() => {
            previousEpisode();
            return MPRemoteCommandHandlerStatus.Success;
        });
    }

    public updatePlaybackState(isPlaying: boolean, currentTime: number): void {
        try {
            const playbackState = isPlaying ? MPNowPlayingPlaybackState.Playing : MPNowPlayingPlaybackState.Paused;
            MPNowPlayingInfoCenter.defaultCenter().playbackState = playbackState;
            const nowPlayingInfo = NSMutableDictionary.dictionaryWithDictionary(MPNowPlayingInfoCenter.defaultCenter().nowPlayingInfo);
            if (nowPlayingInfo.objectForKey(MPNowPlayingInfoPropertyElapsedPlaybackTime) !== currentTime) {
                nowPlayingInfo.setObjectForKey(currentTime, MPNowPlayingInfoPropertyElapsedPlaybackTime);
                MPNowPlayingInfoCenter.defaultCenter().nowPlayingInfo = nowPlayingInfo;
            }
        } catch (error) {
            throw new Error(`Error updating playback state: ${error}`);
        }
    }

    get currentTime(): number {
        if (this._player) {
            const currentTime = this._player.currentTime();
            const currentTimeInSeconds = CMTimeGetSeconds(currentTime);
            return currentTimeInSeconds;
        }
        return 0;
    }

    get duration(): number {
        if (this._player && this._player.currentItem) {
            const duration = this._player.currentItem.duration;
            const durationInSeconds = CMTimeGetSeconds(duration);
            if (isNaN(durationInSeconds)) {
                return 0;
            }
            return durationInSeconds;
        }
        return 0;
    }

    public play(): void {
        if (this._player) {
            this._player.play();
        }
    }

    public pause(): void {
        if (this._player) {
            this._player.pause();
        }
    }

    get isPlaying(): boolean {
        if (this._player) {
            return this._player.rate > 0;
        }
        return false;
    }

    public seekTo(time: number, callback?: () => void): void {
        if (this._player && this._player.currentItem) {
            const seekTime = CMTimeMakeWithSeconds(time, 1e9);
            this._player.seekToTimeToleranceBeforeToleranceAfterCompletionHandler(
                seekTime,
                kCMTimeZero,
                kCMTimeZero,
                (finished) => {
                    if (finished && callback) {
                        callback();
                    }
                }
            );
        }
    }

    private downloadImageFromURL(url: string): Promise<UIImage> {
        return new Promise((resolve, reject) => {
            const session = NSURLSession.sharedSession;
            const task = session.dataTaskWithURLCompletionHandler(NSURL.URLWithString(url), (data, response, error) => {
                if (error) {
                    reject(error);
                } else if (data) {
                    const image = UIImage.imageWithData(data);
                    resolve(image);
                } else {
                    reject(new Error(`Error downloading image from URL: ${url}`));
                }
            });
            task.resume();
        });
    }
}