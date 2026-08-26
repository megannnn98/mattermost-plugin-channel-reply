import React from 'react';
import {Provider} from 'react-redux';
import {createStore} from 'redux';
import {fireEvent, render, screen} from '@testing-library/react';

import type {Post} from '@mattermost/types/posts';

import ReplyButton from './ReplyButton';
import ReplyQuote from './ReplyQuote';
import QuotedReplyStyles from './QuotedReplyStyles';
import {startReplyToPost} from '../actions/reply';

jest.mock('../actions/reply', () => ({
    ...jest.requireActual('../actions/reply'),
    startReplyToPost: jest.fn(),
}));

const post = {id: 'post', channel_id: 'channel', user_id: 'user', message: 'Message', delete_at: 0, state: ''} as unknown as Post;

function renderWithStore(node: React.ReactElement, state: Record<string, unknown> = {}) {
    const store = createStore((current = state) => current);
    return render(<Provider store={store}>{node}</Provider>);
}

describe('display components', () => {
    it('adds and removes plugin CSS marker', () => {
        const view = render(<QuotedReplyStyles/>);
        expect(document.body).toHaveClass('quoted-reply-plugin-active');
        view.unmount();
        expect(document.body).not.toHaveClass('quoted-reply-plugin-active');
    });

    it('renders quote variants, navigation and avatar fallback', () => {
        const onNavigate = jest.fn();
        renderWithStore(<ReplyQuote post={post} username='Alice' user={{id: 'user', username: 'alice'} as never} onNavigate={onNavigate}/> , {
            entities: {general: {config: {SiteURL: 'https://mm'}}},
        });
        fireEvent.click(screen.getByRole('button', {name: 'Jump to message from Alice'}));
        fireEvent.error(screen.getByRole('img'));
        fireEvent.error(screen.getByRole('img'));
        expect(onNavigate).toHaveBeenCalled();
        expect(screen.getByText('AL')).toBeInTheDocument();
    });

    it('renders reply action only for replyable posts', () => {
        const state = {entities: {general: {config: {SiteURL: ''}}, channels: {}, teams: {}}, views: {rhs: {isSidebarOpen: true, selectedPostId: 'post'}}};
        const container = document.createElement('div');
        container.id = 'post-list';
        document.body.append(container);
        render(<Provider store={createStore((current = state) => current)}><ReplyButton post={{...post, root_id: ''}}/></Provider>, {container});
        fireEvent.click(screen.getByRole('button', {name: 'Reply'}));
        expect(startReplyToPost).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({id: 'post'}), {context: 'channel'});
        expect(renderWithStore(<ReplyButton post={{...post, state: 'DELETED'}}/>, state).container).toBeEmptyDOMElement();
    });
});
