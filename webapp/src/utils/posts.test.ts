import type {Post} from '@mattermost/types/posts';

import {
    getDisplayName,
    getQuotedPostDisplayMessage,
    getQuotedReplyBody,
    getUserAvatarFallbackUrl,
    getUserAvatarUrl,
    getUserInitials,
    truncateMessage,
} from './posts';

describe('getQuotedReplyBody', () => {
    it('returns the persisted reply body after a plugin mobile quote', () => {
        const post = {
            message: '> **Alice**\n> Original message\n\nReply body',
            props: {quoted_reply_to: 'original'},
            type: 'custom_quoted_reply',
        } as unknown as Post;

        expect(getQuotedReplyBody(post)).toBe('Reply body');
    });

    it('does not strip a user blockquote or trust a non-quoted post', () => {
        const post = {message: '> user quote\n\nReply', type: '', props: {}} as unknown as Post;

        expect(getQuotedReplyBody(post)).toBe(post.message);
        expect(getQuotedPostDisplayMessage(post)).toBe(post.message);
    });

    it('formats display, avatar and initials fallbacks', () => {
        const user = {id: 'user', first_name: '😀', last_name: 'Smith', username: 'ignored', last_picture_update: 4};

        expect(getDisplayName()).toBeUndefined();
        expect(getDisplayName(user as never)).toBe('😀 Smith');
        expect(getUserInitials(user as never)).toBe('😀S');
        expect(getUserInitials()).toBe('?');
        expect(getUserAvatarUrl(user as never, 'https://mm/sub/')).toContain('/sub/api/v4/users/user/image?_=4');
        expect(getUserAvatarFallbackUrl(user as never, 'https://mm/sub/')).toContain('/sub/api/v4/users/user/image/default');
        expect(getUserAvatarUrl(undefined, 'https://mm')).toBeNull();
        expect(truncateMessage('  a   b  ', 3)).toBe('a b');
        expect(truncateMessage('abcdef', 4)).toBe('abc…');
    });
});
