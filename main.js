import { PlaybackSpeed } from './scripts/playback-speed.js';

const MODULE_ID = 'ts-music-module';

Hooks.once('init', () => {
    // Инициализируем модуль управления скоростью воспроизведения.
    PlaybackSpeed.init();

    // В будущем здесь будут инициализироваться другие модули.
    // Например: Crossfade.init();

    console.log(`${MODULE_ID} | Initialized.`);
});
