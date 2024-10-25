## Installation
### NPM
```
npm install audio-streaming
```

## API
#### StreamingPlayer Methods
| Method                                                                 | Description                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| **`initPlayer(options: StreamingOptions): Promise<any>`**  | Initializes the player with the provided audio URL and begins playback. |
| **`play(): void`** | Starts or resumes audio playback. |
| **`pause(): void`** | Pauses the current audio playback. |
| **`release(): void`** | Releases resources associated with the audio player. |
| **`seekTo(time: number, callback?: () => void): void`** | Jumps to a specified position in the audio track (in seconds), with an optional callback function. |
| **`setMediaSession(options: StreamingOptions, play: Function, pause: Function, nextEpisode: Function, previousEpisode: Function): Promise<void>`** | Configures multimedia controls to allow actions like play, pause, next episode, and previous episode. |
| **`setNowPlayingInfo(options: StreamingOptions, currentTime: number): Promise<void>`** | Updates metadata (like title, artist, duration, and artwork) for the current track to display on media control interfaces. |
| **`updatePlaybackState(isPlaying: boolean, currentTime: number): void`** | Updates the playback state (playing or paused) and current playback time on the media interface. |

#### StreamingPlayer Read-only Properties
| Read-only properties                                                                 | Description                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| **`currentTime: number`** | The current playback time in seconds. |
| **`duration: number`** | The total duration of the audio track in seconds. |
| **`isPlaying: boolean`** | Indicates if the audio is currently playing.  |

#### StreamingOptions Properties
| Properties                                                                 | Description                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| **`audioUrl?: string`** | The URL of the audio track to be streamed. |
| **`audioImageUrl?: string`** | The URL of an image to represent the audio track, typically displayed in media controls and lock screens. |
| **`audioTitle?: string`** | The title of the audio track, displayed in media control interfaces. |
| **`audioArtist?: string`** | The artist or creator of the audio track, displayed alongside the title in media controls. |

## Usage
### Nativescript-Vue 2, Vuex 3 and TypeScript 5 Example
```ts
// ./store/audio-streaming.ts
import { StreamingPlayer, StreamingOptions } from 'audio-streaming';
import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

interface State {
    player: StreamingPlayer;
    options: StreamingOptions;
    timeUpdateInterval: any;
    currentTime: number;
    duration: number;
    isPlaying: boolean;
}

export default new Vuex.Store<State>({
    state: {
        player: new StreamingPlayer(),
        options: {},
        timeUpdateInterval: null,
        currentTime: 0,
        duration: 0,
        isPlaying: false
    },
    actions: {
        async initMyStreamingPlayer({ commit, state, dispatch }: { commit: Function, state: any, dispatch: Function }) {
            state.player.release();
            state.player = new StreamingPlayer();
            state.options = {
                audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                audioImageUrl: 'https://dummyimage.com/512x512/000000/',
                audioTitle: 'SoundHelix Song 1',
                audioArtist: 'SoundHelix'
            };
            state.player.setMediaSession(state.options, () => dispatch('play'), () => dispatch('pause'), () => dispatch('nextEpisode'), () => dispatch('previousEpisode'));
            await state.player.initPlayer(state.options).then(() => {
                dispatch('updateCurrentTime');
                state.isPlaying = true;
            })
            .catch((error: any) => {
                console.error('Error initializing player: ', error);
            });
        },
        updateCurrentTime({ commit, state, dispatch }: { commit: Function, state: any, dispatch: Function }) {
            state.currentTime = 0;
            state.duration = 0;
            clearInterval(state.timeUpdateInterval);
            state.timeUpdateInterval = setInterval(async () => {
                if (state.duration === 0) {
                    state.duration = Math.round(state.player.duration);
                    if (state.duration > 0) {
                        state.duration = state.duration;
                        state.player.setNowPlayingInfo(state.options, state.currentTime);
                    }
                }
                if (state.currentTime >= 0 && state.currentTime < state.duration) {
                    state.currentTime = Math.round(state.player.currentTime);
                    state.player.updatePlaybackState(state.player.isPlaying, state.currentTime);
                } else {
                    clearInterval(state.timeUpdateInterval);
                }
            }, 1000);
        },
        play({ commit, state, dispatch }: { commit: Function, state: any, dispatch: Function }) {
            if (state.player && !state.player.isPlaying) {
                state.player.play();
                state.isPlaying = true;
                dispatch('updateCurrentTime');
            }
        },
        pause({ commit, state, dispatch }: { commit: Function, state: any, dispatch: Function }) {
            if (state.player && state.player.isPlaying) {
                state.player.pause();
                state.isPlaying = false;
            }
        },
        seekTo({ commit, state, dispatch }: { commit: Function, state: any, dispatch: Function }, time: number) {
            if (state.player && state.player.currentTime && state.player.duration) {
                state.player.seekTo(time);
            }
        },
        nextEpisode({ commit, state, dispatch }: { commit: Function, state: any, dispatch: Function }) {
            // Implement your next episode logic here
        },
        previousEpisode({ commit, state, dispatch }: { commit: Function, state: any, dispatch: Function }) {
            // Implement your previous episode logic here
        },
        forward({ commit, state, dispatch }: { commit: Function, state: any, dispatch: Function }) {
            if (state.player && state.player.currentTime) {
                dispatch('seekTo', state.player.currentTime + 30);
            }
        },
        rewind({ commit, state, dispatch }: { commit: Function, state: any, dispatch: Function }) {
            if (state.player && state.player.currentTime) {
                dispatch('seekTo', state.player.currentTime - 30);
            }
        },
        playPause({ commit, state, dispatch }: { commit: Function, state: any, dispatch: Function }) {
            if (state.player && state.player.isPlaying) {
                dispatch('pause');
            } else {
                dispatch('play');
            }
        }
    },
    getters: {
        isPlaying: (state: State) => state.isPlaying,
        currentTime: (state: State) => state.currentTime,
        duration: (state: State) => state.duration,
        options: (state: State) => state.options
    },
});
```

```vue
// ./components/player.vue
<template>
  <Page>
    <ActionBar title="Streaming Player" />
    <StackLayout>
      <Label :text="audioTitle" class="title" textAlignment="center" />
      <Label :text="`Current Time: ${currentTime} / ${duration}`" textAlignment="center" />
      <GridLayout columns="*, *, *, *, *" rows="auto" class="controls">
        <Button text="Rewind" @tap="rewind" col="0" />
        <Button text="Previous" @tap="previousEpisode" col="1" />
        <Button :text="isPlaying ? 'Pause' : 'Play'" @tap="playPause" col="2" />
        <Button text="Next" @tap="nextEpisode" col="3" />
        <Button text="Forward" @tap="forward" col="4" />
      </GridLayout>
    </StackLayout>
  </Page>
</template>

<script>
import Vue from 'nativescript-vue';
import store from '@/store/audio-streaming';

export default Vue.extend({
  name: 'Player',
  computed: {
    currentTime() {
      return store.getters.currentTime;
    },
    duration() {
      return store.getters.duration;
    },
    isPlaying() {
      return store.getters.isPlaying;
    },
    audioTitle() {
      return store.getters.options.audioTitle;
    },
  },
  async mounted() {
    await store.dispatch('initMyStreamingPlayer');
  },
  methods: {
    playPause() {
      store.dispatch('playPause');
    },
    nextEpisode() {
      store.dispatch('nextEpisode');
    },
    previousEpisode() {
      store.dispatch('previousEpisode');
    },
    forward() {
      store.dispatch('forward');
    },
    rewind() {
      store.dispatch('rewind');
    },
  },
});
</script>

<style scoped>
.title {
  font-size: 18px;
  font-weight: bold;
  margin-top: 20px;
  margin-bottom: 20px;
}

.controls {
  margin-top: 20px;
  gap: 10px;
}

Button {
  padding: 10px;
  font-size: 16px;
}
</style>
```

### License
[MIT](/LICENSE)