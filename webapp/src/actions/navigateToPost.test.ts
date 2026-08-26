import type {Post} from '@mattermost/types/posts';

import {getPermalinkPath, getSiteUrl, isPostInOpenThread, isPostInThread, isThreadRhsOpen, navigateToQuotedPost} from './navigateToPost';

const post = {id: 'post', channel_id: 'channel', root_id: 'root'} as unknown as Post;
const state = {
    entities: {
        general: {config: {SiteURL: 'https://mm/sub/'}},
        posts: {posts: {post}},
        channels: {channels: {channel: {team_id: 'team'}}},
        teams: {currentTeamId: 'team', teams: {team: {name: 'team-name'}}},
    },
    views: {rhs: {isSidebarOpen: true, selectedPostId: 'root'}},
};

describe('quoted-post navigation', () => {
    beforeEach(() => {
        Object.defineProperty(global, 'fetch', {configurable: true, value: jest.fn()});
        window.WebappUtils = undefined;
    });

    it('recognizes RHS thread membership and permalink paths', () => {
        expect(isPostInThread(post, 'root')).toBe(true);
        expect(isPostInThread(post, 'other')).toBe(false);
        expect(isThreadRhsOpen(state)).toBe(true);
        expect(isThreadRhsOpen({views: {rhs: {isSidebarOpen: false, selectedPostId: 'root'}}} as never)).toBe(false);
        expect(isPostInOpenThread(state, post)).toBe(true);
        expect(getPermalinkPath(state, 'post')).toBe('/team-name/pl/post');
        expect(getPermalinkPath(state, 'missing')).toBeNull();
        expect(getSiteUrl({getState: () => state} as never)).toBe('https://mm/sub/');
    });

    it('highlights a loaded post in its open thread', async () => {
        const dispatch = jest.fn();
        await expect(navigateToQuotedPost({getState: () => state, dispatch} as never, 'post')).resolves.toBe(true);
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({type: 'HIGHLIGHT_REPLY', postId: 'post'}));
    });

    it('loads, routes and handles an unavailable post', async () => {
        const outside = {...state, views: {rhs: {isSidebarOpen: false}}};
        const store = {getState: () => outside, dispatch: jest.fn()};
        window.WebappUtils = {browserHistory: {push: jest.fn()}};
        await expect(navigateToQuotedPost(store as never, 'post')).resolves.toBe(true);
        expect(window.WebappUtils.browserHistory.push).toHaveBeenCalledWith('/team-name/pl/post');
        (global.fetch as jest.Mock).mockResolvedValue({ok: false});
        await expect(navigateToQuotedPost({getState: () => ({...outside, entities: {...outside.entities, posts: {posts: {}}}}), dispatch: jest.fn()} as never, 'missing')).resolves.toBe(false);
    });

    it('normalizes a trailing slash when loading a missing post', async () => {
        const unloaded = {...state, entities: {...state.entities, posts: {posts: {}}}, views: {rhs: {isSidebarOpen: false}}};
        (global.fetch as jest.Mock).mockResolvedValue({ok: true, json: async () => post});
        window.WebappUtils = {browserHistory: {push: jest.fn()}};

        await expect(navigateToQuotedPost({getState: () => unloaded, dispatch: jest.fn()} as never, 'post')).resolves.toBe(false);
        expect(global.fetch).toHaveBeenCalledWith('https://mm/sub/api/v4/posts/post', expect.any(Object));
    });
});
