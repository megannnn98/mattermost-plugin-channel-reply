import React from 'react';
import {Provider} from 'react-redux';
import {createStore} from 'redux';
import {render, screen} from '@testing-library/react';

import type {Post} from '@mattermost/types/posts';

describe('Plugin registration', () => {
    it('registers UI integrations and transforms only matching pending replies', async () => {
        const registerPlugin = jest.fn();
        (window as unknown as {registerPlugin: jest.Mock}).registerPlugin = registerPlugin;
        await import('./index');
        const plugin = registerPlugin.mock.calls[0][1];
        const registry = {
            registerReducer: jest.fn(), registerTranslations: jest.fn(), registerRootComponent: jest.fn(),
            registerPostActionComponent: jest.fn(), registerPostTypeComponent: jest.fn(),
            registerPostDropdownMenuAction: jest.fn(), registerMessageWillBePostedHook: jest.fn(),
        };
        const source = {id: 'source', user_id: 'user', message: 'Original'} as unknown as Post;
        const state = {entities: {users: {currentUserId: 'user', profiles: {user: {locale: 'ru'}}}, posts: {posts: {source}}, general: {config: {SiteURL: ''}}}};
        const store = {getState: () => state, dispatch: jest.fn()};

        plugin.initialize(registry, store);
        expect(registry.registerReducer).toHaveBeenCalled();
        const label = registry.registerPostDropdownMenuAction.mock.calls[0][0];
        render(<Provider store={createStore((current = state) => current)}>{label}</Provider>);
        expect(screen.getByText('Тред')).toBeInTheDocument();
        const hook = registry.registerMessageWillBePostedHook.mock.calls[0][0];
        const pending = {replyToPostId: 'source', channelId: 'channel', rootId: '', context: 'channel'};
        store.getState = () => ({...state, 'plugins-com.github.mattermost-channel-reply': {pendingReply: pending}});
        const result = hook({message: 'Reply', channel_id: 'channel', root_id: ''} as Post);
        expect(result.post.type).toBe('custom_quoted_reply');
        const unmatchedPost = {message: 'Other', channel_id: 'other'} as Post;
        expect(hook(unmatchedPost)).toEqual({post: unmatchedPost});
    });
});
