import {getThreadLabel, getTranslationsForLocale} from './index';

describe('i18n', () => {
    it('uses Russian and English labels', () => {
        expect(getThreadLabel('ru-RU')).toBe('Тред');
        expect(getThreadLabel('en')).toBe('Thread');
        expect(getTranslationsForLocale('ru')).toEqual({
            'post_info.reply': 'Тред',
            'post_info.comment_icon.tooltip.reply': 'Тред',
        });
    });
});
