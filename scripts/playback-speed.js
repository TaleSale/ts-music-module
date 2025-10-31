export class PlaybackSpeed {
    static MODULE_ID = 'ts-music-module';
    static SETTING_PLAYBACK_RATE = 'playbackRate';

    /**
     * Инициализирует функциональность управления скоростью воспроизведения,
     * регистрируя необходимые настройки и хуки.
     */
    static init() {
        game.settings.register(this.MODULE_ID, this.SETTING_PLAYBACK_RATE, {
            name: game.i18n.localize('TS_MUSIC_MODULE.setting_playbackRate_name'),
            hint: game.i18n.localize('TS_MUSIC_MODULE.setting_playbackRate_hint'),
            scope: 'client',
            config: false,
            type: Number,
            default: 1.0,
            range: {
                min: 0.5,
                max: 2.0,
                step: 0.05,
            },
        });
    }

    /**
     * Применяет заданную скорость воспроизведения ко всем проигрываемым звукам плейлиста.
     * @param {number} rate - Скорость воспроизведения (например, 1.0 для нормальной).
     */
    static applyRateToPlayingSounds(rate) {
        game.playlists.playing.forEach(playlist => {
            playlist.sounds.forEach(sound => {
                if (sound.playing && sound.howl) {
                    sound.howl.rate(rate);
                }
            });
        });
    }
}

// Хук, который срабатывает при каждом воспроизведении звука в Foundry.
Hooks.on('playSound', (sound) => {
    // Нас интересуют только звуки из плейлистов.
    if (sound.playlistSound) {
        const rate = game.settings.get(PlaybackSpeed.MODULE_ID, PlaybackSpeed.SETTING_PLAYBACK_RATE);

        // Экземпляр Howler.js может быть доступен не сразу.
        // Если он есть, устанавливаем скорость. В противном случае, ждем события 'play'.
        if (sound.howl) {
            sound.howl.rate(rate);
        } else {
            sound.once('play', () => {
                if(sound.howl) sound.howl.rate(rate);
            });
        }
    }
});

// Хук, который срабатывает при рендеринге панели управления плейлистами.
Hooks.on('renderPlaylistControls', async (controls, html) => {
    const rate = game.settings.get(PlaybackSpeed.MODULE_ID, PlaybackSpeed.SETTING_PLAYBACK_RATE);
    const controlHtml = await renderTemplate(`modules/${PlaybackSpeed.MODULE_ID}/templates/playback-control.html`, {
        rate: rate.toFixed(2)
    });

    // Внедряем наш новый HTML-контрол после кнопок действий плейлиста.
    html.find('.playlist-actions').after(controlHtml);

    const slider = html.find('.ts-music-module-playback-slider');
    const rateDisplay = html.find('.playback-rate-display');

    // Обновляем текстовое поле в реальном времени при перемещении ползунка.
    slider.on('input', (event) => {
        const newRate = parseFloat(event.currentTarget.value);
        rateDisplay.text(newRate.toFixed(2) + 'x');
    });

    // Когда пользователь отпускает ползунок, сохраняем настройку и обновляем проигрываемые треки.
    slider.on('change', (event) => {
        const newRate = parseFloat(event.currentTarget.value);
        game.settings.set(PlaybackSpeed.MODULE_ID, PlaybackSpeed.SETTING_PLAYBACK_RATE, newRate);
        PlaybackSpeed.applyRateToPlayingSounds(newRate);
    });
});
