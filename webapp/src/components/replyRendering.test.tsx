import React from 'react';
import {Provider} from 'react-redux';
import {createStore} from 'redux';
import {render, screen} from '@testing-library/react';

import type {Post} from '@mattermost/types/posts';

import QuotedReplyPost from './QuotedReplyPost';
import ReplyComposerPreview from './ReplyComposerPreview';
import {PLUGIN_STATE_KEY} from '../types/store';

const source = {id: 'source', channel_id: 'channel', user_id: 'user', message: 'Original'} as unknown as Post;
const reply = {id: 'reply', channel_id: 'channel', message: '> **Alice**\n> Original\n\nReply', props: {quoted_reply_to: 'source'}, type: 'custom_quoted_reply'} as unknown as Post;

function renderState(node: React.ReactElement, pluginState: unknown = {pendingReply: null}) {
    const state = {
        entities: {
            general: {config: {SiteURL: 'https://mm'}},
            channels: {currentChannelId: 'channel', channels: {channel: {team_id: 'team'}}},
            teams: {currentTeamId: 'team', teams: {team: {name: 'team'}}},
            posts: {posts: {source}}, users: {profiles: {user: {id: 'user', username: 'alice'}}},
        },
        [PLUGIN_STATE_KEY]: pluginState,
    };
    return render(<Provider store={createStore((current = state) => current)}>{node}</Provider>);
}

describe('reply rendering', () => {
    beforeEach(() => {
        window.PostUtils = {formatText: jest.fn((message) => message), messageHtmlToComponent: jest.fn((html) => <strong>{html}</strong>)};
    });

    it('renders quoted post body through Mattermost formatter', () => {
        renderState(<QuotedReplyPost post={reply}/>);
        expect(screen.getByText('Reply')).toBeInTheDocument();
        expect(window.PostUtils?.formatText).toHaveBeenCalledWith('Reply', expect.objectContaining({postId: 'reply'}));
    });

    it('renders plain text without PostUtils and mounts a composer preview', () => {
        window.PostUtils = undefined;
        renderState(<QuotedReplyPost post={reply}/>);
        expect(screen.getByText('Reply')).toBeInTheDocument();
        document.body.insertAdjacentHTML('beforeend', '<div id="post-create"><div class="AdvancedTextEditor__cell"></div></div>');
        const pending = {replyToPostId: 'source', channelId: 'channel', rootId: '', context: 'channel'};
        renderState(<ReplyComposerPreview/>, {pendingReply: pending});
        expect(document.querySelector('.quoted-reply-composer-preview')).toBeInTheDocument();
    });
});
