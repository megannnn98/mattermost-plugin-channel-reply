import type {Post} from '@mattermost/types/posts';

import {getPostFromStore, isReplyablePost, openThreadForPost} from './openThread';

const post = {id: 'post', channel_id: 'channel', root_id: '', delete_at: 0, state: ''} as unknown as Post;

describe('openThread', () => {
    beforeEach(() => {
        Object.defineProperty(global, 'fetch', {configurable: true, value: jest.fn()});
    });

    it('recognizes replyable posts and reads posts from the store', () => {
        const store = {getState: () => ({entities: {posts: {posts: {post}}}})};

        expect(getPostFromStore(store as never, 'post')).toBe(post);
        expect(isReplyablePost(post)).toBe(true);
        expect(isReplyablePost()).toBe(false);
        expect(isReplyablePost({...post, state: 'DELETED'})).toBe(false);
        expect(isReplyablePost({...post, delete_at: 1})).toBe(false);
        expect(isReplyablePost({...post, type: 'system_join_channel'})).toBe(false);
    });

    it('loads a thread and dispatches Mattermost actions', async () => {
        const dispatch = jest.fn();
        const store = {
            dispatch,
            getState: () => ({entities: {general: {config: {SiteURL: 'https://mm/' }}, posts: {posts: {post}}}}),
        };
        const fetchMock = global.fetch as jest.Mock;
        fetchMock.mockResolvedValueOnce({ok: true, json: async () => ({order: ['post'], posts: {post}})} as Response);

        await expect(openThreadForPost(store as never, 'post')).resolves.toBe(true);
        expect(fetchMock).toHaveBeenCalledWith('https://mm/api/v4/posts/post/thread?perPage=200', expect.any(Object));
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({type: 'SELECT_POST', postId: 'post'}));
    });

    it('loads a missing post and rejects failed API requests', async () => {
        const store = {dispatch: jest.fn(), getState: () => ({entities: {general: {config: {SiteURL: ''}}, posts: {posts: {}}}})};
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({ok: true, json: async () => post} as Response)
            .mockResolvedValueOnce({ok: false, status: 500} as Response);

        await expect(openThreadForPost(store as never, 'post')).rejects.toThrow('API request failed: 500');
    });
});
