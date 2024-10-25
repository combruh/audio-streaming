import { Observable, Utils } from '@nativescript/core';
import { StreamingOptions } from '.';

export class StreamingPlayer extends Observable {
    private _mediaPlayer: android.media.MediaPlayer;
    private _audioUrl: string;
    private _mediaSession: android.media.session.MediaSession;
    private _playbackStateBuilder: android.media.session.PlaybackState.Builder;

    public initPlayer(options: StreamingOptions): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                this._audioUrl = options.audioUrl;
                this._mediaPlayer = new android.media.MediaPlayer();
                this._mediaPlayer.setDataSource(this._audioUrl);
                this._mediaPlayer.setOnPreparedListener(new android.media.MediaPlayer.OnPreparedListener({
                    onPrepared: (mp) => {
                        mp.start();
                        this.updatePlaybackState(true, mp.getCurrentPosition());
                        resolve(null);
                    }
                }));
                this._mediaPlayer.prepareAsync();
            } catch (error) {
                reject(error);
                throw new Error(`Error initializing player: ${error}`);
            }
        });
    }

    public play(): void {
        if (this._mediaPlayer && !this._mediaPlayer.isPlaying()) {
            this._mediaPlayer.start();
            this.updatePlaybackState(true, this._mediaPlayer.getCurrentPosition());
        }
    }

    public pause(): void {
        if (this._mediaPlayer && this._mediaPlayer.isPlaying()) {
            this._mediaPlayer.pause();
            this.updatePlaybackState(false, this._mediaPlayer.getCurrentPosition());
        }
    }

    public seekTo(time: number): void {
        if (this._mediaPlayer) {
            this._mediaPlayer.seekTo(time * 1000);
            this.updatePlaybackState(this.isPlaying, time * 1000);
        }
    }

    public release(): void {
        if (this._mediaPlayer) {
            this._mediaPlayer.release();
            this._mediaPlayer = null;
        }
        if (this._mediaSession) {
            this._mediaSession.release();
            this._mediaSession = null;
        }
    }

    get isPlaying(): boolean {
        return this._mediaPlayer ? this._mediaPlayer.isPlaying() : false;
    }

    get currentTime(): number {
        return this._mediaPlayer ? this._mediaPlayer.getCurrentPosition() / 1000 : 0;
    }

    get duration(): number {
        return this._mediaPlayer ? this._mediaPlayer.getDuration() / 1000 : 0;
    }

    private updatePlaybackState(state: boolean, position: number): void {
        if (this._mediaSession && this._playbackStateBuilder) {
            if (state) {
                this._playbackStateBuilder.setState(android.media.session.PlaybackState.STATE_PLAYING, position * 1000, 1.0);
            } else {
                this._playbackStateBuilder.setState(android.media.session.PlaybackState.STATE_PAUSED, position * 1000, 1.0);
            }
            this._mediaSession.setPlaybackState(this._playbackStateBuilder.build());
        }
    }

    public async setMediaSession(options: StreamingOptions, ftPlay: Function, ftPause: Function, ftNextEpisode: Function, ftPreviousEpisode: Function) {
        try {
            const context = Utils.android.getApplicationContext();

            if (!this._mediaSession) {
                this._mediaSession = new android.media.session.MediaSession(context, 'StreamingPlayer');
                this._mediaSession.setFlags(
                    android.media.session.MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS |
                    android.media.session.MediaSession.FLAG_HANDLES_MEDIA_BUTTONS
                );
                //@ts-ignore
                const MediaSessionCallback = android.media.session.MediaSession.Callback.extend({
                    onPlay: async function () {
                        ftPlay();
                    },
                    onPause: function () {
                        ftPause();
                    },
                    onSkipToNext: function () {
                        ftNextEpisode();
                    },
                    onSkipToPrevious: function () {
                        ftPreviousEpisode();
                    }
                });
                this._mediaSession.setCallback(new (MediaSessionCallback as any)());
            }
            this._playbackStateBuilder = new android.media.session.PlaybackState.Builder()
                .setActions(
                    android.media.session.PlaybackState.ACTION_PLAY |
                    android.media.session.PlaybackState.ACTION_PAUSE |
                    android.media.session.PlaybackState.ACTION_PLAY_PAUSE |
                    android.media.session.PlaybackState.ACTION_SKIP_TO_NEXT |
                    android.media.session.PlaybackState.ACTION_SKIP_TO_PREVIOUS
                );
            this.updatePlaybackState(false, 0);
            this._mediaSession.setActive(true);
        } catch (error) {
            throw new Error(`Error setting media session: ${error}`);
        }
    }

    public async setNowPlayingInfo(options: StreamingOptions, currentTime: number): Promise<void> {
        try {
            const context = Utils.android.getApplicationContext();
            const notificationManager = context.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as android.app.NotificationManager;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                const channel = new android.app.NotificationChannel(
                    "media_channel_id",
                    "Media Playback",
                    android.app.NotificationManager.IMPORTANCE_DEFAULT
                );
                channel.setDescription(" ");
                channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
                notificationManager.createNotificationChannel(channel);
            }
            const builder = new android.app.Notification.Builder(context, "media_channel_id")
                .setContentTitle(options.audioTitle || " ")
                .setContentText(options.audioArtist || " ")
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setOngoing(true)
                .setVisibility(android.app.Notification.VISIBILITY_PUBLIC)
                .setStyle(new android.app.Notification.MediaStyle()
                    .setMediaSession(this._mediaSession.getSessionToken()))
                .setLargeIcon(null)
                .setForegroundServiceBehavior(android.app.Notification.FOREGROUND_SERVICE_IMMEDIATE)
                .setBadgeIconType(android.app.Notification.BADGE_ICON_SMALL)
                .setTimeoutAfter(60 * 60 * 1000);
            notificationManager.notify(1, builder.build());
        } catch (error) {
            throw new Error(`Error creating media notification: ${error}`);
        }
    }
}