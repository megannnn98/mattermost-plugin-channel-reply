import React from 'react';

import type {Post} from '@mattermost/types/posts';

import {truncateMessage} from '../utils/posts';

type Props = {
    post: Post;
    username: string;
    permalink?: string | null;
    onClose?: () => void;
    onNavigate?: () => void;
    compact?: boolean;
};

const ReplyQuote: React.FC<Props> = ({
    post,
    username,
    permalink,
    onClose,
    onNavigate,
    compact = false,
}) => {
    const message = truncateMessage(post.message || '');
    const isClickable = Boolean(permalink || onNavigate);

    const handleNavigate = (event: React.MouseEvent) => {
        if (!isClickable) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        onNavigate?.();
    };

    const className = [
        'quoted-reply-quote',
        compact ? 'quoted-reply-quote--compact' : '',
        isClickable ? 'quoted-reply-quote--clickable' : '',
    ].filter(Boolean).join(' ');

    const content = (
        <>
            <div
                className='quoted-reply-quote__bar'
                aria-hidden='true'
            />
            <div className='quoted-reply-quote__content'>
                <div className='quoted-reply-quote__header'>
                    <span className='quoted-reply-quote__author'>{username}</span>
                </div>
                <div className='quoted-reply-quote__message'>{message || 'Attachment'}</div>
            </div>
            {onClose && (
                <button
                    type='button'
                    className='quoted-reply-quote__close'
                    aria-label='Cancel reply'
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onClose();
                    }}
                >
                    ×
                </button>
            )}
        </>
    );

    if (isClickable && permalink) {
        return (
            <a
                href={permalink}
                className={className}
                aria-label={`Jump to message from ${username}`}
                onClick={handleNavigate}
            >
                {content}
            </a>
        );
    }

    if (isClickable && onNavigate) {
        return (
            <button
                type='button'
                className={className}
                aria-label={`Jump to message from ${username}`}
                onClick={handleNavigate}
            >
                {content}
            </button>
        );
    }

    return (
        <div className={className}>
            {content}
        </div>
    );
};

export default ReplyQuote;
