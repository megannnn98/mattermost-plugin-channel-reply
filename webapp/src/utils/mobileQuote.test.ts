import type {Post} from '@mattermost/types/posts';

import {QUOTED_REPLY_BODY_PROP, QUOTED_REPLY_POST_TYPE, QUOTED_REPLY_PROP} from '../constants';
import {buildQuotedReplyPost, formatMobileQuoteBlock} from './mobileQuote';

describe('mobile quote helpers', () => {
    it('formats fallback author and attachment text', () => {
        expect(formatMobileQuoteBlock(undefined, '')).toBe('> **Unknown user**\n> Attachment');
    });

    it('builds a readable post with structured metadata when the source is loaded', () => {
        const source = {id: 'source', user_id: 'user', message: 'Original'} as unknown as Post;
        const store = {getState: () => ({entities: {posts: {posts: {source}}, users: {profiles: {user: {username: 'alice'}}}}})};
        const result = buildQuotedReplyPost({message: 'Reply'} as Post, 'source', store as never);

        expect(result.type).toBe(QUOTED_REPLY_POST_TYPE);
        expect(result.message).toBe('> **alice**\n> Original\n\nReply');
        expect(result.props).toMatchObject({[QUOTED_REPLY_PROP]: 'source', [QUOTED_REPLY_BODY_PROP]: 'Reply'});
    });

    it('keeps the reply readable when the quoted post is absent', () => {
        const result = buildQuotedReplyPost({message: 'Reply'} as Post, 'missing', {getState: () => ({})} as never);

        expect(result.message).toBe('Reply');
    });
});
