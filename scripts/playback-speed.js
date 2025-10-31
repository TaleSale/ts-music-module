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
        // Это более прямой и надежный способ получить все активные звуки.
        for (const sound of game.audio.sounds) {
            // Убеждаемся, что изменяем только звуки, которые являются частью плейлиста и проигрываются.
            if (sound.playlistSound?.playing && sound.howl) {
                sound.howl.rate(rate);
            }
        }
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

// Хук, который срабатывает при рендеринге директории плейлистов.
Hooks.on('renderPlaylistDirectory', (app, html) => {
    const jqHtml = $(html);
    const rate = game.settings.get(PlaybackSpeed.MODULE_ID, PlaybackSpeed.SETTING_PLAYBACK_RATE);

    // Используем более общий селектор для поиска всех звуковых дорожек.
    jqHtml.find('li.sound').each(async function() {
        const soundLi = $(this);
        // Цель для вставки — кнопка play/pause внутри .sound-playback.
        const playPauseButton = soundLi.find('.sound-playback .sound-control[data-action="soundPause"], .sound-playback .sound-control[data-action="soundPlay"]');

        // Если нашли кнопку play/pause и наши контролы еще не добавлены.
        if (playPauseButton.length > 0 && soundLi.find('.ts-music-module-playlist-controls').length === 0) {
            
            const controlHtmlString = await renderTemplate(`modules/${PlaybackSpeed.MODULE_ID}/templates/playback-control.html`, {});
            const controlHtml = $(controlHtmlString);
            
            // Вставляем контролы перед кнопкой play/pause.
            playPauseButton.before(controlHtml);
            
            // Устанавливаем начальное значение скорости в текстовом поле.
            controlHtml.find('.ts-current-speed').text(`${rate.toFixed(2)}x`);

            // Обработчик для уменьшения скорости.
            controlHtml.find('.ts-speed-decrease').on('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                changeSpeed(-0.25);
            });

            // Обработчик для увеличения скорости.
            controlHtml.find('.ts-speed-increase').on('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                changeSpeed(0.25);
            });
        }
    });
});

/**
 * Изменяет глобальную скорость воспроизведения.
 * @param {number} delta - Величина, на которую нужно изменить скорость (например, 0.25 или -0.25).
 */
function changeSpeed(delta) {
    const settingsKey = `${PlaybackSpeed.MODULE_ID}.${PlaybackSpeed.SETTING_PLAYBACK_RATE}`;
    const currentRate = game.settings.get(PlaybackSpeed.MODULE_ID, PlaybackSpeed.SETTING_PLAYBACK_RATE);
    const settingsConfig = game.settings.settings.get(settingsKey);
    const { min, max } = settingsConfig.range;

    // Рассчитываем новую скорость и ограничиваем ее в пределах min/max.
    let newRate = parseFloat((currentRate + delta).toFixed(2));
    // Используем Math.clamp (современно) вместо Math.clamped (устарело).
    newRate = Math.clamp(newRate, min, max);

    if (newRate !== currentRate) {
        // Обновляем настройку.
        game.settings.set(PlaybackSpeed.MODULE_ID, PlaybackSpeed.SETTING_PLAYBACK_RATE, newRate);
        
        // Применяем новую скорость к текущим трекам.
        PlaybackSpeed.applyRateToPlayingSounds(newRate);
        
        // Обновляем текст во всех видимых элементах управления скоростью.
        $('.ts-current-speed').text(`${newRate.toFixed(2)}x`);
    }
}